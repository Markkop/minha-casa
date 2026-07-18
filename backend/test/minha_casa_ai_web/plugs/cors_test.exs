defmodule MinhaCasaAiWeb.Plugs.CorsTest do
  use ExUnit.Case, async: false

  import Plug.Conn
  import Plug.Test

  alias MinhaCasaAiWeb.Plugs.Cors

  setup do
    previous = Application.get_env(:minha_casa_ai, :cors_origins)
    Application.put_env(:minha_casa_ai, :cors_origins, ["http://localhost:5173"])

    on_exit(fn ->
      if is_nil(previous) do
        Application.delete_env(:minha_casa_ai, :cors_origins)
      else
        Application.put_env(:minha_casa_ai, :cors_origins, previous)
      end
    end)
  end

  test "preflight permits the workspace context header" do
    conn =
      conn(:options, "/api/profiles")
      |> put_req_header("origin", "http://localhost:5173")
      |> put_req_header("access-control-request-method", "GET")
      |> put_req_header("access-control-request-headers", "authorization,x-workspace-id")
      |> Cors.call([])

    assert conn.status == 204
    assert get_resp_header(conn, "access-control-allow-origin") == ["http://localhost:5173"]

    assert get_resp_header(conn, "access-control-allow-headers") == [
             "authorization, content-type, x-workspace-id, x-organization-id"
           ]
  end
end
