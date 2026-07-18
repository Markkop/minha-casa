defmodule MinhaCasaAiWeb.ParseController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.{AiUsage, Entitlements, Workspaces}
  alias MinhaCasaAi.Integrations.ListingParser
  alias MinhaCasaAi.Listings.DisplayTitle
  alias MinhaCasaAi.Organizations.Organization
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspace.{ListingFeatures, Profile}

  def create(conn, params) do
    input = Map.merge(conn.body_params, params)
    catalog = catalog_for(conn)

    with {:ok, workspace_access} <- workspace_access(conn),
         entitlement = Entitlements.for_workspace(workspace_access.workspace),
         {:ok, %{reservation: reservation, alert: alert}} <-
           AiUsage.reserve(entitlement, conn.assigns[:current_user_id],
             access: workspace_access.access,
             collection_id: blank_to_nil(input["collectionId"]),
             idempotency_key: idempotency_key(conn, input)
           ) do
      case ListingParser.parse(input,
             catalog: catalog,
             workspace_id: workspace_access.workspace.id
           ) do
        {:ok, listings} ->
          {:ok, _} = AiUsage.consume(reservation)
          json(conn, %{listings: DisplayTitle.apply_to_listings(listings), usageAlert: alert})

        {:error, reason} ->
          {:ok, _} = AiUsage.release(reservation, %{"reason" => inspect(reason)})
          {status, message} = map_error(reason)

          conn
          |> put_status(status)
          |> json(%{error: message})
      end
    else
      {:error, :limit_reached} ->
        conn
        |> put_status(:too_many_requests)
        |> json(%{
          error: "O parsing está temporariamente indisponível para este perfil.",
          usageAlert: "limit_reached"
        })

      {:error, :parsing_forbidden} ->
        conn
        |> put_status(:forbidden)
        |> json(%{error: "Parsing não está disponível neste perfil."})

      {:error, _} ->
        conn |> put_status(:forbidden) |> json(%{error: "Workspace inválido para parsing."})
    end
  end

  defp workspace_access(%{assigns: %{current_workspace: workspace}} = conn) do
    {:ok, %{workspace: workspace, access: conn.assigns[:current_workspace_access] || "owner"}}
  end

  defp workspace_access(conn) do
    workspace_id =
      case conn.assigns[:current_org_id] && Repo.get(Organization, conn.assigns[:current_org_id]) do
        %Organization{workspace_id: id} -> id
        _ -> nil
      end

    Workspaces.resolve_access(conn.assigns[:current_user_id], workspace_id)
  end

  defp idempotency_key(conn, input) do
    conn |> get_req_header("x-idempotency-key") |> List.first() ||
      blank_to_nil(input["idempotencyKey"]) || Ecto.UUID.generate()
  end

  defp blank_to_nil(value) when is_binary(value) do
    case String.trim(value) do
      "" -> nil
      trimmed -> trimmed
    end
  end

  defp blank_to_nil(_), do: nil

  defp catalog_for(conn) do
    case Profile.profile_from_headers(
           conn.assigns[:current_user_id],
           conn.assigns[:current_org_id],
           conn.assigns[:current_workspace_id]
         ) do
      {:error, :missing_profile} -> ListingFeatures.default_system_options()
      profile -> ListingFeatures.list_catalog(profile)
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
  defp map_error(:attachment_not_found), do: {:not_found, "Attachment não encontrado"}
  defp map_error(:object_not_found), do: {:not_found, "Arquivo do attachment não encontrado"}
  defp map_error(:missing_workspace), do: {:bad_request, "Workspace is required"}

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
