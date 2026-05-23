defmodule MinhaCasaAiWeb.Plugs.RawBodyReader do
  @moduledoc """
  Caches the raw request body for webhook signature verification.
  """

  def read_body(conn, opts) do
    case Plug.Conn.read_body(conn, opts) do
      {:ok, body, conn} ->
        conn = update_in(conn.assigns[:raw_body], &[body | &1 || []])
        {:ok, body, conn}

      {:more, _partial, conn} ->
        {:ok, "", conn}

      {:error, reason} ->
        {:error, reason}
    end
  end
end
