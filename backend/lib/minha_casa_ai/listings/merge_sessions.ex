defmodule MinhaCasaAi.Listings.MergeSessions do
  @moduledoc false

  import Ecto.Query

  alias MinhaCasaAi.Integrations.ScrapingAnt
  alias MinhaCasaAi.ListingImages
  alias MinhaCasaAi.ListingImages.Fingerprint
  alias MinhaCasaAi.ListingImages.Storage
  alias MinhaCasaAi.Listings
  alias MinhaCasaAi.Listings.{Duplicates, Listing, ListingMergeSession, MergeAdvisor}
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workers.ListingMergePreparationWorker

  @expires_in_seconds 30 * 60
  @max_images 40
  @max_bytes 5 * 1024 * 1024
  @download_timeout 30_000
  @image_concurrency 4

  @field_definitions [
    {"titulo", "Título", "Imóvel", "text"},
    {"tipoImovel", "Tipo", "Imóvel", "text"},
    {"preco", "Preço", "Valores", "number"},
    {"m2Totais", "Área total", "Valores", "number"},
    {"m2Privado", "Área privativa", "Valores", "number"},
    {"quartos", "Quartos", "Características", "number"},
    {"suites", "Suítes", "Características", "number"},
    {"banheiros", "Banheiros", "Características", "number"},
    {"garagem", "Vagas", "Características", "number"},
    {"andar", "Andar", "Características", "number"},
    {"endereco", "Endereço", "Localização", "text"},
    {"bairro", "Bairro", "Localização", "text"},
    {"cidade", "Cidade", "Localização", "text"},
    {"condominiumName", "Condomínio", "Localização", "text"},
    {"contactName", "Contato", "Contato", "text"},
    {"contactNumber", "Telefone", "Contato", "text"},
    {"link", "Link do anúncio", "Anúncio", "text"},
    {"sitePublishedAt", "Publicado em", "Anúncio", "text"},
    {"siteUpdatedAt", "Atualizado em", "Anúncio", "text"},
    {"piscina", "Piscina", "Preferências", "boolean"},
    {"porteiro24h", "Porteiro 24h", "Preferências", "boolean"},
    {"academia", "Academia", "Preferências", "boolean"},
    {"vistaLivre", "Vista livre", "Preferências", "boolean"},
    {"piscinaTermica", "Piscina térmica", "Preferências", "boolean"}
  ]

  def create(collection_id, imported_data, opts \\ [])
      when is_binary(collection_id) and is_map(imported_data) do
    user_id = Keyword.get(opts, :user_id)
    org_id = Keyword.get(opts, :org_id)
    requested_target = Keyword.get(opts, :target_listing_id)

    with {:ok, _} <- Listings.get_collection(collection_id, user_id, org_id),
         {:ok, target} <- resolve_target(collection_id, imported_data, requested_target),
         {:ok, session} <- insert_session(target, imported_data, user_id, org_id),
         {:ok, _job} <-
           %{session_id: session.id}
           |> ListingMergePreparationWorker.new()
           |> Oban.insert() do
      {:ok, session}
    end
  end

  def get(id, opts \\ []) when is_binary(id) do
    user_id = Keyword.get(opts, :user_id)
    org_id = Keyword.get(opts, :org_id)

    ListingMergeSession
    |> where([s], s.id == ^id)
    |> scoped(user_id, org_id)
    |> Repo.one()
    |> normalize_expiration()
  end

  def prepare(id) when is_binary(id) do
    case Repo.get(ListingMergeSession, id) do
      %ListingMergeSession{status: "preparing"} = session ->
        do_prepare(session)

      %ListingMergeSession{} ->
        :ok

      nil ->
        {:cancel, :session_not_found}
    end
  end

  def apply(id, params, opts \\ []) when is_binary(id) and is_map(params) do
    field_paths = string_list(params["fieldPaths"])
    field_values = field_values_map(params["fieldValues"])
    image_refs = resolve_image_refs(params)

    Repo.transaction(fn ->
      session =
        ListingMergeSession
        |> where([s], s.id == ^id)
        |> lock("FOR UPDATE")
        |> Repo.one()
        |> authorize_session!(opts)

      cond do
        is_nil(session) ->
          Repo.rollback(:session_not_found)

        session.status == "applied" ->
          Repo.get!(Listing, session.target_listing_id)

        expired?(session) ->
          mark_expired!(session)
          Repo.rollback(:session_expired)

        session.status != "ready" ->
          Repo.rollback(:session_not_ready)

        true ->
          listing =
            Listing
            |> where([l], l.id == ^session.target_listing_id)
            |> lock("FOR UPDATE")
            |> Repo.one()

          if is_nil(listing) or listing_version(listing) != session.target_version do
            Repo.rollback(:stale_listing)
          end

          allowed_fields = get_in(session.payload || %{}, ["fields"]) || []
          selected_paths = MapSet.new(field_paths)

          field_updates =
            allowed_fields
            |> Enum.filter(&MapSet.member?(selected_paths, &1["path"]))
            |> Enum.reduce(%{}, fn field, acc ->
              value = resolve_field_value(field, field_values)
              put_path(acc, field["path"], value)
            end)

          image_updates =
            if Map.has_key?(params, "imageRefs") or Map.has_key?(params, "imageIds") do
              apply_image_selection!(listing, session, image_refs)
            else
              %{}
            end

          updates = deep_merge(listing.data || %{}, deep_merge(field_updates, image_updates))

          updated =
            listing
            |> Listing.changeset(%{data: updates})
            |> Repo.update!()

          session
          |> ListingMergeSession.changeset(%{
            status: "applied",
            applied_at: now(),
            payload:
              (session.payload || %{})
              |> Map.put("appliedImageRefs", image_refs)
          })
          |> Repo.update!()

          cleanup_staged_images(session)
          updated
      end
    end)
  end

  def cancel(id, opts \\ []) when is_binary(id) do
    case get(id, opts) do
      nil ->
        {:error, :session_not_found}

      %ListingMergeSession{} = session ->
        cleanup_staged_images(session)

        if session.status == "preparing" do
          session
          |> ListingMergeSession.changeset(%{status: "expired"})
          |> Repo.update()
        else
          Repo.delete(session)
        end

        :ok
    end
  end

  def preview_image(id, image_id, opts \\ []) do
    with %ListingMergeSession{status: "ready"} = session <- get(id, opts),
         image when is_map(image) <-
           Enum.find(get_in(session.payload || %{}, ["images"]) || [], &(&1["id"] == image_id)),
         key when is_binary(key) <- image["storageKey"],
         {:ok, bytes, content_type} <- Storage.get_object(key) do
      {:ok, bytes, content_type}
    else
      _ -> {:error, :image_not_found}
    end
  end

  def sweep_expired do
    sessions =
      ListingMergeSession
      |> where([s], s.expires_at < ^now() and s.status != "applied")
      |> Repo.all()

    Enum.each(sessions, fn session ->
      cleanup_staged_images(session)
      Repo.delete(session)
    end)

    {:ok, length(sessions)}
  end

  def session_json(%ListingMergeSession{} = session) do
    payload = session.payload || %{}
    stats = payload["stats"] || %{"duplicates" => 0, "failed" => 0, "limitSkipped" => 0}

    %{
      id: session.id,
      status: effective_status(session),
      targetListingId: session.target_listing_id,
      collectionId: session.collection_id,
      currentData: session.current_data || %{},
      importedData: session.imported_data || %{},
      fields: payload["fields"] || [],
      verdict: payload["verdict"],
      confidence: payload["confidence"],
      suggestions: payload["suggestions"] || [],
      signals: payload["signals"] || %{},
      gallery: build_gallery_json(session),
      stats: %{
        duplicates: Map.get(stats, "duplicates", 0),
        failed: Map.get(stats, "failed", 0),
        limitSkipped: Map.get(stats, "limitSkipped", 0)
      },
      error: session.error,
      expiresAt: DateTime.to_iso8601(session.expires_at)
    }
  end

  def listing_version(%Listing{} = listing) do
    :crypto.hash(:sha256, :erlang.term_to_binary({listing.data || %{}, listing.updated_at}))
    |> Base.encode16(case: :lower)
  end

  def field_differences(current, imported) when is_map(current) and is_map(imported) do
    regular =
      Enum.flat_map(@field_definitions, fn {path, label, group, value_type} ->
        difference(path, label, group, value_type, current, imported)
      end)

    preference_keys =
      imported
      |> Map.get("preferences", %{})
      |> case do
        value when is_map(value) -> Map.keys(value)
        _ -> []
      end

    preferences =
      Enum.flat_map(preference_keys, fn key ->
        difference(
          "preferences.#{key}",
          humanize_preference(key),
          "Preferências",
          "boolean",
          current,
          imported
        )
      end)

    regular ++ preferences
  end

  defp do_prepare(session) do
    try do
      fields = field_differences(session.current_data || %{}, session.imported_data || %{})

      {existing_fingerprints, existing_failed} =
        existing_fingerprints(session.current_data || %{})

      urls = incoming_image_urls(session.imported_data || %{})
      capacity = max(@max_images - existing_image_count(session.current_data || %{}), 0)

      {images, skipped, stats} =
        urls
        |> Task.async_stream(fn url -> {url, download_candidate(url)} end,
          max_concurrency: @image_concurrency,
          timeout: @download_timeout + 5_000,
          ordered: true
        )
        |> Enum.reduce(
          {[], [], %{"duplicates" => 0, "failed" => existing_failed, "limitSkipped" => 0}},
          fn result, {accepted, skipped, stats} ->
            classify_candidate(
              result,
              session.id,
              existing_fingerprints,
              accepted,
              skipped,
              capacity,
              stats
            )
          end
        )

      payload =
        %{
          "fields" => fields,
          "images" => images,
          "skipped" => skipped,
          "stats" => stats,
          "existingFingerprints" => existing_fingerprints
        }
        |> Map.merge(advisor_section(session, fields, images, stats))

      case Repo.get(ListingMergeSession, session.id) do
        %ListingMergeSession{status: "preparing"} = current ->
          current
          |> ListingMergeSession.changeset(%{status: "ready", payload: payload, error: nil})
          |> Repo.update!()

        _ ->
          cleanup_payload_images(payload)
      end

      :ok
    rescue
      exception ->
        case Repo.get(ListingMergeSession, session.id) do
          %ListingMergeSession{status: "preparing"} = current ->
            current
            |> ListingMergeSession.changeset(%{
              status: "failed",
              error: Exception.message(exception)
            })
            |> Repo.update!()

          _ ->
            :ok
        end

        {:error, exception}
    end
  end

  # Runs the LLM advisor over the prepared diff. On any failure the section is
  # reduced to the heuristic signals so the frontend can fall back to manual
  # duplicate resolution.
  defp advisor_section(session, fields, images, stats) do
    signals = build_signals(session, images, stats)

    case MergeAdvisor.advise(
           session.imported_data || %{},
           session.current_data || %{},
           fields,
           signals
         ) do
      {:ok, advice} ->
        %{
          "verdict" => advice["verdict"],
          "confidence" => advice["confidence"],
          "suggestions" => advice["suggestions"],
          "signals" => signals
        }

      {:error, _reason} ->
        %{"signals" => signals}
    end
  end

  defp build_signals(session, images, stats) do
    cover_fingerprint =
      images
      |> Enum.map(& &1["fingerprint"])
      |> Enum.find(&is_map/1)

    heuristic =
      Duplicates.score_duplicate(
        %{id: session.target_listing_id, data: session.current_data || %{}},
        session.imported_data || %{},
        cover_fingerprint: cover_fingerprint
      )

    %{
      "reason" => heuristic.reason,
      "score" => heuristic.score,
      "matchingImages" => Map.get(stats, "duplicates", 0)
    }
  end

  defp resolve_target(collection_id, imported_data, nil) do
    case Listings.duplicate_candidates(collection_id, imported_data) do
      [%{listingId: id} | _] -> fetch_target(collection_id, id)
      [%{"listingId" => id} | _] -> fetch_target(collection_id, id)
      [] -> {:error, :duplicate_not_found}
    end
  end

  defp resolve_target(collection_id, imported_data, target_id) do
    allowed? =
      collection_id
      |> Listings.duplicate_candidates(imported_data)
      |> Enum.any?(fn candidate ->
        (candidate[:listingId] || candidate["listingId"]) == target_id
      end)

    if allowed?, do: fetch_target(collection_id, target_id), else: {:error, :duplicate_not_found}
  end

  defp fetch_target(collection_id, target_id) do
    case Repo.get_by(Listing, id: target_id, collection_id: collection_id) do
      %Listing{} = listing -> {:ok, listing}
      nil -> {:error, :duplicate_not_found}
    end
  end

  defp insert_session(target, imported_data, user_id, org_id) do
    %ListingMergeSession{}
    |> ListingMergeSession.changeset(%{
      user_id: user_id,
      org_id: org_id,
      collection_id: target.collection_id,
      target_listing_id: target.id,
      status: "preparing",
      target_version: listing_version(target),
      imported_data: imported_data,
      current_data: target.data || %{},
      payload: %{},
      expires_at: DateTime.add(now(), @expires_in_seconds, :second)
    })
    |> Repo.insert()
  end

  defp difference(path, label, group, value_type, current, imported) do
    incoming = get_path(imported, path)
    existing = get_path(current, path)

    if meaningful?(incoming) and incoming != existing do
      [
        %{
          "path" => path,
          "label" => label,
          "group" => group,
          "valueType" => value_type,
          "currentValue" => existing,
          "incomingValue" => incoming
        }
      ]
    else
      []
    end
  end

  defp meaningful?(nil), do: false
  defp meaningful?(value) when is_binary(value), do: String.trim(value) != ""
  defp meaningful?(value), do: value != []

  defp get_path(data, path) do
    Enum.reduce(String.split(path, "."), data, fn
      key, acc when is_map(acc) -> Map.get(acc, key)
      _key, _acc -> nil
    end)
  end

  defp put_path(data, path, value) do
    do_put_path(data, String.split(path, "."), value)
  end

  defp do_put_path(data, [key], value), do: Map.put(data, key, value)

  defp do_put_path(data, [key | rest], value) do
    Map.put(data, key, do_put_path(Map.get(data, key, %{}), rest, value))
  end

  defp deep_merge(left, right) do
    Map.merge(left, right, fn
      _key, l, r when is_map(l) and is_map(r) -> deep_merge(l, r)
      _key, _l, r -> r
    end)
  end

  defp incoming_image_urls(data) do
    explicit = listing_image_url_entries(data)

    scraped =
      case data["link"] do
        link when is_binary(link) and link != "" ->
          case ScrapingAnt.scrape_url(link) do
            {:ok, result} -> [Map.get(result, :og_image_url) | List.wrap(result.image_urls)]
            _ -> []
          end

        _ ->
          []
      end

    (explicit ++ scraped)
    |> Enum.filter(&importable_image_url?/1)
    |> Enum.uniq()
    |> Enum.take(@max_images * 2)
  end

  defp listing_image_url_entries(data) do
    urls =
      List.wrap(data["imageUrls"])
      |> Enum.filter(&non_empty_string?/1)

    case urls do
      [] ->
        case data["imageUrl"] do
          url when is_binary(url) -> normalize_url_entry(url)
          _ -> []
        end

      _ ->
        urls
    end
  end

  defp normalize_url_entry(url) when is_binary(url) do
    case String.trim(url) do
      "" -> []
      trimmed -> [trimmed]
    end
  end

  defp non_empty_string?(value) when is_binary(value), do: String.trim(value) != ""
  defp non_empty_string?(_), do: false

  defp existing_image_count(data) do
    data |> resolved_existing_images(nil) |> length()
  end

  defp resolved_existing_images(data, listing_id) do
    keys =
      List.wrap(data["imageStorageKeys"])
      |> Enum.filter(&(is_binary(&1) and String.trim(&1) != ""))

    fingerprints = List.wrap(data["imageFingerprints"])

    urls = listing_image_url_entries(data)

    if keys != [] do
      Enum.with_index(keys, fn key, index ->
        %{
          "index" => index,
          "storageKey" => key,
          "previewUrl" =>
            Enum.at(urls, index) || workspace_listing_image_url(listing_id, index),
          "fingerprint" => Enum.at(fingerprints, index)
        }
      end)
    else
      listing_image_url_entries(data)
      |> Enum.with_index(fn url, index ->
        %{
          "index" => index,
          "storageKey" => nil,
          "previewUrl" => normalize_listing_preview_url(url, listing_id, index),
          "fingerprint" => Enum.at(fingerprints, index)
        }
      end)
    end
  end

  defp workspace_listing_image_url(listing_id, index) when is_binary(listing_id) do
    "/api/workspace/listings/#{listing_id}/images/#{index}"
  end

  defp workspace_listing_image_url(_listing_id, _index), do: nil

  defp normalize_listing_preview_url(url, listing_id, index) do
    cond do
      hosted_listing_image_path?(url) and is_binary(listing_id) ->
        case parse_listing_image_path(url) do
          {_source_listing_id, path_index} ->
            workspace_listing_image_url(listing_id, path_index)

          _ ->
            url
        end

      true ->
        url
    end
    |> case do
      nil -> workspace_listing_image_url(listing_id, index)
      value -> value
    end
  end

  defp importable_image_url?(url) when is_binary(url) do
    public_http_url?(url) or hosted_listing_image_path?(url)
  end

  defp hosted_listing_image_path?(url) when is_binary(url) do
    Regex.match?(~r{^/api/(workspace/)?listings/[^/]+/images/\d+$}, String.trim(url))
  end

  defp parse_listing_image_path(url) do
    case Regex.run(~r{^/api/(?:workspace/)?listings/([^/]+)/images/(\d+)$}, String.trim(url)) do
      [_, listing_id, index] -> {listing_id, String.to_integer(index)}
      _ -> nil
    end
  end

  defp existing_fingerprints(data) do
    keys = List.wrap(data["imageStorageKeys"])
    stored = List.wrap(data["imageFingerprints"])

    keys
    |> Enum.with_index()
    |> Enum.reduce({[], 0}, fn {key, index}, {fingerprints, failed} ->
      case Enum.at(stored, index) do
        fingerprint when is_map(fingerprint) ->
          {fingerprints ++ [fingerprint], failed}

        _ ->
          case Storage.get_object(key) do
            {:ok, bytes, _} ->
              case Fingerprint.from_bytes(bytes) do
                {:ok, fingerprint} -> {fingerprints ++ [fingerprint], failed}
                _ -> {fingerprints ++ [%{"unavailable" => true}], failed + 1}
              end

            _ ->
              {fingerprints ++ [%{"unavailable" => true}], failed + 1}
          end
      end
    end)
  end

  defp download_candidate(url) do
    with {:ok, body, content_type} <- fetch_image_bytes(url),
         true <- is_binary(body) and byte_size(body) > 0 and byte_size(body) <= @max_bytes,
         {:ok, fingerprint} <- Fingerprint.from_bytes(body) do
      {:ok, body, content_type, fingerprint}
    else
      _ -> :error
    end
  end

  defp fetch_image_bytes(url) do
    case parse_listing_image_path(url) do
      {listing_id, index} ->
        case ListingImages.serve_image(listing_id, index) do
          {:ok, body, content_type} -> {:ok, body, content_type}
          _ -> :error
        end

      _ ->
        case Req.get(url,
               finch: MinhaCasaAi.Finch,
               receive_timeout: @download_timeout,
               max_redirects: 5,
               headers: [{"user-agent", "MinhaCasa/1.0"}]
             ) do
          {:ok, %{status: status, body: body, headers: headers}}
          when status in 200..299 and is_binary(body) ->
            {:ok, body, content_type(headers, url)}

          _ ->
            :error
        end
    end
  end

  defp classify_candidate(
         {:ok, {url, {:ok, bytes, content_type, fingerprint}}},
         session_id,
         existing,
         accepted,
         skipped,
         capacity,
         stats
       ) do
    accepted_fingerprints = Enum.map(accepted, & &1["fingerprint"])
    duplicate_of = find_duplicate_of(existing, accepted_fingerprints, fingerprint)

    cond do
      not is_nil(duplicate_of) ->
        stage_incoming_image(
          session_id,
          url,
          bytes,
          content_type,
          fingerprint,
          "duplicate",
          duplicate_of,
          accepted,
          skipped,
          Map.update!(stats, "duplicates", &(&1 + 1))
        )

      count_new_images(accepted) >= capacity ->
        {
          accepted,
          skipped ++ [skipped_gallery_item(url, fingerprint, "limit_skipped")],
          Map.update!(stats, "limitSkipped", &(&1 + 1))
        }

      true ->
        stage_incoming_image(
          session_id,
          url,
          bytes,
          content_type,
          fingerprint,
          "new",
          nil,
          accepted,
          skipped,
          stats
        )
    end
  end

  defp classify_candidate({:ok, {url, :error}}, _session_id, _existing, accepted, skipped, _capacity, stats) do
    {
      accepted,
      skipped ++ [skipped_gallery_item(url, nil, "failed")],
      Map.update!(stats, "failed", &(&1 + 1))
    }
  end

  defp classify_candidate(_result, _session_id, _existing, accepted, skipped, _capacity, stats) do
    {accepted, skipped, Map.update!(stats, "failed", &(&1 + 1))}
  end

  defp stage_incoming_image(
         session_id,
         url,
         bytes,
         content_type,
         fingerprint,
         status,
         duplicate_of,
         accepted,
         skipped,
         stats
       ) do
    id = Ecto.UUID.generate()

    case Storage.put_staged_merge_image(session_id, id, bytes, content_type) do
      {:ok, key} ->
        image =
          fingerprint
          |> Map.take(["width", "height"])
          |> Map.merge(%{
            "id" => id,
            "status" => status,
            "sourceUrl" => url,
            "storageKey" => key,
            "contentType" => content_type,
            "fingerprint" => fingerprint
          })
          |> maybe_put_duplicate_of(duplicate_of)

        {accepted ++ [image], skipped, stats}

      _ ->
        {
          accepted,
          skipped ++ [skipped_gallery_item(url, fingerprint, "failed")],
          Map.update!(stats, "failed", &(&1 + 1))
        }
    end
  end

  defp maybe_put_duplicate_of(image, index) when is_integer(index) do
    Map.put(image, "duplicateOf", index)
  end

  defp maybe_put_duplicate_of(image, _), do: image

  defp skipped_gallery_item(url, fingerprint, status) do
    %{
      "status" => status,
      "sourceUrl" => url,
      "previewUrl" => url,
      "width" => fingerprint && fingerprint["width"],
      "height" => fingerprint && fingerprint["height"]
    }
  end

  defp find_duplicate_of(existing, accepted_fingerprints, fingerprint) do
    case find_match_index(existing, fingerprint) do
      nil ->
        if Enum.any?(accepted_fingerprints, &Fingerprint.duplicate?(&1, fingerprint)),
          do: :incoming,
          else: nil

      index ->
        index
    end
  end

  defp find_match_index(fingerprints, fingerprint) do
    fingerprints
    |> Enum.with_index()
    |> Enum.find_value(fn {candidate, index} ->
      if is_map(candidate) and Fingerprint.duplicate?(candidate, fingerprint), do: index
    end)
  end

  defp count_new_images(images) do
    Enum.count(images, &(&1["status"] == "new"))
  end

  defp build_gallery_json(%ListingMergeSession{} = session) do
    payload = session.payload || %{}
    listing_id = session.target_listing_id
    current = gallery_existing_data(session)
    imported = session.imported_data || %{}

    existing =
      current
      |> resolved_existing_images(listing_id)
      |> Enum.map(fn entry ->
        fp = entry["fingerprint"] || %{}

        %{
          "ref" => "existing:#{entry["index"]}",
          "status" => "existing",
          "previewUrl" => entry["previewUrl"],
          "width" => fp["width"],
          "height" => fp["height"]
        }
        |> drop_nil_dimensions()
      end)

    incoming =
      Enum.map(payload["images"] || [], fn image ->
        status = image["status"] || "new"

        %{
          "ref" => "new:#{image["id"]}",
          "status" => status,
          "previewUrl" =>
            "/api/workspace/listing-merge-sessions/#{session.id}/images/#{image["id"]}",
          "sourceUrl" => image["sourceUrl"],
          "duplicateOf" => image["duplicateOf"],
          "width" => image["width"],
          "height" => image["height"]
        }
        |> drop_nil_dimensions()
        |> drop_nil_duplicate_of()
      end)

    skipped =
      Enum.map(payload["skipped"] || [], fn item ->
        %{
          "ref" =>
            "skipped:#{Base.encode16(:crypto.hash(:sha256, item["sourceUrl"] || ""), case: :lower)}",
          "status" => item["status"],
          "previewUrl" => item["previewUrl"] || item["sourceUrl"],
          "sourceUrl" => item["sourceUrl"],
          "width" => item["width"],
          "height" => item["height"]
        }
        |> drop_nil_dimensions()
      end)

    imported_previews = imported_preview_gallery_items(imported, payload, existing)

    sort_gallery_items(existing ++ incoming ++ skipped ++ imported_previews)
  end

  defp gallery_existing_data(%ListingMergeSession{} = session) do
    snapshot = session.current_data || %{}

    if existing_image_count(snapshot) > 0 do
      snapshot
    else
      case Repo.get(Listing, session.target_listing_id) do
        %Listing{data: data} when is_map(data) -> data
        _ -> snapshot
      end
    end
  end

  defp sort_gallery_items(items) do
    status_order = %{
      "existing" => 0,
      "new" => 1,
      "duplicate" => 2,
      "failed" => 3,
      "limit_skipped" => 4
    }

    Enum.sort_by(items, fn item ->
      {Map.get(status_order, item["status"], 99), item["ref"] || ""}
    end)
  end

  defp imported_preview_gallery_items(imported_data, payload, existing_items) do
    covered =
      ((payload["images"] || []) ++ (payload["skipped"] || []))
      |> Enum.map(& &1["sourceUrl"])
      |> Enum.filter(&is_binary/1)
      |> MapSet.new()

    imported_data
    |> listing_image_url_entries()
    |> Enum.reject(&MapSet.member?(covered, &1))
    |> Enum.map(fn url ->
      duplicate_of =
        existing_items
        |> Enum.find_value(fn item ->
          if item["previewUrl"] == url do
            case item["ref"] do
              "existing:" <> index_str ->
                case Integer.parse(index_str) do
                  {index, ""} -> index
                  _ -> nil
                end

              _ ->
                nil
            end
          end
        end)

      status = if is_integer(duplicate_of), do: "duplicate", else: "new"

      %{
        "ref" => "imported:#{url_ref_id(url)}",
        "status" => status,
        "previewUrl" => url,
        "sourceUrl" => url,
        "duplicateOf" => duplicate_of
      }
      |> drop_nil_duplicate_of()
    end)
  end

  defp url_ref_id(url) when is_binary(url) do
    :crypto.hash(:sha256, url) |> Base.encode16(case: :lower)
  end

  defp drop_nil_dimensions(item) do
    item
    |> then(fn map ->
      if is_nil(map["width"]), do: Map.delete(map, "width"), else: map
    end)
    |> then(fn map ->
      if is_nil(map["height"]), do: Map.delete(map, "height"), else: map
    end)
  end

  defp drop_nil_duplicate_of(item) do
    if is_nil(item["duplicateOf"]), do: Map.delete(item, "duplicateOf"), else: item
  end

  defp resolve_field_value(field, field_values) do
    case Map.fetch(field_values, field["path"]) do
      {:ok, value} -> coerce_field_value(value, field["valueType"], field["incomingValue"])
      :error -> field["incomingValue"]
    end
  end

  defp coerce_field_value(value, "text", _fallback) when is_binary(value), do: String.trim(value)
  defp coerce_field_value(value, "number", _fallback) when is_number(value), do: value

  defp coerce_field_value(value, "number", fallback) when is_binary(value) do
    normalized = value |> String.trim() |> String.replace(",", ".")

    case Float.parse(normalized) do
      {parsed, ""} -> if parsed == trunc(parsed), do: trunc(parsed), else: parsed
      _ -> fallback
    end
  end

  defp coerce_field_value(value, "boolean", _fallback) when is_boolean(value), do: value
  defp coerce_field_value("true", "boolean", _fallback), do: true
  defp coerce_field_value("false", "boolean", _fallback), do: false
  defp coerce_field_value(_value, _value_type, fallback), do: fallback

  defp resolve_image_refs(%{"imageRefs" => refs}) when is_list(refs), do: string_list(refs)

  defp resolve_image_refs(%{"imageIds" => ids}) when is_list(ids) do
    Enum.map(string_list(ids), &"new:#{&1}")
  end

  defp resolve_image_refs(_), do: []

  defp field_values_map(values) when is_map(values) do
    values
    |> Enum.filter(fn {key, value} ->
      is_binary(key) and (is_binary(value) or is_number(value) or is_boolean(value))
    end)
    |> Map.new()
  end

  defp field_values_map(_), do: %{}

  defp string_list(values) when is_list(values), do: Enum.filter(values, &is_binary/1)
  defp string_list(_), do: []

  defp apply_image_selection!(listing, session, image_refs) do
    data = listing.data || %{}
    existing_images = resolved_existing_images(data, listing.id)
    original_keys = existing_storage_keys(data)
    payload_images = get_in(session.payload || %{}, ["images"]) || []
    payload_image_map = Map.new(payload_images, &{&1["id"], &1})

    selected_existing =
      image_refs
      |> Enum.filter(&String.starts_with?(&1, "existing:"))
      |> Enum.map(fn "existing:" <> index_str ->
        case Integer.parse(index_str) do
          {index, ""} -> index
          _ -> nil
        end
      end)
      |> Enum.reject(&is_nil/1)
      |> Enum.filter(&(&1 >= 0 and &1 < length(existing_images)))
      |> Enum.uniq()
      |> Enum.sort()

    selected_new_ids =
      image_refs
      |> Enum.filter(&String.starts_with?(&1, "new:"))
      |> Enum.map(fn "new:" <> id -> id end)
      |> MapSet.new()

    selected_new_ordered =
      payload_images
      |> Enum.filter(&MapSet.member?(selected_new_ids, &1["id"]))
      |> Enum.map(& &1["id"])

    selected_imported_urls =
      image_refs
      |> Enum.filter(&String.starts_with?(&1, "imported:"))
      |> Enum.map(fn "imported:" <> ref_id -> ref_id end)
      |> MapSet.new()

    imported_urls_to_add =
      (session.imported_data || %{})
      |> listing_image_url_entries()
      |> Enum.filter(&(MapSet.member?(selected_imported_urls, url_ref_id(&1))))

    total =
      length(selected_existing) + length(selected_new_ordered) + length(imported_urls_to_add)

    if total > @max_images, do: Repo.rollback(:too_many_images)

    {final_keys, final_paths, final_fingerprints} =
      Enum.reduce(selected_existing, {[], [], []}, fn index, {keys, paths, fps} ->
        case Enum.at(existing_images, index) do
          %{} = entry ->
            storage_key = entry["storageKey"]
            preview_url = entry["previewUrl"]
            fingerprint = entry["fingerprint"] || %{}

            {
              keys ++ List.wrap(storage_key),
              paths ++ [preview_url],
              fps ++ [fingerprint]
            }

          _ ->
            {keys, paths, fps}
        end
      end)

    {final_keys, final_paths, final_fingerprints} =
      Enum.reduce(selected_new_ordered, {final_keys, final_paths, final_fingerprints}, fn id,
                                                                                        {keys,
                                                                                         paths,
                                                                                         fps} ->
        case Map.get(payload_image_map, id) do
          %{} = image ->
            with key when is_binary(key) <- image["storageKey"],
                 {:ok, bytes, content_type} <- Storage.get_object(key),
                 index <- length(keys),
                 {:ok, stored_key} <-
                   Storage.put_listing_image(listing.id, index, bytes, content_type) do
              {
                keys ++ [stored_key],
                paths ++ ["/api/listings/#{listing.id}/images/#{index}"],
                fps ++ [image["fingerprint"] || %{}]
              }
            else
              _ -> Repo.rollback(:image_copy_failed)
            end

          _ ->
            Repo.rollback(:invalid_image_ref)
        end
      end)

    {final_keys, final_paths, final_fingerprints} =
      Enum.reduce(imported_urls_to_add, {final_keys, final_paths, final_fingerprints}, fn url,
                                                                                        {keys,
                                                                                         paths,
                                                                                         fps} ->
        with {:ok, body, content_type} <- fetch_image_bytes(url),
             true <- byte_size(body) > 0,
             {:ok, fingerprint} <- Fingerprint.from_bytes(body),
             index <- length(keys),
             {:ok, stored_key} <- Storage.put_listing_image(listing.id, index, body, content_type) do
          {
            keys ++ [stored_key],
            paths ++ ["/api/listings/#{listing.id}/images/#{index}"],
            fps ++ [fingerprint]
          }
        else
          _ -> Repo.rollback(:image_copy_failed)
        end
      end)

    removed_keys =
      original_keys
      |> Enum.with_index()
      |> Enum.filter(fn {_key, index} -> index not in selected_existing end)
      |> Enum.map(fn {key, _index} -> key end)

    Enum.each(removed_keys, &Storage.delete_object/1)

    old_cover = data["imageCoverIndex"] || 0

    new_cover =
      case Enum.find_index(selected_existing, &(&1 == old_cover)) do
        nil -> 0
        index -> index
      end

    final_keys = Enum.filter(final_keys, &is_binary/1)

    if gallery_unchanged?(data, final_keys, final_paths, selected_new_ordered, removed_keys) do
      %{}
    else
      %{
        "imageStorageKeys" => final_keys,
        "imageUrls" => final_paths,
        "imageUrl" => List.first(final_paths),
        "imageFingerprints" => final_fingerprints,
        "imageCoverIndex" => new_cover,
        "imageIngestionStatus" => "ready",
        "imageIngestionError" => nil
      }
    end
  end

  defp existing_storage_keys(data) do
    List.wrap(data["imageStorageKeys"])
    |> Enum.filter(&(is_binary(&1) and String.trim(&1) != ""))
  end

  defp gallery_unchanged?(data, final_keys, final_paths, selected_new_ordered, removed_keys) do
    original_keys = existing_storage_keys(data)
    original_paths = listing_image_url_entries(data)

    final_keys == original_keys and selected_new_ordered == [] and removed_keys == [] and
      final_paths == original_paths
  end

  defp cleanup_staged_images(session) do
    cleanup_payload_images(session.payload || %{})
  end

  defp cleanup_payload_images(payload) do
    payload
    |> Map.get("images", [])
    |> Enum.map(& &1["storageKey"])
    |> Enum.filter(&is_binary/1)
    |> Enum.each(&Storage.delete_object/1)
  end

  defp public_http_url?(value) when is_binary(value) do
    case URI.parse(String.trim(value)) do
      %URI{scheme: scheme, host: host}
      when scheme in ["http", "https"] and is_binary(host) and host != "" ->
        normalized = String.downcase(host)

        normalized not in ["localhost", "0.0.0.0", "::1"] and
          not String.ends_with?(normalized, ".localhost") and
          not Regex.match?(~r/^127\./, normalized) and
          not Regex.match?(~r/^10\./, normalized) and
          not Regex.match?(~r/^192\.168\./, normalized) and
          not Regex.match?(~r/^169\.254\./, normalized) and
          not private_172?(normalized)

      _ ->
        false
    end
  end

  defp public_http_url?(_), do: false

  defp private_172?(host) do
    case String.split(host, ".") do
      ["172", second | _] ->
        case Integer.parse(second) do
          {value, ""} -> value in 16..31
          _ -> false
        end

      _ ->
        false
    end
  end

  defp content_type(headers, url) do
    header =
      Enum.find_value(headers, fn
        {key, value} when is_binary(key) ->
          if String.downcase(key) == "content-type", do: List.wrap(value) |> List.first()

        _ ->
          nil
      end)

    case header do
      value when is_binary(value) -> value |> String.split(";") |> List.first() |> String.trim()
      _ -> guess_content_type(url)
    end
  end

  defp guess_content_type(url) do
    lower = String.downcase(url)

    cond do
      String.contains?(lower, ".png") -> "image/png"
      String.contains?(lower, ".webp") -> "image/webp"
      String.contains?(lower, ".gif") -> "image/gif"
      true -> "image/jpeg"
    end
  end

  defp authorize_session!(nil, _opts), do: nil

  defp authorize_session!(session, opts) do
    user_id = Keyword.get(opts, :user_id)
    org_id = Keyword.get(opts, :org_id)

    cond do
      is_binary(org_id) and session.org_id == org_id -> session
      is_nil(org_id) and is_binary(user_id) and session.user_id == user_id -> session
      is_nil(user_id) and is_nil(org_id) -> session
      true -> nil
    end
  end

  defp scoped(query, _user_id, org_id) when is_binary(org_id),
    do: where(query, [s], s.org_id == ^org_id)

  defp scoped(query, user_id, nil) when is_binary(user_id),
    do: where(query, [s], s.user_id == ^user_id and is_nil(s.org_id))

  defp scoped(query, nil, nil), do: query

  defp normalize_expiration(nil), do: nil

  defp normalize_expiration(session) do
    if expired?(session) and session.status not in ["applied", "expired"] do
      mark_expired!(session)
    else
      session
    end
  end

  defp effective_status(session) do
    if expired?(session) and session.status not in ["applied"],
      do: "expired",
      else: session.status
  end

  defp expired?(session), do: DateTime.compare(now(), session.expires_at) == :gt

  defp mark_expired!(session) do
    session
    |> ListingMergeSession.changeset(%{status: "expired"})
    |> Repo.update!()
  end

  defp humanize_preference(key) do
    key
    |> String.replace("_", " ")
    |> String.split()
    |> Enum.map_join(" ", &String.capitalize/1)
  end

  defp now, do: DateTime.utc_now() |> DateTime.truncate(:second)
end
