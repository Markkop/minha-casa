defmodule MinhaCasaAiWeb.ShortLinkController do
  use MinhaCasaAiWeb, :controller

  import Ecto.Query

  alias MinhaCasaAi.Listings.{Listing, ListingShortLink}
  alias MinhaCasaAi.Repo
  alias MinhaCasaAiWeb.PublicError

  def show(conn, %{"short_id" => short_id}) do
    normalized = short_id |> to_string() |> String.trim() |> String.downcase()

    if Regex.match?(~r/^[a-z0-9]{4,12}$/, normalized) do
      resolve_short_link(conn, normalized)
    else
      PublicError.json_error(conn, :not_found, :not_found, context: :link)
    end
  end

  defp resolve_short_link(conn, short_id) do
    query =
      from s in ListingShortLink,
        join: l in Listing,
        on: l.id == s.listing_id,
        where: s.short_id == ^short_id,
        select: %{
          listing_id: s.listing_id,
          collection_id: s.collection_id,
          data: l.data
        }

    case Repo.one(query) do
      nil ->
        PublicError.json_error(conn, :not_found, :not_found, context: :link)

      row ->
        json(conn, %{
          listingId: row.listing_id,
          collectionId: row.collection_id,
          redirectTo: redirect_target(row)
        })
    end
  end

  defp redirect_target(%{listing_id: listing_id, data: data}) do
    data = data || %{}
    link = data["sourceUrl"] || data["link"]

    if valid_http_url?(link) do
      String.trim(link)
    else
      "/imoveis/#{listing_id}"
    end
  end

  defp valid_http_url?(link) when is_binary(link) do
    uri = link |> String.trim() |> URI.parse()
    uri.scheme in ["http", "https"] and is_binary(uri.host) and uri.host != ""
  end

  defp valid_http_url?(_), do: false
end
