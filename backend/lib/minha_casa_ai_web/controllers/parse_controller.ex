defmodule MinhaCasaAiWeb.ParseController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Integrations.ListingParser
  alias MinhaCasaAi.Listings.DisplayTitle

  def create(conn, params) do
    input = Map.merge(conn.body_params, params)

    case ListingParser.parse(input) do
      {:ok, listings} ->
        json(conn, %{listings: DisplayTitle.apply_to_listings(listings)})

      {:error, reason} ->
        {status, message} = map_error(reason)

        conn
        |> put_status(status)
        |> json(%{error: message})
    end
  end

  defp map_error(:invalid_request),
    do: {:bad_request, "Invalid request. Provide kind: text|image|pdf|url or rawText."}

  defp map_error(:empty_text), do: {:bad_request, "Raw text cannot be empty"}
  defp map_error(:invalid_url), do: {:bad_request, "Informe uma URL válida (http ou https)."}

  defp map_error(:unsupported_image_type),
    do: {:bad_request, "Unsupported image type. Use JPEG, PNG, or WebP."}

  defp map_error(:file_too_large), do: {:bad_request, "Arquivo muito grande."}
  defp map_error(:empty_file), do: {:bad_request, "Arquivo vazio"}
  defp map_error(:invalid_base64), do: {:bad_request, "Dados do arquivo inválidos"}

  defp map_error(:pdf_tool_unavailable),
    do: {:service_unavailable, "Leitura de PDF indisponível no servidor no momento."}

  defp map_error(:pdf_text_too_short),
    do:
      {:bad_request,
       "Não foi possível extrair texto deste PDF. Tente enviar uma captura de tela."}

  defp map_error(:pdf_extract_failed),
    do: {:bad_request, "Não foi possível ler o PDF. Verifique se o arquivo está íntegro."}

  defp map_error(:openai_not_configured),
    do: {:service_unavailable, "OpenAI API key not configured on server"}

  defp map_error(:scrapingant_not_configured),
    do: {:service_unavailable, "Serviço de extração por link não está configurado."}

  defp map_error(:openai_rate_limited),
    do: {:too_many_requests, "OpenAI rate limit exceeded. Please try again later."}

  defp map_error(:scrapingant_rate_limited),
    do:
      {:too_many_requests,
       "Limite de requisições da extração por link excedido. Tente mais tarde."}

  defp map_error(:invalid_ai_json), do: {:internal_server_error, "Invalid JSON response from AI"}
  defp map_error(:empty_ai_response), do: {:internal_server_error, "Empty response from AI"}

  defp map_error(:scraped_content_too_short),
    do:
      {:bad_request,
       "Não foi possível extrair conteúdo suficiente desta página. Cole o texto do anúncio ou tente outro link."}

  defp map_error(:scrapingant_no_credits),
    do: {:payment_required, "Créditos da API de extração esgotados. Tente mais tarde."}

  defp map_error(:openai_timeout),
    do: {:gateway_timeout, "A extração demorou demais. Tente novamente em instantes."}

  defp map_error(:openai_unauthorized), do: {:service_unavailable, "Invalid OpenAI API key"}

  defp map_error(:scrapingant_unauthorized),
    do: {:service_unavailable, "Chave da API de extração inválida ou sem permissão."}

  defp map_error(:scrapingant_unavailable),
    do: {:bad_gateway, "Serviço de extração temporariamente indisponível. Tente novamente."}

  defp map_error(:scrapingant_network_error),
    do: {:bad_gateway, "Falha de rede ao buscar o anúncio. Tente novamente."}

  defp map_error(:scrapingant_request_failed),
    do:
      {:bad_gateway,
       "Não foi possível acessar o link do anúncio. Verifique a URL ou cole o texto do anúncio."}

  defp map_error(:portal_blocked),
    do:
      {:bad_request,
       "O site bloqueou a extração automática. Cole o texto do anúncio ou use captura de tela."}

  defp map_error(reason), do: {:internal_server_error, "Failed to parse listing: #{reason}"}
end
