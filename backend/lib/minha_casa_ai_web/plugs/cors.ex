defmodule MinhaCasaAiWeb.Plugs.Cors do
  @moduledoc false
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    origins = Application.get_env(:minha_casa_ai, :cors_origins, [])

    conn =
      case get_req_header(conn, "origin") do
        [origin] ->
          if Enum.member?(origins, origin) do
            conn
            |> put_resp_header("access-control-allow-origin", origin)
            |> put_resp_header("vary", "Origin")
          else
            conn
          end

        _ ->
          conn
      end

    conn =
      conn
      |> put_resp_header("access-control-allow-credentials", "true")
      |> put_resp_header("access-control-allow-methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
      |> put_resp_header(
        "access-control-allow-headers",
        "authorization, content-type, x-workspace-id, x-organization-id"
      )

    if conn.method == "OPTIONS" do
      conn |> send_resp(204, "") |> halt()
    else
      conn
    end
  end
end
