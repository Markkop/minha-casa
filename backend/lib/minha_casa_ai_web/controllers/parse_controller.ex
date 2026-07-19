defmodule MinhaCasaAiWeb.ParseController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.{AiUsage, Entitlements, Workspaces}
  alias MinhaCasaAi.Integrations.ListingParser
  alias MinhaCasaAi.Listings.DisplayTitle
  alias MinhaCasaAi.Organizations.Organization
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspace.{ListingFeatures, Profile}
  alias MinhaCasaAiWeb.PublicError

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
          map_error(conn, reason)
      end
    else
      {:error, :limit_reached} ->
        payload =
          PublicError.build_payload(
            "A leitura automática está temporariamente indisponível neste perfil."
          )
          |> Map.put(:usageAlert, "limit_reached")

        conn
        |> put_status(:too_many_requests)
        |> json(payload)

      {:error, :parsing_forbidden} ->
        PublicError.json_error(conn, :forbidden, :parsing_forbidden)

      {:error, _} ->
        PublicError.json_error(conn, :forbidden, :invalid_request)
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

  defp map_error(conn, :invalid_request),
    do:
      PublicError.json_error(
        conn,
        :bad_request,
        "Informe texto, imagem, PDF ou link do anúncio."
      )

  defp map_error(conn, :empty_text),
    do: PublicError.json_error(conn, :bad_request, :empty_text)

  defp map_error(conn, :invalid_url),
    do: PublicError.json_error(conn, :bad_request, :invalid_url)

  defp map_error(conn, :unsupported_image_type),
    do:
      PublicError.json_error(
        conn,
        :bad_request,
        "Formato de imagem não suportado. Use JPEG, PNG ou WebP."
      )

  defp map_error(conn, :file_too_large),
    do: PublicError.json_error(conn, :bad_request, :file_too_large)

  defp map_error(conn, :empty_file),
    do: PublicError.json_error(conn, :bad_request, :empty_file)

  defp map_error(conn, :invalid_base64),
    do: PublicError.json_error(conn, :bad_request, :invalid_base64)

  defp map_error(conn, :attachment_not_found),
    do: PublicError.json_error(conn, :not_found, "Arquivo não encontrado.")

  defp map_error(conn, :object_not_found),
    do: PublicError.json_error(conn, :not_found, "Arquivo não encontrado.")

  defp map_error(conn, :missing_workspace),
    do: PublicError.json_error(conn, :bad_request, :missing_profile)

  defp map_error(conn, :pdf_tool_unavailable),
    do:
      PublicError.json_error(
        conn,
        :service_unavailable,
        "Leitura de PDF indisponível no momento. Tente novamente mais tarde."
      )

  defp map_error(conn, :pdf_text_too_short),
    do:
      PublicError.json_error(
        conn,
        :bad_request,
        "Não foi possível extrair texto deste PDF. Tente enviar uma captura de tela."
      )

  defp map_error(conn, :pdf_extract_failed),
    do:
      PublicError.json_error(
        conn,
        :bad_request,
        "Não foi possível ler o PDF. Verifique se o arquivo está íntegro."
      )

  defp map_error(conn, :openai_not_configured),
    do:
      PublicError.json_error(
        conn,
        :service_unavailable,
        "A leitura automática está temporariamente indisponível."
      )

  defp map_error(conn, :scrapingant_not_configured),
    do:
      PublicError.json_error(
        conn,
        :service_unavailable,
        "A extração por link está temporariamente indisponível."
      )

  defp map_error(conn, :openai_rate_limited),
    do:
      PublicError.json_error(
        conn,
        :too_many_requests,
        "Muitas solicitações em sequência. Tente novamente em instantes."
      )

  defp map_error(conn, :scrapingant_rate_limited),
    do:
      PublicError.json_error(
        conn,
        :too_many_requests,
        "Muitas solicitações em sequência. Tente novamente em instantes."
      )

  defp map_error(conn, :invalid_ai_json),
    do:
      PublicError.json_error(
        conn,
        :internal_server_error,
        "Não foi possível interpretar o anúncio. Tente novamente."
      )

  defp map_error(conn, :empty_ai_response),
    do:
      PublicError.json_error(
        conn,
        :internal_server_error,
        "Não foi possível interpretar o anúncio. Tente novamente."
      )

  defp map_error(conn, :scraped_content_too_short),
    do:
      PublicError.json_error(
        conn,
        :bad_request,
        "Não foi possível extrair conteúdo suficiente desta página. Cole o texto do anúncio ou tente outro link."
      )

  defp map_error(conn, :scrapingant_no_credits),
    do:
      PublicError.json_error(
        conn,
        :payment_required,
        "A extração por link está temporariamente indisponível. Tente mais tarde."
      )

  defp map_error(conn, :openai_timeout),
    do:
      PublicError.json_error(
        conn,
        :gateway_timeout,
        "A extração demorou demais. Tente novamente em instantes."
      )

  defp map_error(conn, :openai_unauthorized),
    do:
      PublicError.json_error(
        conn,
        :service_unavailable,
        "A leitura automática está temporariamente indisponível."
      )

  defp map_error(conn, :scrapingant_unauthorized),
    do:
      PublicError.json_error(
        conn,
        :service_unavailable,
        "A extração por link está temporariamente indisponível."
      )

  defp map_error(conn, :scrapingant_unavailable),
    do:
      PublicError.json_error(
        conn,
        :bad_gateway,
        "Serviço de extração temporariamente indisponível. Tente novamente."
      )

  defp map_error(conn, :scrapingant_network_error),
    do:
      PublicError.json_error(
        conn,
        :bad_gateway,
        "Falha de rede ao buscar o anúncio. Tente novamente."
      )

  defp map_error(conn, :scrapingant_request_failed),
    do:
      PublicError.json_error(
        conn,
        :bad_gateway,
        "Não foi possível acessar o link do anúncio. Verifique a URL ou cole o texto do anúncio."
      )

  defp map_error(conn, :portal_blocked),
    do:
      PublicError.json_error(
        conn,
        :bad_request,
        "O site bloqueou a extração automática. Cole o texto do anúncio ou use captura de tela."
      )

  defp map_error(conn, reason),
    do: PublicError.json_error(conn, :internal_server_error, reason)
end
