defmodule MinhaCasaAiWeb.Plugs.RequireSubscription do
  @moduledoc """
  Resolves effective workspace entitlements and enforces frozen read-only mode.

  Free is a real entitlement, not the absence of a subscription.
  """

  import Plug.Conn
  import Phoenix.Controller

  alias MinhaCasaAi.Entitlements

  def init(opts), do: opts

  def call(conn, _opts) do
    entitlement = Entitlements.for_workspace(conn.assigns.current_workspace)
    conn = assign(conn, :current_entitlement, entitlement)

    cond do
      conn.assigns[:current_workspace_access] == "external" and not external_route_allowed?(conn) ->
        conn
        |> put_status(:forbidden)
        |> json(%{error: "External access is limited to granted collections"})
        |> halt()

      entitlement.workspace_status == "active" or safe_method?(conn.method) ->
        conn

      true ->
        conn
        |> put_status(:locked)
        |> json(%{error: "Workspace is read-only", code: "workspace_frozen"})
        |> halt()
    end
  end

  defp safe_method?(method), do: method in ["GET", "HEAD", "OPTIONS"]

  defp external_route_allowed?(%Plug.Conn{request_path: "/api/collections"}), do: true

  defp external_route_allowed?(%Plug.Conn{request_path: "/api/collections/" <> _}), do: true

  defp external_route_allowed?(%Plug.Conn{
         request_path: "/api/workspace/comparison-notes"
       }),
       do: true

  defp external_route_allowed?(%Plug.Conn{method: "GET", request_path: path}) do
    Regex.match?(~r{^/api/(?:workspace/)?listings/[^/]+/images/\d+$}, path)
  end

  defp external_route_allowed?(_conn), do: false
end
