defmodule MinhaCasaAi.PortalSearches.UrlCanonicalizer do
  @moduledoc false

  def canonicalize(url) when is_binary(url) do
    uri = URI.parse(String.trim(url))

    query =
      case uri.query do
        nil ->
          nil

        q ->
          q
          |> URI.decode_query()
          |> Map.drop([
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_term",
            "utm_content",
            "fbclid",
            "gclid"
          ])
          |> Enum.sort_by(fn {k, _} -> k end)
          |> URI.encode_query()
      end

    host = uri.host |> to_string() |> String.downcase()

    uri
    |> Map.put(:scheme, uri.scheme || "https")
    |> Map.put(:host, host)
    |> Map.put(:query, if(query == "", do: nil, else: query))
    |> Map.put(:fragment, nil)
    |> URI.to_string()
  end
end
