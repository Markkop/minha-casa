defmodule MinhaCasaAiWeb.FinanceiroSnapshotController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Financeiro.SharedSnapshot
  alias MinhaCasaAi.Financeiro.SharedSnapshots

  def create(conn, params) do
    profile = %{user_id: conn.assigns[:current_user_id], org_id: conn.assigns[:current_org_id]}

    case SharedSnapshots.create_snapshot(profile, params) do
      {:ok, %SharedSnapshot{} = snapshot} ->
        conn
        |> put_status(:created)
        |> json(%{
          snapshot: SharedSnapshots.public_json(snapshot),
          shareUrl: SharedSnapshots.share_url(snapshot)
        })

      {:error, %Ecto.Changeset{} = changeset} ->
        changeset_error(conn, changeset)
    end
  end

  def show(conn, %{"token" => token}) do
    case SharedSnapshots.get_public_snapshot(token) do
      %SharedSnapshot{} = snapshot ->
        json(conn, %{snapshot: SharedSnapshots.public_json(snapshot)})

      nil ->
        conn |> put_status(:not_found) |> json(%{error: "Financeiro snapshot not found"})
    end
  end

  defp changeset_error(conn, %Ecto.Changeset{} = changeset) do
    conn |> put_status(:bad_request) |> json(%{error: first_changeset_error(changeset)})
  end

  defp first_changeset_error(%Ecto.Changeset{} = changeset) do
    changeset
    |> Ecto.Changeset.traverse_errors(fn {msg, _} -> msg end)
    |> Enum.map(fn {field, msgs} -> "#{field} #{Enum.join(msgs, ", ")}" end)
    |> List.first()
    |> case do
      nil -> "Invalid data"
      msg -> msg
    end
  end
end
