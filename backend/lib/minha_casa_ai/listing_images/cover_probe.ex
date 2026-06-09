defmodule MinhaCasaAi.ListingImages.CoverProbe do
  @moduledoc """
  Downloads the cover/preview image of an incoming listing and fingerprints it,
  so the fingerprint can be compared against existing listings' galleries as a
  duplicate-detection signal.
  """

  alias MinhaCasaAi.ListingImages.Fingerprint

  @max_bytes 5 * 1024 * 1024
  @timeout 8_000

  @doc """
  Returns `{:ok, fingerprint}` for the listing's cover image candidate, or
  `:error` when no usable cover URL exists or the download/fingerprint fails.
  """
  def fingerprint(data) when is_map(data) do
    case cover_url(data) do
      nil -> :error
      url -> fingerprint_url(url)
    end
  end

  def fingerprint(_), do: :error

  def fingerprint_url(url) when is_binary(url) do
    with {:ok, %{status: status, body: body}} when status in 200..299 and is_binary(body) <-
           Req.get(url,
             finch: MinhaCasaAi.Finch,
             receive_timeout: @timeout,
             max_redirects: 5,
             headers: [{"user-agent", "MinhaCasa/1.0"}]
           ),
         true <- byte_size(body) > 0 and byte_size(body) <= @max_bytes,
         {:ok, fingerprint} <- Fingerprint.from_bytes(body) do
      {:ok, fingerprint}
    else
      _ -> :error
    end
  end

  @doc """
  Picks the cover image URL candidate from listing data: the scraped
  `coverImageUrl` (og:image) when present, otherwise the first image URL.
  """
  def cover_url(data) when is_map(data) do
    [data["coverImageUrl"] | List.wrap(data["imageUrls"]) ++ [data["imageUrl"]]]
    |> Enum.find(&public_http_url?/1)
  end

  def cover_url(_), do: nil

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
end
