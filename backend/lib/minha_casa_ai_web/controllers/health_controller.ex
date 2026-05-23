defmodule MinhaCasaAiWeb.HealthController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Repo

  def show(conn, _params) do
    db =
      case Ecto.Adapters.SQL.query(Repo, "select 1", []) do
        {:ok, _} -> "ok"
        {:error, _} -> "error"
      end

    status = if db == "ok", do: :ok, else: :service_unavailable

    conn
    |> put_status(status)
    |> json(%{status: Atom.to_string(status), db: db})
  end
end
