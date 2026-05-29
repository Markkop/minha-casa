defmodule MinhaCasaAi.PortalSearches.Cache do
  @moduledoc false

  import Ecto.Query

  alias MinhaCasaAi.Config
  alias MinhaCasaAi.PortalSearches.CachedSearchPage
  alias MinhaCasaAi.Repo

  def ttl_days, do: Config.portal_search_cache_ttl_days()

  def expires_at(now \\ DateTime.utc_now()) do
    DateTime.add(now, ttl_days() * 86_400, :second)
  end

  def fresh?(%CachedSearchPage{} = page, now \\ DateTime.utc_now()) do
    page.extraction_status == "ok" and
      is_struct(page.expires_at, DateTime) and
      DateTime.compare(page.expires_at, now) == :gt
  end

  def get_page(portal, canonical_url) do
    Repo.one(
      from p in CachedSearchPage,
        where: p.portal == ^portal and p.canonical_url == ^canonical_url
    )
  end

  def upsert_page!(attrs) do
    now = DateTime.utc_now()

    attrs =
      attrs
      |> Map.put_new(:scraped_at, now)
      |> Map.put_new(:expires_at, expires_at(now))

    case get_page(attrs.portal, attrs.canonical_url) do
      nil ->
        %CachedSearchPage{}
        |> CachedSearchPage.changeset(Map.new(attrs))
        |> Repo.insert!()

      page ->
        page
        |> CachedSearchPage.changeset(Map.new(attrs))
        |> Repo.update!()
    end
  end

  def mark_extracted!(page, attrs) do
    page
    |> CachedSearchPage.changeset(
      Map.merge(attrs, %{
        extracted_at: DateTime.utc_now(),
        extraction_status: "ok"
      })
    )
    |> Repo.update!()
  end

  def sweep_expired! do
    now = DateTime.utc_now()

    {count, _} =
      Repo.delete_all(from p in CachedSearchPage, where: p.expires_at < ^now)

    count
  end
end
