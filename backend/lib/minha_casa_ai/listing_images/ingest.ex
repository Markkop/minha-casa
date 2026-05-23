defmodule MinhaCasaAi.ListingImages.Ingest do
  alias MinhaCasaAi.Integrations.ScrapingAnt
  alias MinhaCasaAi.ListingImages.Storage
  alias MinhaCasaAi.Listings
  alias MinhaCasaAi.Listings.Listing
  alias MinhaCasaAi.Repo

  @max_images 40
  @max_bytes 5 * 1024 * 1024
  @download_timeout 30_000

  def run(listing_id, collection_id) when is_binary(listing_id) and is_binary(collection_id) do
    case Repo.get_by(Listing, id: listing_id, collection_id: collection_id) do
      %Listing{} = listing ->
        run_for_listing(listing)

      nil ->
        mark_failed(collection_id, listing_id, "Imóvel não encontrado")
        {:error, :listing_not_found}
    end
  end

  defp run_for_listing(%Listing{id: listing_id, collection_id: collection_id, data: data}) do
    data = data || %{}
    link =
      case Map.get(data, "link") do
        s when is_binary(s) -> String.trim(s)
        _ -> ""
      end

    cond do
      link == "" ->
        mark_failed(collection_id, listing_id, "Este imóvel não tem link do anúncio.")
        {:error, :missing_link}

      true ->
        case ScrapingAnt.scrape_url(link) do
          {:ok, scraped} ->
            urls = top_image_urls(scraped.image_urls)

            cond do
              urls == [] ->
                mark_failed(collection_id, listing_id, "Nenhuma imagem encontrada no anúncio.")
                {:error, :no_images_found}

              true ->
                {keys, paths} = download_and_store(listing_id, urls)

                if keys == [] do
                  mark_failed(
                    collection_id,
                    listing_id,
                    "Não foi possível baixar as imagens do anúncio."
                  )

                  {:error, :download_failed}
                else
                  persist_success(collection_id, listing_id, keys, paths)
                  :ok
                end
            end

          {:error, :scrapingant_not_configured} ->
            mark_failed(collection_id, listing_id, "Serviço de scraping não configurado.")
            {:error, :scrapingant_not_configured}

          {:error, reason} when is_atom(reason) ->
            mark_failed(collection_id, listing_id, scrape_error_message(reason))
            {:error, reason}
        end
    end
  end

  defp top_image_urls(urls) when is_list(urls) do
    urls
    |> Enum.sort_by(&ScrapingAnt.image_url_score/1, :desc)
    |> Enum.take(@max_images)
  end

  defp download_and_store(listing_id, urls) do
    {keys, paths} =
      urls
      |> Enum.with_index()
      |> Enum.reduce({[], []}, fn {url, index}, {keys, paths} ->
        case download_image(url) do
          {:ok, bytes, content_type} ->
            case Storage.put_listing_image(listing_id, index, bytes, content_type) do
              {:ok, key} ->
                {keys ++ [key], paths ++ [build_image_path(listing_id, index)]}

              {:error, _} ->
                {keys, paths}
            end

          :error ->
            {keys, paths}
        end
      end)

    {keys, paths}
  end

  defp download_image(url) when is_binary(url) do
    case Req.get(url,
           finch: MinhaCasaAi.Finch,
           receive_timeout: @download_timeout,
           max_redirects: 5,
           headers: [{"user-agent", "MinhaCasa/1.0"}]
         ) do
      {:ok, %{status: status, body: body, headers: headers}}
      when status in 200..299 and is_binary(body) and byte_size(body) > 0 and
             byte_size(body) <= @max_bytes ->
        content_type = content_type_from_headers(headers) || guess_content_type(url)
        {:ok, body, content_type}

      _ ->
        :error
    end
  end

  defp content_type_from_headers(headers) when is_list(headers) do
    Enum.find_value(headers, fn
      {key, value} when is_binary(key) and is_binary(value) ->
        if String.downcase(key) == "content-type" do
          value |> String.split(";") |> List.first() |> String.trim()
        end

      _ ->
        nil
    end)
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

  defp persist_success(collection_id, listing_id, keys, paths) do
    Listings.update_listing(collection_id, listing_id, %{
      "imageStorageKeys" => keys,
      "imageUrls" => paths,
      "imageUrl" => List.first(paths),
      "imageIngestionStatus" => "ready",
      "imageIngestionError" => nil
    })
  end

  defp mark_failed(collection_id, listing_id, message) when is_binary(message) do
    Listings.update_listing(collection_id, listing_id, %{
      "imageIngestionStatus" => "failed",
      "imageIngestionError" => message
    })
  end

  defp build_image_path(listing_id, index) do
    "/api/listings/#{listing_id}/images/#{index}"
  end

  defp scrape_error_message(:scrapingant_not_configured),
    do: "Serviço de scraping não configurado."

  defp scrape_error_message(:scrapingant_unauthorized),
    do: "ScrapingAnt: chave de API inválida."

  defp scrape_error_message(:scrapingant_no_credits),
    do: "ScrapingAnt: créditos esgotados."

  defp scrape_error_message(:scrapingant_rate_limited),
    do: "ScrapingAnt: limite de requisições atingido."

  defp scrape_error_message(:scrapingant_unavailable),
    do: "ScrapingAnt indisponível. Tente novamente."

  defp scrape_error_message(:scraped_content_too_short),
    do: "Não foi possível ler o conteúdo do anúncio."

  defp scrape_error_message(:invalid_url), do: "Link do anúncio inválido."

  defp scrape_error_message(_), do: "Erro ao buscar imagens do anúncio."
end
