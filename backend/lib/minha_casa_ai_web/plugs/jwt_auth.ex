defmodule MinhaCasaAiWeb.Plugs.JwtAuth do
  @moduledoc """
  Authenticates browser API requests with Better Auth JWT bearer tokens.
  """

  import Plug.Conn

  alias MinhaCasaAi.Auth.JWKS
  alias MinhaCasaAi.Organizations.Organization
  alias MinhaCasaAi.{PlatformRoles, Repo, Workspaces}
  alias MinhaCasaAiWeb.PublicError

  def init(opts), do: opts

  def call(conn, _opts) do
    with ["Bearer " <> token] <- get_req_header(conn, "authorization"),
         {:ok, claims} <- JWKS.verify_token(token),
         user_id when is_binary(user_id) <- claims["sub"] || claims["id"],
         {:ok, workspace_access} <- verified_workspace(conn, user_id) do
      conn
      |> assign(:current_user_id, user_id)
      |> assign(:current_workspace_id, workspace_access.workspace.id)
      |> assign(:current_workspace, workspace_access.workspace)
      |> assign(:current_workspace_access, workspace_access.access)
      |> assign(:current_org_id, workspace_access.org_id)
      |> assign(:current_user_is_admin, PlatformRoles.super_admin?(user_id))
      |> assign(:current_auth_claims, claims)
    else
      {:error, :forbidden} ->
        conn
        |> PublicError.json_error(:forbidden, :forbidden)
        |> halt()

      _ ->
        conn
        |> PublicError.json_error(:unauthorized, :unauthorized)
        |> halt()
    end
  end

  defp verified_workspace(conn, user_id) do
    workspace_id =
      conn
      |> get_req_header("x-workspace-id")
      |> List.first()
      |> blank_to_nil()

    legacy_org_id =
      conn
      |> get_req_header("x-organization-id")
      |> List.first()
      |> blank_to_nil()

    workspace_id = workspace_id || legacy_workspace_id(legacy_org_id)
    Workspaces.resolve_access(user_id, workspace_id)
  end

  defp legacy_workspace_id(nil), do: nil

  defp legacy_workspace_id(org_id) do
    case Repo.get(Organization, org_id) do
      %Organization{workspace_id: workspace_id} -> workspace_id
      _ -> "invalid"
    end
  end

  defp blank_to_nil(nil), do: nil

  defp blank_to_nil(value) when is_binary(value) do
    value = String.trim(value)
    if value == "", do: nil, else: value
  end
end
