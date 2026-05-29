defmodule MinhaCasaAi.PortalSearches.ShortListings do
  @moduledoc false

  import Ecto.Query

  alias MinhaCasaAi.PortalSearches.{Cache, ShortListing, ShortListingRunHit}
  alias MinhaCasaAi.Repo

  def fresh?(%ShortListing{} = listing, now \\ DateTime.utc_now()) do
    is_struct(listing.expires_at, DateTime) and DateTime.compare(listing.expires_at, now) == :gt
  end

  def get_by_source(portal, source_url) do
    Repo.one(
      from s in ShortListing,
        where: s.portal == ^portal and s.source_url == ^source_url
    )
  end

  def upsert_many!(run_id, target_id, portal, cards, opts \\ []) do
    now = DateTime.utc_now()
    expires = Cache.expires_at(now)
    refresh? = Keyword.get(opts, :refresh, false)

    cards
    |> Enum.filter(fn card ->
      url = card["listingUrl"] || card["source_url"]
      is_binary(url) and url != ""
    end)
    |> Enum.with_index(1)
    |> Enum.map(fn {card, rank} ->
      attrs = normalize_card(portal, card, now, expires)
      existing = get_by_source(portal, attrs.source_url)

      {listing, origin} =
        cond do
          existing && fresh?(existing, now) && not refresh? ->
            updated =
              existing
              |> ShortListing.changeset(%{last_seen_at: now})
              |> Repo.update!()

            {updated, "listing_cache"}

          existing ->
            existing
            |> ShortListing.changeset(attrs)
            |> Repo.update!()

            {existing, "fresh"}

          true ->
            listing =
              %ShortListing{}
              |> ShortListing.changeset(attrs)
              |> Repo.insert!()

            {listing, "fresh"}
        end

      %ShortListingRunHit{}
      |> ShortListingRunHit.changeset(%{
        portal_search_run_id: run_id,
        short_listing_id: listing.id,
        portal_search_target_id: target_id,
        rank: rank,
        cache_origin: origin
      })
      |> Repo.insert(on_conflict: :nothing)

      {listing, origin}
    end)
  end

  def record_hits_from_page!(run_id, target_id, listings_with_rank) do
    Enum.each(listings_with_rank, fn {listing, rank} ->
      %ShortListingRunHit{}
      |> ShortListingRunHit.changeset(%{
        portal_search_run_id: run_id,
        short_listing_id: listing.id,
        portal_search_target_id: target_id,
        rank: rank,
        cache_origin: "page_cache"
      })
      |> Repo.insert(on_conflict: :nothing)
    end)
  end

  def list_for_run(run_id, filters \\ %{}) do
    query =
      from h in ShortListingRunHit,
        join: s in ShortListing,
        on: s.id == h.short_listing_id,
        where: h.portal_search_run_id == ^run_id,
        select: %{
          id: s.id,
          portal: s.portal,
          source_url: s.source_url,
          title: s.title,
          bairro: s.bairro,
          cidade: s.cidade,
          uf: s.uf,
          tipo_imovel: s.tipo_imovel,
          quartos: s.quartos,
          banheiros: s.banheiros,
          vagas: s.vagas,
          suites: s.suites,
          area_total: s.area_total,
          area_privada: s.area_privada,
          preco: s.preco,
          preco_condominio: s.preco_condominio,
          preco_m2: s.preco_m2,
          amenidades: s.amenidades,
          thumbnail_url: s.thumbnail_url,
          posted_at: s.posted_at,
          rank: h.rank,
          cache_origin: h.cache_origin
        },
        order_by: [asc: h.rank]

    query
    |> apply_filters(filters)
    |> Repo.all()
  end

  defp apply_filters(query, filters) when map_size(filters) == 0, do: query

  defp apply_filters(query, filters) do
    Enum.reduce(filters, query, fn
      {"portal", portal}, q when is_binary(portal) ->
        from [h, s] in q, where: s.portal == ^portal

      {"bairro", bairro}, q when is_binary(bairro) ->
        from [h, s] in q, where: s.bairro == ^bairro

      {"quartos", quartos}, q when is_integer(quartos) ->
        from [h, s] in q, where: s.quartos == ^quartos

      _, q ->
        q
    end)
  end

  defp normalize_card(portal, card, now, expires) when is_map(card) do
    preco = to_float(card["price"] || card["preco"])
    area_privada = to_float(card["areaPrivate"] || card["area_privada"])
    area_total = to_float(card["areaTotal"] || card["area_total"])
    area = area_privada || area_total

    preco_m2 =
      if is_number(preco) and is_number(area) and area > 0 do
        preco / area
      else
        nil
      end

    %{
      portal: portal,
      source_url: card["listingUrl"] || card["source_url"] || card["listing_url"],
      title: card["title"],
      bairro: card["neighborhood"] || card["bairro"],
      cidade: card["city"] || card["cidade"],
      uf: card["uf"],
      tipo_imovel: card["propertyType"] || card["tipo_imovel"],
      quartos: to_int(card["bedrooms"] || card["quartos"]),
      banheiros: to_int(card["bathrooms"] || card["banheiros"]),
      vagas: to_int(card["parkingSpots"] || card["vagas"]),
      suites: to_int(card["suites"]),
      area_total: area_total,
      area_privada: area_privada,
      preco: preco,
      preco_condominio: to_float(card["condoFee"] || card["preco_condominio"]),
      preco_m2: preco_m2,
      amenidades: List.wrap(card["amenities"] || card["amenidades"]),
      thumbnail_url: card["thumbnailUrl"] || card["thumbnail_url"],
      posted_at: parse_datetime(card["postedAt"] || card["posted_at"]),
      raw_card: card,
      first_seen_at: now,
      last_seen_at: now,
      last_extracted_at: now,
      expires_at: expires
    }
  end

  defp to_int(nil), do: nil
  defp to_int(n) when is_integer(n), do: n
  defp to_int(n) when is_float(n), do: trunc(n)

  defp to_int(n) when is_binary(n) do
    case Integer.parse(n) do
      {i, _} -> i
      :error -> nil
    end
  end

  defp to_int(_), do: nil

  defp to_float(nil), do: nil
  defp to_float(n) when is_number(n), do: n * 1.0

  defp to_float(n) when is_binary(n) do
    case Float.parse(n) do
      {f, _} -> f
      :error -> nil
    end
  end

  defp to_float(_), do: nil

  defp parse_datetime(nil), do: nil

  defp parse_datetime(value) when is_binary(value) do
    case DateTime.from_iso8601(value) do
      {:ok, dt, _} -> dt
      _ -> nil
    end
  end

  defp parse_datetime(%DateTime{} = dt), do: dt
  defp parse_datetime(_), do: nil
end
