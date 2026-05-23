defmodule MinhaCasaAiWeb.Plugs.InternalAuth do
  import Plug.Conn
  import Phoenix.Controller

  alias MinhaCasaAi.Config

  def init(opts), do: opts

  def call(conn, _opts) do
    configured_secret = Config.internal_api_secret()
    auth_secret = bearer_token(conn)

    cond do
      configured_secret && auth_secret != configured_secret ->
        conn |> put_status(:unauthorized) |> json(%{error: "Unauthorized"}) |> halt()

      true ->
        conn
        |> assign(:current_user_id, get_req_header(conn, "x-minha-casa-user-id") |> List.first())
        |> assign(:current_org_id, get_req_header(conn, "x-minha-casa-org-id") |> List.first())
    end
  end

  defp bearer_token(conn) do
    conn
    |> get_req_header("authorization")
    |> List.first()
    |> case do
      "Bearer " <> token -> token
      _ -> nil
    end
  end
end
