defmodule MinhaCasaAi.FloorPlans do
  @moduledoc """
  Persisted, workspace-scoped floor plans for listings.

  The collection and listing identify the owning workspace. Client payloads never choose it.
  """

  import Ecto.Query

  alias MinhaCasaAi.FloorPlans.{AreaLink, FloorPlan, Storage}
  alias MinhaCasaAi.Entitlements
  alias MinhaCasaAi.ListingImages.StorageCleanup
  alias MinhaCasaAi.Listings.{Collection, CollectionPolicy, Listing}
  alias MinhaCasaAi.Repo

  @workspace_limit 10
  @max_blueprint_bytes 10 * 1024 * 1024
  @empty_document %{
    "version" => 2,
    "blueprint" => nil,
    "viewport" => %{"x" => 80, "y" => 70, "scale" => 1},
    "grid" => %{
      "visible" => true,
      "size" => 50,
      "metersPerCell" => 1,
      "showMeasurements" => false,
      "snapToGrid" => false
    },
    "scaleRuler" => nil,
    "shapes" => []
  }

  def workspace_limit, do: @workspace_limit
  def empty_document, do: @empty_document

  def list(collection_id, listing_id, profile) do
    with {:ok, collection, _listing} <-
           authorize_listing(collection_id, listing_id, profile, :view) do
      plans =
        FloorPlan
        |> where([p], p.workspace_id == ^collection.workspace_id and p.listing_id == ^listing_id)
        |> order_by([p], asc: p.created_at, asc: p.id)
        |> preload(:area_links)
        |> Repo.all()
        |> hydrate_environment_names()

      {:ok, plans}
    end
  end

  def fetch(collection_id, listing_id, floor_plan_id, profile) do
    with {:ok, collection, _listing} <-
           authorize_listing(collection_id, listing_id, profile, :view),
         %FloorPlan{} = floor_plan <-
           get_scoped(collection.workspace_id, listing_id, floor_plan_id) do
      {:ok, floor_plan |> Repo.preload(:area_links) |> hydrate_environment_names()}
    else
      nil -> {:error, :floor_plan_not_found}
      {:error, _} = error -> error
    end
  end

  def create(collection_id, listing_id, profile, attrs \\ %{}) when is_map(attrs) do
    with {:ok, collection, _listing} <-
           authorize_listing(collection_id, listing_id, profile, :edit_existing) do
      Repo.transaction(fn ->
        lock_workspace(collection.workspace_id)

        if count_for_workspace(collection.workspace_id) >= @workspace_limit do
          Repo.rollback(:floor_plan_limit)
        end

        name =
          attrs
          |> value(:name)
          |> normalized_name()
          |> case do
            nil -> next_default_name(listing_id)
            requested -> requested
          end

        document =
          case value(attrs, :document) do
            document when is_map(document) -> stringify_keys(document)
            _ -> @empty_document
          end

        %FloorPlan{}
        |> FloorPlan.create_changeset(%{
          workspace_id: collection.workspace_id,
          listing_id: listing_id,
          created_by_user_id: profile.user_id,
          name: name,
          document: document
        })
        |> Repo.insert()
        |> case do
          {:ok, floor_plan} -> Repo.preload(floor_plan, :area_links)
          {:error, reason} -> Repo.rollback(reason)
        end
      end)
    end
  end

  def rename(collection_id, listing_id, floor_plan_id, profile, attrs) when is_map(attrs) do
    with {:ok, collection, _listing} <-
           authorize_listing(collection_id, listing_id, profile, :edit_existing),
         %FloorPlan{} = floor_plan <-
           get_scoped(collection.workspace_id, listing_id, floor_plan_id) do
      floor_plan
      |> FloorPlan.rename_changeset(%{name: value(attrs, :name)})
      |> Repo.update()
      |> preload_result()
    else
      nil -> {:error, :floor_plan_not_found}
      {:error, _} = error -> error
    end
  end

  def save_document(collection_id, listing_id, floor_plan_id, profile, attrs)
      when is_map(attrs) do
    with {:ok, collection, _listing} <-
           authorize_listing(collection_id, listing_id, profile, :edit_existing),
         {:ok, expected_revision} <- expected_revision(attrs),
         document when is_map(document) <- value(attrs, :document) do
      document = stringify_keys(document)

      Repo.transaction(fn ->
        floor_plan = get_scoped(collection.workspace_id, listing_id, floor_plan_id, lock: true)

        cond do
          is_nil(floor_plan) ->
            Repo.rollback(:floor_plan_not_found)

          floor_plan.revision != expected_revision ->
            Repo.rollback({:revision_conflict, floor_plan.revision})

          true ->
            existing_links =
              Repo.all(from(l in AreaLink, where: l.floor_plan_id == ^floor_plan.id))

            with {:ok, links} <-
                   prepare_links(attrs, document, existing_links, listing_id),
                 {:ok, saved} <-
                   floor_plan |> FloorPlan.document_changeset(document) |> Repo.update(),
                 :ok <- replace_links(saved.id, links) do
              saved
              |> Repo.preload(:area_links, force: true)
              |> hydrate_environment_names()
            else
              {:error, reason} -> Repo.rollback(reason)
            end
        end
      end)
    else
      nil -> {:error, :invalid_document}
      {:error, _} = error -> error
      _ -> {:error, :invalid_document}
    end
  end

  def delete(collection_id, listing_id, floor_plan_id, profile) do
    with {:ok, collection, _listing} <-
           authorize_listing(collection_id, listing_id, profile, :edit_existing),
         %FloorPlan{} = floor_plan <-
           get_scoped(collection.workspace_id, listing_id, floor_plan_id),
         {:ok, deleted} <- Repo.delete(floor_plan) do
      enqueue_cleanup(deleted.blueprint_storage_key)
      {:ok, deleted}
    else
      nil -> {:error, :floor_plan_not_found}
      {:error, _} = error -> error
    end
  end

  def upload_blueprint(collection_id, listing_id, floor_plan_id, profile, upload, attrs \\ %{}) do
    with {:ok, collection, _listing} <-
           authorize_listing(collection_id, listing_id, profile, :edit_existing),
         %FloorPlan{} = floor_plan <-
           get_scoped(collection.workspace_id, listing_id, floor_plan_id),
         {:ok, bytes} <- read_upload(upload),
         :ok <- validate_blueprint_size(bytes),
         {:ok, content_type} <- detect_content_type(bytes),
         {:ok, key} <-
           Storage.put_blueprint(
             collection.workspace_id,
             listing_id,
             floor_plan_id,
             bytes,
             content_type
           ) do
      previous_key = floor_plan.blueprint_storage_key

      result =
        floor_plan
        |> FloorPlan.blueprint_changeset(%{
          blueprint_storage_key: key,
          blueprint_content_type: content_type,
          blueprint_byte_size: byte_size(bytes),
          blueprint_width: positive_integer(value(attrs, :width)),
          blueprint_height: positive_integer(value(attrs, :height))
        })
        |> Repo.update()
        |> preload_result()

      case result do
        {:ok, saved} ->
          enqueue_cleanup(previous_key)
          {:ok, saved}

        {:error, _} = error ->
          _ = Storage.delete_blueprint(key)
          error
      end
    else
      nil -> {:error, :floor_plan_not_found}
      {:error, _} = error -> error
      _ -> {:error, :invalid_blueprint}
    end
  end

  def fetch_blueprint(collection_id, listing_id, floor_plan_id, profile) do
    with {:ok, collection, _listing} <-
           authorize_listing(collection_id, listing_id, profile, :view),
         %FloorPlan{blueprint_storage_key: key} = floor_plan
         when is_binary(key) <- get_scoped(collection.workspace_id, listing_id, floor_plan_id),
         {:ok, bytes, _stored_content_type} <- Storage.get_blueprint(key) do
      {:ok, floor_plan, bytes, floor_plan.blueprint_content_type}
    else
      %FloorPlan{} -> {:error, :blueprint_not_found}
      nil -> {:error, :floor_plan_not_found}
      {:error, _} = error -> error
      _ -> {:error, :blueprint_not_found}
    end
  end

  def delete_blueprint(collection_id, listing_id, floor_plan_id, profile) do
    with {:ok, collection, _listing} <-
           authorize_listing(collection_id, listing_id, profile, :edit_existing),
         %FloorPlan{} = floor_plan <-
           get_scoped(collection.workspace_id, listing_id, floor_plan_id) do
      case floor_plan.blueprint_storage_key do
        previous_key when is_binary(previous_key) ->
          with {:ok, saved} <-
                 floor_plan
                 |> FloorPlan.clear_blueprint_changeset()
                 |> Repo.update()
                 |> preload_result() do
            enqueue_cleanup(previous_key)
            {:ok, saved}
          end

        nil ->
          {:ok, floor_plan |> Repo.preload(:area_links) |> hydrate_environment_names()}
      end
    else
      nil -> {:error, :floor_plan_not_found}
      {:error, _} = error -> error
    end
  end

  def count_for_workspace(workspace_id) when is_binary(workspace_id) do
    Repo.aggregate(from(p in FloorPlan, where: p.workspace_id == ^workspace_id), :count)
  end

  def ensure_workspace_capacity(workspace_id, amount \\ 1)
      when is_binary(workspace_id) and is_integer(amount) and amount >= 0 do
    if count_for_workspace(workspace_id) + amount <= @workspace_limit,
      do: :ok,
      else: {:error, :floor_plan_limit}
  end

  @doc """
  Copies every plan for a listing into another listing owned by the target workspace.

  `environment_id_map` maps source environment UUIDs to target environment UUIDs. A link
  without a mapped target is preserved as a custom name using its last inherited snapshot.
  This function is intended for the authenticated listing/collection copy workflows.
  """
  def copy_for_listing(
        source_listing_id,
        target_listing_id,
        target_workspace_id,
        created_by_user_id,
        environment_id_map \\ %{}
      )
      when is_binary(source_listing_id) and is_binary(target_listing_id) and
             is_binary(target_workspace_id) and is_binary(created_by_user_id) and
             is_map(environment_id_map) do
    source_plans =
      FloorPlan
      |> where([p], p.listing_id == ^source_listing_id)
      |> order_by([p], asc: p.created_at, asc: p.id)
      |> preload(:area_links)
      |> Repo.all()

    with %Listing{} <- Repo.get(Listing, source_listing_id),
         %Listing{} <- target_listing_in_workspace(target_listing_id, target_workspace_id) do
      Repo.transaction(fn ->
        lock_workspace(target_workspace_id)

        if count_for_workspace(target_workspace_id) + length(source_plans) > @workspace_limit do
          Repo.rollback(:floor_plan_limit)
        end

        Enum.reduce(source_plans, {[], []}, fn source, {copies, copied_keys} ->
          copied =
            %FloorPlan{}
            |> FloorPlan.create_changeset(%{
              workspace_id: target_workspace_id,
              listing_id: target_listing_id,
              created_by_user_id: created_by_user_id,
              name: source.name,
              document: source.document
            })
            |> Repo.insert()
            |> case do
              {:ok, floor_plan} -> floor_plan
              {:error, reason} -> rollback_copy(reason, copied_keys)
            end

          copied_links =
            Enum.map(source.area_links, fn link ->
              target_environment_id =
                link.environment_id && Map.get(environment_id_map, link.environment_id)

              %{
                shape_id: link.shape_id,
                environment_id: target_environment_id,
                custom_name:
                  link.custom_name ||
                    if(is_nil(target_environment_id),
                      do: link.inherited_name_snapshot,
                      else: nil
                    ),
                inherited_name_snapshot: link.inherited_name_snapshot
              }
            end)

          copied_links =
            refresh_copied_link_snapshots(target_listing_id, copied_links, copied_keys)

          case replace_links(copied.id, copied_links) do
            :ok -> :ok
            {:error, reason} -> rollback_copy(reason, copied_keys)
          end

          {copied, copied_keys} = copy_blueprint(source, copied, copied_keys)
          copied = Repo.preload(copied, :area_links, force: true)
          {[copied | copies], copied_keys}
        end)
        |> then(fn {copies, copied_keys} ->
          %{floor_plans: Enum.reverse(copies), copied_storage_keys: copied_keys}
        end)
      end)
      |> case do
        {:ok, %{floor_plans: copied}} ->
          {:ok, hydrate_environment_names(copied)}

        {:error, {:copy_failed, reason, copied_keys}} ->
          _ = StorageCleanup.enqueue(keys: copied_keys)
          {:error, reason}

        {:error, _} = error ->
          error
      end
    else
      nil -> {:error, :listing_not_found}
    end
  end

  defp authorize_listing(collection_id, listing_id, profile, action) do
    with {:ok, %Collection{} = collection, _access} <-
           CollectionPolicy.authorize(profile.user_id, collection_id, action),
         true <- active_workspace_matches?(profile, collection),
         :ok <- ensure_writable(collection.workspace_id, action),
         %Listing{} = listing <-
           Repo.get_by(Listing, id: listing_id, collection_id: collection.id) do
      {:ok, collection, listing}
    else
      false -> {:error, :collection_not_found}
      {:error, :workspace_frozen} -> {:error, :workspace_frozen}
      nil -> {:error, :listing_not_found}
      {:error, _} -> {:error, :collection_not_found}
    end
  end

  defp active_workspace_matches?(%{workspace_id: workspace_id}, collection)
       when is_binary(workspace_id),
       do: workspace_id == collection.workspace_id

  defp active_workspace_matches?(_, _), do: true

  defp ensure_writable(_workspace_id, :view), do: :ok

  defp ensure_writable(workspace_id, _action) do
    case Entitlements.for_workspace_id(workspace_id) do
      {:ok, %{workspace_status: "active"}} -> :ok
      _ -> {:error, :workspace_frozen}
    end
  end

  defp get_scoped(workspace_id, listing_id, floor_plan_id, opts \\ []) do
    query =
      from(p in FloorPlan,
        where:
          p.id == ^floor_plan_id and p.workspace_id == ^workspace_id and
            p.listing_id == ^listing_id
      )

    query = if Keyword.get(opts, :lock, false), do: lock(query, "FOR UPDATE"), else: query
    Repo.one(query)
  end

  defp lock_workspace(workspace_id) do
    Repo.query!("SELECT pg_advisory_xact_lock(hashtext($1))", ["floor-plans:#{workspace_id}"])
  end

  defp target_listing_in_workspace(listing_id, workspace_id) do
    Repo.one(
      from(l in Listing,
        join: c in Collection,
        on: c.id == l.collection_id,
        where: l.id == ^listing_id and c.workspace_id == ^workspace_id,
        select: l
      )
    )
  end

  defp refresh_copied_link_snapshots(listing_id, links, copied_keys) do
    case environment_names(listing_id, links) do
      {:ok, names} ->
        Enum.map(links, fn link ->
          if link.environment_id,
            do: %{link | inherited_name_snapshot: Map.fetch!(names, link.environment_id)},
            else: link
        end)

      {:error, reason} ->
        rollback_copy(reason, copied_keys)
    end
  end

  defp copy_blueprint(%FloorPlan{blueprint_storage_key: nil}, copied, copied_keys),
    do: {copied, copied_keys}

  defp copy_blueprint(source, copied, copied_keys) do
    with {:ok, bytes, _content_type} <- Storage.get_blueprint(source.blueprint_storage_key),
         {:ok, key} <-
           Storage.put_blueprint(
             copied.workspace_id,
             copied.listing_id,
             copied.id,
             bytes,
             source.blueprint_content_type
           ) do
      keys = [key | copied_keys]

      copied
      |> FloorPlan.blueprint_changeset(%{
        blueprint_storage_key: key,
        blueprint_content_type: source.blueprint_content_type,
        blueprint_byte_size: byte_size(bytes),
        blueprint_width: source.blueprint_width,
        blueprint_height: source.blueprint_height
      })
      |> Repo.update()
      |> case do
        {:ok, floor_plan} -> {floor_plan, keys}
        {:error, reason} -> rollback_copy(reason, keys)
      end
    else
      {:error, reason} -> rollback_copy(reason, copied_keys)
    end
  end

  defp rollback_copy(reason, copied_keys),
    do: Repo.rollback({:copy_failed, reason, copied_keys})

  defp next_default_name(listing_id) do
    names =
      Repo.all(from(p in FloorPlan, where: p.listing_id == ^listing_id, select: p.name))
      |> MapSet.new()

    Stream.iterate(1, &(&1 + 1))
    |> Stream.map(&"Planta #{&1}")
    |> Enum.find(&(not MapSet.member?(names, &1)))
  end

  defp prepare_links(attrs, document, existing_links, listing_id) do
    shape_types = shape_types(document)

    raw_links =
      case fetch_value(attrs, :areaLinks) do
        :missing ->
          Enum.map(existing_links, fn link ->
            %{
              shapeId: link.shape_id,
              environmentId: link.environment_id,
              customName: link.custom_name,
              inheritedNameSnapshot: link.inherited_name_snapshot
            }
          end)

        value ->
          value
      end

    with true <- is_list(raw_links),
         {:ok, normalized} <- normalize_links(raw_links, shape_types),
         {:ok, environment_names} <- environment_names(listing_id, normalized) do
      links =
        Enum.map(normalized, fn link ->
          snapshot =
            if link.environment_id,
              do: Map.fetch!(environment_names, link.environment_id),
              else: link.inherited_name_snapshot

          %{
            shape_id: link.shape_id,
            environment_id: link.environment_id,
            custom_name: link.custom_name,
            inherited_name_snapshot: snapshot
          }
        end)

      {:ok, links}
    else
      false -> {:error, :invalid_area_links}
      {:error, _} = error -> error
    end
  end

  defp normalize_links(raw_links, shape_types) do
    raw_links
    |> Enum.reduce_while({:ok, []}, fn raw, {:ok, acc} ->
      shape_id = raw |> value(:shapeId) |> normalized_name()
      environment_id = raw |> value(:environmentId) |> normalized_name()
      custom_name = raw |> value(:customName) |> normalized_name()
      inherited = raw |> value(:inheritedNameSnapshot) |> normalized_name()

      cond do
        not is_map(raw) ->
          {:halt, {:error, :invalid_area_links}}

        is_nil(shape_id) or Map.get(shape_types, shape_id) != "rect" ->
          {:halt, {:error, :invalid_area_link_shape}}

        environment_id && not valid_uuid?(environment_id) ->
          {:halt, {:error, :invalid_environment}}

        custom_name && String.length(custom_name) > 120 ->
          {:halt, {:error, :invalid_area_name}}

        is_nil(environment_id) and is_nil(custom_name) and is_nil(inherited) ->
          {:cont, {:ok, acc}}

        true ->
          link = %{
            shape_id: shape_id,
            environment_id: environment_id,
            custom_name: custom_name || if(is_nil(environment_id), do: inherited, else: nil),
            inherited_name_snapshot: inherited
          }

          {:cont, {:ok, [link | acc]}}
      end
    end)
    |> case do
      {:ok, links} ->
        links = Enum.reverse(links)
        ids = Enum.map(links, & &1.shape_id)
        if Enum.uniq(ids) == ids, do: {:ok, links}, else: {:error, :duplicate_area_link}

      error ->
        error
    end
  end

  defp shape_types(document) do
    document
    |> Map.get("shapes", [])
    |> case do
      shapes when is_list(shapes) -> shapes
      _ -> []
    end
    |> Enum.reduce(%{}, fn shape, acc ->
      if is_map(shape) do
        id = value(shape, :id)
        type = value(shape, :type)

        if is_binary(id) and is_binary(type),
          do: Map.put(acc, id, type),
          else: acc
      else
        acc
      end
    end)
  end

  defp environment_names(_listing_id, links) when links == [], do: {:ok, %{}}

  defp environment_names(listing_id, links) do
    ids = links |> Enum.map(& &1.environment_id) |> Enum.reject(&is_nil/1) |> Enum.uniq()

    if ids == [] do
      {:ok, %{}}
    else
      dumped_ids = Enum.map(ids, &Ecto.UUID.dump!/1)

      result =
        Repo.query!(
          "SELECT id, name FROM listing_environments WHERE listing_id = $1 AND id = ANY($2::uuid[])",
          [Ecto.UUID.dump!(listing_id), dumped_ids]
        )

      names =
        Map.new(result.rows, fn [id, name] ->
          {uuid_string(id), name}
        end)

      if map_size(names) == length(ids),
        do: {:ok, names},
        else: {:error, :invalid_environment}
    end
  end

  defp replace_links(floor_plan_id, links) do
    Repo.delete_all(from(l in AreaLink, where: l.floor_plan_id == ^floor_plan_id))

    Enum.reduce_while(links, :ok, fn attrs, :ok ->
      %AreaLink{}
      |> AreaLink.changeset(Map.put(attrs, :floor_plan_id, floor_plan_id))
      |> Repo.insert()
      |> case do
        {:ok, _} -> {:cont, :ok}
        {:error, changeset} -> {:halt, {:error, changeset}}
      end
    end)
  end

  defp hydrate_environment_names(%FloorPlan{} = floor_plan) do
    [floor_plan] |> hydrate_environment_names() |> List.first()
  end

  defp hydrate_environment_names(floor_plans) when is_list(floor_plans) do
    links = Enum.flat_map(floor_plans, & &1.area_links)

    names =
      links
      |> Enum.map(& &1.environment_id)
      |> Enum.reject(&is_nil/1)
      |> Enum.uniq()
      |> case do
        [] ->
          %{}

        ids ->
          result =
            Repo.query!("SELECT id, name FROM listing_environments WHERE id = ANY($1::uuid[])", [
              Enum.map(ids, &Ecto.UUID.dump!/1)
            ])

          Map.new(result.rows, fn [id, name] -> {uuid_string(id), name} end)
      end

    Enum.map(floor_plans, fn floor_plan ->
      updated_links =
        Enum.map(floor_plan.area_links, fn link ->
          %{link | environment_name: Map.get(names, link.environment_id)}
        end)

      %{floor_plan | area_links: updated_links}
    end)
  end

  defp expected_revision(attrs) do
    case value(attrs, :expectedRevision) do
      value when is_integer(value) and value >= 0 ->
        {:ok, value}

      value when is_binary(value) ->
        case Integer.parse(value) do
          {revision, ""} when revision >= 0 -> {:ok, revision}
          _ -> {:error, :invalid_expected_revision}
        end

      _ ->
        {:error, :invalid_expected_revision}
    end
  end

  defp read_upload(%Plug.Upload{path: path}), do: File.read(path)
  defp read_upload(_), do: {:error, :invalid_blueprint}

  defp validate_blueprint_size(<<>>), do: {:error, :empty_blueprint}

  defp validate_blueprint_size(bytes) when byte_size(bytes) <= @max_blueprint_bytes, do: :ok
  defp validate_blueprint_size(_), do: {:error, :blueprint_too_large}

  defp detect_content_type(<<0x89, "PNG\r\n", 0x1A, "\n", _::binary>>),
    do: {:ok, "image/png"}

  defp detect_content_type(<<0xFF, 0xD8, 0xFF, _::binary>>), do: {:ok, "image/jpeg"}

  defp detect_content_type(<<"RIFF", _size::little-32, "WEBP", _::binary>>),
    do: {:ok, "image/webp"}

  defp detect_content_type(_), do: {:error, :invalid_blueprint_type}

  defp positive_integer(value) when is_integer(value) and value > 0, do: value

  defp positive_integer(value) when is_binary(value) do
    case Integer.parse(value) do
      {integer, ""} when integer > 0 -> integer
      _ -> nil
    end
  end

  defp positive_integer(_), do: nil

  defp preload_result({:ok, floor_plan}),
    do: {:ok, floor_plan |> Repo.preload(:area_links) |> hydrate_environment_names()}

  defp preload_result(error), do: error

  defp enqueue_cleanup(key) when is_binary(key) do
    _ = StorageCleanup.enqueue(keys: [key])
    :ok
  end

  defp enqueue_cleanup(_), do: :ok

  defp valid_uuid?(value), do: match?({:ok, _}, Ecto.UUID.cast(value))

  defp uuid_string(<<_::128>> = value), do: Ecto.UUID.load!(value)
  defp uuid_string(value) when is_binary(value), do: value

  defp fetch_value(map, key) do
    string_key = to_string(key)

    cond do
      Map.has_key?(map, string_key) -> Map.get(map, string_key)
      Map.has_key?(map, key) -> Map.get(map, key)
      true -> :missing
    end
  end

  defp value(map, key) when is_map(map) do
    case fetch_value(map, key) do
      :missing -> nil
      found -> found
    end
  end

  defp value(_, _), do: nil

  defp normalized_name(value) when is_binary(value) do
    case String.trim(value) do
      "" -> nil
      name -> name
    end
  end

  defp normalized_name(_), do: nil

  defp stringify_keys(value) when is_map(value) do
    Map.new(value, fn {key, child} -> {to_string(key), stringify_keys(child)} end)
  end

  defp stringify_keys(value) when is_list(value), do: Enum.map(value, &stringify_keys/1)
  defp stringify_keys(value), do: value
end
