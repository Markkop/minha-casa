defmodule MinhaCasaAi.Listings.ListingMedia do
  @moduledoc "Normalized listing images and user-managed environments."

  import Ecto.Query

  alias MinhaCasaAi.Listings.{
    CollectionPolicy,
    Listing,
    ListingEnvironment,
    ListingEnvironmentImage,
    ListingImage
  }

  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Entitlements

  @default_names %{
    "exterior" => "Área externa",
    "livingRoom" => "Sala",
    "kitchen" => "Cozinha",
    "bedroom" => "Quarto",
    "bathroom" => "Banheiro",
    "garage" => "Garagem",
    "balcony" => "Varanda",
    "utilityRoom" => "Área de serviço",
    "custom" => "Outro"
  }

  def list(collection_id, listing_id, profile) do
    with {:ok, listing} <- authorize_listing(collection_id, listing_id, profile, :view),
         {:ok, _} <- ensure_normalized(listing) do
      {:ok, media_json(listing.id)}
    end
  end

  def create_environment(collection_id, listing_id, profile, attrs) when is_map(attrs) do
    with {:ok, listing} <-
           authorize_listing(collection_id, listing_id, profile, :edit_existing) do
      Repo.transaction(fn ->
        lock_listing!(listing.id)
        ensure_normalized_in_transaction!(listing)
        position = next_environment_position(listing.id)
        image_ids = attrs_image_ids(attrs, listing.id)

        attrs =
          attrs
          |> environment_attrs()
          |> Map.merge(%{listing_id: listing.id, position: position, source: "manual"})

        environment =
          %ListingEnvironment{}
          |> ListingEnvironment.changeset(attrs)
          |> Repo.insert()
          |> unwrap!()

        replace_assignments!(environment, image_ids)
        sync_legacy_environments!(listing.id)
        environment_json(environment, listing.id)
      end)
    end
  end

  def update_environment(collection_id, listing_id, environment_id, profile, attrs)
      when is_map(attrs) do
    with {:ok, listing} <-
           authorize_listing(collection_id, listing_id, profile, :edit_existing) do
      Repo.transaction(fn ->
        lock_listing!(listing.id)

        environment =
          Repo.get_by(ListingEnvironment, id: environment_id, listing_id: listing.id) ||
            Repo.rollback(:environment_not_found)

        old_name = environment.name

        environment =
          environment
          |> ListingEnvironment.changeset(environment_patch_attrs(attrs))
          |> Repo.update()
          |> unwrap!()

        if environment.name != old_name, do: refresh_area_link_snapshots!(environment)

        if has_image_assignment?(attrs) do
          replace_assignments!(environment, attrs_image_ids(attrs, listing.id))
        end

        sync_legacy_environments!(listing.id)
        environment_json(environment, listing.id)
      end)
    end
  end

  def delete_environment(collection_id, listing_id, environment_id, profile) do
    with {:ok, listing} <-
           authorize_listing(collection_id, listing_id, profile, :edit_existing) do
      Repo.transaction(fn ->
        lock_listing!(listing.id)

        environment =
          Repo.get_by(ListingEnvironment, id: environment_id, listing_id: listing.id) ||
            Repo.rollback(:environment_not_found)

        preserve_area_link_names!(environment)
        Repo.delete!(environment)
        compact_environment_positions!(listing.id)
        sync_legacy_environments!(listing.id)
        :ok
      end)
    end
  end

  @doc "Replaces environments, their ordering and image assignments atomically."
  def replace_environments(collection_id, listing_id, profile, attrs) when is_map(attrs) do
    environments = fetch(attrs, "environments", [])

    if is_list(environments) do
      with {:ok, listing} <-
             authorize_listing(collection_id, listing_id, profile, :edit_existing) do
        Repo.transaction(fn ->
          lock_listing!(listing.id)
          ensure_normalized_in_transaction!(listing)
          validate_replace_payload!(environments, listing.id)

          existing =
            ListingEnvironment
            |> where([environment], environment.listing_id == ^listing.id)
            |> Repo.all()
            |> Map.new(&{&1.id, &1})

          Repo.update_all(
            from(environment in ListingEnvironment, where: environment.listing_id == ^listing.id),
            inc: [position: 100_000]
          )

          Repo.delete_all(
            from(assignment in ListingEnvironmentImage,
              where:
                assignment.environment_id in subquery(
                  from(environment in ListingEnvironment,
                    where: environment.listing_id == ^listing.id,
                    select: environment.id
                  )
                )
            )
          )

          kept_ids =
            environments
            |> Enum.with_index()
            |> Enum.map(fn {payload, position} ->
              requested_id = valid_uuid(fetch(payload, "id"))
              environment = if requested_id, do: existing[requested_id]

              attrs =
                payload
                |> environment_attrs()
                |> Map.merge(%{
                  listing_id: listing.id,
                  position: position,
                  source: "manual"
                })
                |> maybe_put_id(requested_id)

              environment =
                (environment || %ListingEnvironment{})
                |> ListingEnvironment.changeset(attrs)
                |> then(fn changeset ->
                  if environment, do: Repo.update(changeset), else: Repo.insert(changeset)
                end)
                |> unwrap!()

              replace_assignments!(environment, attrs_image_ids(payload, listing.id))
              environment.id
            end)

          existing
          |> Map.drop(kept_ids)
          |> Map.values()
          |> Enum.each(fn environment ->
            preserve_area_link_names!(environment)
            Repo.delete!(environment)
          end)

          sync_legacy_environments!(listing.id)
          media_json(listing.id)
        end)
      end
    else
      {:error, :invalid_environments}
    end
  end

  @doc "Synchronizes normalized images from the legacy ordered arrays after ingest/merge."
  def sync_images_from_legacy(%Listing{} = listing), do: sync_images_from_legacy(listing.id)

  def sync_images_from_legacy(listing_id) when is_binary(listing_id) do
    Repo.transaction(fn ->
      listing = lock_listing!(listing_id)
      sync_images_in_transaction!(listing)
      ensure_environments_in_transaction!(listing)
      sync_legacy_environments!(listing.id)
      media_json(listing.id)
    end)
  end

  @doc "Materializes both normalized images and environments from a legacy ListingData payload."
  def sync_from_legacy(%Listing{} = listing), do: sync_from_legacy(listing.id)

  def sync_from_legacy(listing_id) when is_binary(listing_id) do
    sync_images_from_legacy(listing_id)
  end

  @doc "Clones normalized media metadata and returns source-to-target environment IDs."
  def copy_for_listing(source_listing_id, target_listing_id)
      when is_binary(source_listing_id) and is_binary(target_listing_id) do
    with %Listing{} = source <- Repo.get(Listing, source_listing_id),
         %Listing{} = target <- Repo.get(Listing, target_listing_id),
         {:ok, _} <- ensure_normalized(source) do
      Repo.transaction(fn ->
        target = lock_listing!(target.id)
        sync_images_in_transaction!(target)

        source_environments =
          ListingEnvironment
          |> where([environment], environment.listing_id == ^source.id)
          |> order_by([environment], asc: environment.position)
          |> Repo.all()

        target_environments =
          ListingEnvironment
          |> where([environment], environment.listing_id == ^target.id)
          |> order_by([environment], asc: environment.position)
          |> Repo.all()

        target_environments =
          if target_environments == [] do
            clone_environments!(source.id, target.id, source_environments)
          else
            target_environments
          end

        sync_legacy_environments!(target.id)

        source_environments
        |> Enum.zip(target_environments)
        |> Map.new(fn {source_environment, target_environment} ->
          {source_environment.id, target_environment.id}
        end)
      end)
    else
      nil -> {:error, :listing_not_found}
      {:error, _} = error -> error
    end
  end

  def media_json(listing_id) do
    images = list_images(listing_id)
    assignments = assignments_by_environment(listing_id)

    environments =
      ListingEnvironment
      |> where([environment], environment.listing_id == ^listing_id)
      |> order_by([environment], asc: environment.position)
      |> Repo.all()
      |> Enum.map(fn environment ->
        assigned_images = Map.get(assignments, environment.id, [])
        environment_json(environment, assigned_images)
      end)

    %{images: Enum.map(images, &image_json/1), environments: environments}
  end

  def list_images(listing_id) do
    ListingImage
    |> where([image], image.listing_id == ^listing_id)
    |> order_by([image], asc: image.position)
    |> Repo.all()
  end

  defp ensure_normalized(%Listing{} = listing) do
    Repo.transaction(fn ->
      listing = lock_listing!(listing.id)
      ensure_normalized_in_transaction!(listing)
      listing
    end)
  end

  defp ensure_normalized_in_transaction!(listing) do
    image_count =
      Repo.aggregate(from(image in ListingImage, where: image.listing_id == ^listing.id), :count)

    if image_count == 0, do: sync_images_in_transaction!(listing)

    environment_count =
      Repo.aggregate(
        from(environment in ListingEnvironment, where: environment.listing_id == ^listing.id),
        :count
      )

    if environment_count == 0, do: ensure_environments_in_transaction!(listing)
  end

  defp ensure_environments_in_transaction!(listing) do
    environment_count =
      Repo.aggregate(
        from(environment in ListingEnvironment, where: environment.listing_id == ^listing.id),
        :count
      )

    if environment_count == 0 do
      environments = list((listing.data || %{})["imageEnvironments"])

      if environments != [] do
        import_legacy_environments!(listing, environments)
      else
        insert_default_environments!(listing)
      end
    end
  end

  defp import_legacy_environments!(listing, payloads) do
    images = list_images(listing.id)

    payloads
    |> Enum.filter(&is_map/1)
    |> Enum.with_index()
    |> Enum.reduce(MapSet.new(), fn {payload, position}, assigned_ids ->
      requested_id = valid_uuid(fetch(payload, "id"))

      id =
        if requested_id && is_nil(Repo.get(ListingEnvironment, requested_id)),
          do: requested_id,
          else: Ecto.UUID.generate()

      attrs =
        payload
        |> environment_attrs()
        |> Map.merge(%{
          id: id,
          listing_id: listing.id,
          position: position,
          source: "manual"
        })

      environment =
        %ListingEnvironment{}
        |> ListingEnvironment.changeset(attrs)
        |> Repo.insert()
        |> unwrap!()

      image_ids =
        payload
        |> legacy_payload_image_ids(images)
        |> Enum.reject(&MapSet.member?(assigned_ids, &1))

      replace_assignments!(environment, image_ids)
      Enum.reduce(image_ids, assigned_ids, &MapSet.put(&2, &1))
    end)
  end

  defp clone_environments!(source_listing_id, target_listing_id, source_environments) do
    source_assignments = assignments_by_environment(source_listing_id)
    target_images = Map.new(list_images(target_listing_id), &{&1.position, &1.id})

    Enum.map(source_environments, fn source_environment ->
      target_environment =
        %ListingEnvironment{}
        |> ListingEnvironment.changeset(%{
          listing_id: target_listing_id,
          kind: source_environment.kind,
          name: source_environment.name,
          ordinal: source_environment.ordinal,
          position: source_environment.position,
          source: "manual"
        })
        |> Repo.insert!()

      image_ids =
        source_assignments
        |> Map.get(source_environment.id, [])
        |> Enum.map(&target_images[&1.position])
        |> Enum.reject(&is_nil/1)

      replace_assignments!(target_environment, image_ids)
      target_environment
    end)
  end

  defp legacy_payload_image_ids(payload, images) do
    indices = list(fetch(payload, "imageIndices"))

    indices
    |> Enum.map(&image_id_at(images, &1))
    |> Enum.reject(&is_nil/1)
    |> Enum.uniq()
  end

  defp sync_images_in_transaction!(%Listing{} = listing) do
    data = listing.data || %{}
    desired = legacy_images(data)

    existing =
      ListingImage
      |> where([image], image.listing_id == ^listing.id)
      |> order_by([image], asc: image.position)
      |> Repo.all()

    Repo.update_all(
      from(image in ListingImage, where: image.listing_id == ^listing.id),
      set: [is_cover: false],
      inc: [position: 100_000]
    )

    {kept_ids, _available} =
      desired
      |> Enum.with_index()
      |> Enum.reduce({[], existing}, fn {attrs, position}, {kept, available} ->
        {matched, remaining} = take_matching_image(available, attrs)

        changeset =
          (matched || %ListingImage{})
          |> ListingImage.changeset(
            Map.merge(attrs, %{
              listing_id: listing.id,
              position: position,
              is_cover: attrs.is_cover
            })
          )

        image = if matched, do: Repo.update(changeset), else: Repo.insert(changeset)
        image = unwrap!(image)
        {[image.id | kept], remaining}
      end)

    if kept_ids == [] do
      Repo.delete_all(from(image in ListingImage, where: image.listing_id == ^listing.id))
    else
      Repo.delete_all(
        from(image in ListingImage,
          where: image.listing_id == ^listing.id and image.id not in ^kept_ids
        )
      )
    end
  end

  defp legacy_images(data) do
    urls = list(data["imageUrls"])
    keys = list(data["imageStorageKeys"])
    fingerprints = list(data["imageFingerprints"])
    image_count = max(length(urls), length(keys))

    {urls, image_count} =
      if image_count == 0 and present?(data["imageUrl"]) do
        {[data["imageUrl"]], 1}
      else
        {urls, image_count}
      end

    cover = normalize_cover(data["coverImageIndex"], image_count)

    if image_count == 0 do
      []
    else
      Enum.map(0..(image_count - 1), fn position ->
        %{
          source_url: string_or_nil(Enum.at(urls, position)),
          storage_key: string_or_nil(Enum.at(keys, position)),
          fingerprint: map_or_nil(Enum.at(fingerprints, position)),
          is_cover: position == cover
        }
      end)
    end
  end

  defp take_matching_image(images, attrs) do
    matcher = fn image ->
      cond do
        present?(attrs.storage_key) ->
          image.storage_key == attrs.storage_key

        fingerprint_sha(attrs.fingerprint) ->
          fingerprint_sha(image.fingerprint) == fingerprint_sha(attrs.fingerprint)

        present?(attrs.source_url) ->
          image.source_url == attrs.source_url

        true ->
          false
      end
    end

    case Enum.find_index(images, matcher) do
      nil -> {nil, images}
      index -> {Enum.at(images, index), List.delete_at(images, index)}
    end
  end

  defp insert_default_environments!(listing) do
    data = listing.data || %{}

    defaults =
      [
        %{kind: "exterior", name: "Área externa"},
        %{kind: "livingRoom", name: "Sala"},
        %{kind: "kitchen", name: "Cozinha"}
      ] ++
        numbered_defaults("bedroom", "Quarto", data["bedrooms"]) ++
        numbered_defaults("bathroom", "Banheiro", data["bathrooms"]) ++
        if(positive_integer(data["parkingSpots"]) > 0,
          do: [%{kind: "garage", name: "Garagem"}],
          else: []
        )

    defaults
    |> Enum.with_index()
    |> Enum.each(fn {attrs, position} ->
      %ListingEnvironment{}
      |> ListingEnvironment.changeset(
        Map.merge(attrs, %{listing_id: listing.id, position: position, source: "manual"})
      )
      |> Repo.insert!()
    end)

    sync_legacy_environments!(listing.id)
  end

  defp numbered_defaults(kind, name, value) do
    count = positive_integer(value)

    if count == 0,
      do: [],
      else: Enum.map(1..count, &%{kind: kind, name: "#{name} #{&1}", ordinal: &1})
  end

  defp replace_assignments!(environment, image_ids) do
    Repo.delete_all(
      from(assignment in ListingEnvironmentImage,
        where: assignment.environment_id == ^environment.id
      )
    )

    image_ids
    |> Enum.with_index()
    |> Enum.each(fn {image_id, position} ->
      Repo.delete_all(
        from(assignment in ListingEnvironmentImage, where: assignment.image_id == ^image_id)
      )

      %ListingEnvironmentImage{}
      |> ListingEnvironmentImage.changeset(%{
        environment_id: environment.id,
        image_id: image_id,
        position: position
      })
      |> Repo.insert()
      |> unwrap!()
    end)
  end

  defp attrs_image_ids(attrs, listing_id) do
    images = list_images(listing_id)
    image_ids = fetch(attrs, "imageIds")
    indices = fetch(attrs, "imageIndices")

    ids =
      cond do
        is_list(image_ids) -> image_ids
        is_list(indices) -> Enum.map(indices, fn index -> image_id_at(images, index) end)
        true -> []
      end

    valid_ids = MapSet.new(Enum.map(images, & &1.id))

    ids
    |> Enum.map(&valid_uuid/1)
    |> Enum.reject(&is_nil/1)
    |> Enum.uniq()
    |> tap(fn normalized ->
      if length(normalized) != length(ids) or
           Enum.any?(normalized, &(not MapSet.member?(valid_ids, &1))) do
        Repo.rollback(:invalid_image_ids)
      end
    end)
  end

  defp validate_replace_payload!(environments, listing_id) do
    unless Enum.all?(environments, &is_map/1), do: Repo.rollback(:invalid_environments)

    requested_ids =
      environments |> Enum.map(&valid_uuid(fetch(&1, "id"))) |> Enum.reject(&is_nil/1)

    if length(requested_ids) != length(Enum.uniq(requested_ids)),
      do: Repo.rollback(:duplicate_environment_ids)

    assigned_ids = Enum.flat_map(environments, &attrs_image_ids(&1, listing_id))

    if length(assigned_ids) != length(Enum.uniq(assigned_ids)),
      do: Repo.rollback(:duplicate_image_assignment)
  end

  defp sync_legacy_environments!(listing_id) do
    listing = Repo.get!(Listing, listing_id)
    images = list_images(listing_id)
    image_positions = Map.new(images, &{&1.id, &1.position})
    assignments = assignments_by_environment(listing_id)

    environments =
      ListingEnvironment
      |> where([environment], environment.listing_id == ^listing_id)
      |> order_by([environment], asc: environment.position)
      |> Repo.all()
      |> Enum.map(fn environment ->
        %{
          "id" => environment.id,
          "kind" => environment.kind,
          "label" => environment.name,
          "ordinal" => environment.ordinal,
          "imageIndices" =>
            assignments
            |> Map.get(environment.id, [])
            |> Enum.map(&image_positions[&1.id])
            |> Enum.reject(&is_nil/1)
        }
        |> drop_nil("ordinal")
      end)

    data = Map.put(listing.data || %{}, "imageEnvironments", environments)
    listing |> Listing.changeset(%{data: data}) |> Repo.update!()
  end

  defp assignments_by_environment(listing_id) do
    from(assignment in ListingEnvironmentImage,
      join: image in ListingImage,
      on: image.id == assignment.image_id,
      join: environment in ListingEnvironment,
      on: environment.id == assignment.environment_id,
      where: environment.listing_id == ^listing_id and image.listing_id == ^listing_id,
      order_by: [asc: assignment.position],
      select: {assignment.environment_id, image}
    )
    |> Repo.all()
    |> Enum.group_by(&elem(&1, 0), &elem(&1, 1))
  end

  defp environment_json(environment, listing_id) when is_binary(listing_id) do
    environment_json(
      environment,
      Map.get(assignments_by_environment(listing_id), environment.id, [])
    )
  end

  defp environment_json(environment, images) when is_list(images) do
    %{
      id: environment.id,
      listingId: environment.listing_id,
      kind: environment.kind,
      name: environment.name,
      label: environment.name,
      ordinal: environment.ordinal,
      position: environment.position,
      imageIds: Enum.map(images, & &1.id),
      imageIndices: Enum.map(images, & &1.position),
      images: Enum.map(images, &image_json/1),
      createdAt: datetime_to_iso(environment.created_at),
      updatedAt: datetime_to_iso(environment.updated_at)
    }
  end

  defp image_json(image) do
    %{
      id: image.id,
      listingId: image.listing_id,
      url: image_url(image),
      sourceUrl: image.source_url,
      position: image.position,
      isCover: image.is_cover,
      fingerprint: image.fingerprint,
      createdAt: datetime_to_iso(image.created_at),
      updatedAt: datetime_to_iso(image.updated_at)
    }
  end

  defp image_url(%ListingImage{storage_key: key} = image) when is_binary(key) and key != "",
    do: "/api/listings/#{image.listing_id}/images/#{image.position}"

  defp image_url(image), do: image.source_url

  defp environment_attrs(attrs) do
    kind = canonical_kind(fetch(attrs, "kind", "custom"))
    name = fetch(attrs, "name", fetch(attrs, "label", @default_names[kind] || "Outro"))

    %{
      kind: kind,
      name: name,
      ordinal: fetch(attrs, "ordinal")
    }
  end

  defp environment_patch_attrs(attrs) do
    %{}
    |> maybe_copy(attrs, "kind", fn value -> canonical_kind(value) end)
    |> maybe_copy_name(attrs)
    |> maybe_copy(attrs, "ordinal", & &1)
  end

  defp maybe_copy(target, source, key, mapper) do
    if has_key?(source, key),
      do: Map.put(target, String.to_atom(key), mapper.(fetch(source, key))),
      else: target
  end

  defp maybe_copy_name(target, source) do
    cond do
      has_key?(source, "name") -> Map.put(target, :name, fetch(source, "name"))
      has_key?(source, "label") -> Map.put(target, :name, fetch(source, "label"))
      true -> target
    end
  end

  defp canonical_kind("areaExterna"), do: "exterior"
  defp canonical_kind("sala"), do: "livingRoom"
  defp canonical_kind("cozinha"), do: "kitchen"
  defp canonical_kind("quarto"), do: "bedroom"
  defp canonical_kind("banheiro"), do: "bathroom"
  defp canonical_kind("garagem"), do: "garage"
  defp canonical_kind("varanda"), do: "balcony"
  defp canonical_kind("areaServico"), do: "utilityRoom"

  defp canonical_kind(kind)
       when kind in ~w(exterior livingRoom kitchen bedroom bathroom garage balcony utilityRoom custom),
       do: kind

  defp canonical_kind(_), do: "custom"

  defp has_image_assignment?(attrs),
    do: has_key?(attrs, "imageIds") or has_key?(attrs, "imageIndices")

  defp authorize_listing(collection_id, listing_id, profile, action) do
    user_id = Map.get(profile, :user_id) || Map.get(profile, "user_id")

    with {:ok, collection, _access} <- CollectionPolicy.authorize(user_id, collection_id, action),
         true <- active_workspace_matches?(profile, collection),
         :ok <- ensure_writable(collection.workspace_id, action),
         %Listing{} = listing <-
           Repo.get_by(Listing, id: listing_id, collection_id: collection_id) do
      {:ok, listing}
    else
      {:error, :workspace_frozen} -> {:error, :workspace_frozen}
      false -> {:error, :listing_not_found}
      _ -> {:error, :listing_not_found}
    end
  end

  defp active_workspace_matches?(profile, collection) do
    workspace_id = Map.get(profile, :workspace_id) || Map.get(profile, "workspace_id")
    is_nil(workspace_id) or workspace_id == collection.workspace_id
  end

  defp ensure_writable(_workspace_id, :view), do: :ok

  defp ensure_writable(workspace_id, _action) do
    case Entitlements.for_workspace_id(workspace_id) do
      {:ok, %{workspace_status: "active"}} -> :ok
      _ -> {:error, :workspace_frozen}
    end
  end

  defp lock_listing!(listing_id) do
    Repo.one!(from(listing in Listing, where: listing.id == ^listing_id, lock: "FOR UPDATE"))
  end

  defp next_environment_position(listing_id) do
    Repo.one(
      from(environment in ListingEnvironment,
        where: environment.listing_id == ^listing_id,
        select: coalesce(max(environment.position), -1) + 1
      )
    )
  end

  defp compact_environment_positions!(listing_id) do
    ListingEnvironment
    |> where([environment], environment.listing_id == ^listing_id)
    |> order_by([environment], asc: environment.position)
    |> Repo.all()
    |> Enum.with_index()
    |> Enum.each(fn {environment, position} ->
      environment |> Ecto.Changeset.change(position: position + 100_000) |> Repo.update!()
    end)

    Repo.update_all(
      from(environment in ListingEnvironment, where: environment.listing_id == ^listing_id),
      inc: [position: -100_000]
    )
  end

  defp refresh_area_link_snapshots!(environment) do
    Ecto.Adapters.SQL.query!(
      Repo,
      "UPDATE floor_plan_area_links SET inherited_name_snapshot = $1, updated_at = now() WHERE environment_id = $2 AND custom_name IS NULL",
      [environment.name, Ecto.UUID.dump!(environment.id)]
    )
  end

  defp preserve_area_link_names!(environment) do
    Ecto.Adapters.SQL.query!(
      Repo,
      "UPDATE floor_plan_area_links SET custom_name = COALESCE(NULLIF(btrim(custom_name), ''), NULLIF(btrim(inherited_name_snapshot), ''), $1), inherited_name_snapshot = COALESCE(NULLIF(btrim(custom_name), ''), NULLIF(btrim(inherited_name_snapshot), ''), $1), environment_id = NULL, updated_at = now() WHERE environment_id = $2",
      [environment.name, Ecto.UUID.dump!(environment.id)]
    )
  end

  defp image_id_at(images, index) when is_integer(index) and index >= 0 do
    case Enum.at(images, index) do
      nil -> nil
      image -> image.id
    end
  end

  defp image_id_at(_images, _index), do: nil

  defp valid_uuid(value) when is_binary(value) do
    case Ecto.UUID.cast(value) do
      {:ok, id} -> id
      :error -> nil
    end
  end

  defp valid_uuid(_), do: nil

  defp normalize_cover(value, count) when is_integer(value) and value >= 0 and value < count,
    do: value

  defp normalize_cover(_, _), do: 0

  defp positive_integer(value) when is_integer(value) and value > 0, do: value
  defp positive_integer(value) when is_float(value) and value > 0, do: trunc(value)
  defp positive_integer(_), do: 0

  defp fingerprint_sha(%{"sha256" => sha}) when is_binary(sha) and sha != "", do: sha
  defp fingerprint_sha(_), do: nil

  defp fetch(map, key, default \\ nil)

  defp fetch(map, key, default) when is_map(map),
    do: Map.get(map, key, Map.get(map, String.to_atom(key), default))

  defp fetch(_, _, default), do: default

  defp has_key?(map, key),
    do: is_map(map) and (Map.has_key?(map, key) or Map.has_key?(map, String.to_atom(key)))

  defp list(value) when is_list(value), do: value
  defp list(_), do: []
  defp present?(value), do: is_binary(value) and String.trim(value) != ""
  defp string_or_nil(value), do: if(present?(value), do: value, else: nil)
  defp map_or_nil(value) when is_map(value), do: value
  defp map_or_nil(_), do: nil
  defp maybe_put_id(attrs, nil), do: attrs
  defp maybe_put_id(attrs, id), do: Map.put(attrs, :id, id)
  defp drop_nil(map, key), do: if(is_nil(map[key]), do: Map.delete(map, key), else: map)
  defp unwrap!({:ok, value}), do: value
  defp unwrap!({:error, reason}), do: Repo.rollback(reason)
  defp datetime_to_iso(nil), do: nil
  defp datetime_to_iso(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp datetime_to_iso(%NaiveDateTime{} = dt), do: NaiveDateTime.to_iso8601(dt) <> "Z"
end
