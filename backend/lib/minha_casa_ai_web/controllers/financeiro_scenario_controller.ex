defmodule MinhaCasaAiWeb.FinanceiroScenarioController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Financeiro.{Scenario, Scenarios}

  def index(conn, %{"id" => collection_id}) do
    profile = current_profile(conn)

    case Scenarios.list(collection_id, profile) do
      {:ok, scenarios} ->
        json(conn, %{scenarios: Enum.map(scenarios, &Scenarios.json/1)})

      {:error, :collection_not_found} ->
        not_found(conn, "Collection")
    end
  end

  def create(conn, %{"id" => collection_id} = params) do
    profile = current_profile(conn)

    case Scenarios.create(collection_id, profile, params) do
      {:ok, %Scenario{} = scenario} ->
        conn |> put_status(:created) |> json(%{scenario: Scenarios.json(scenario)})

      {:error, :collection_not_found} ->
        not_found(conn, "Collection")

      {:error, %Ecto.Changeset{} = changeset} ->
        changeset_error(conn, changeset)
    end
  end

  def update(conn, %{"id" => collection_id, "scenario_id" => scenario_id} = params) do
    profile = current_profile(conn)

    case Scenarios.update(collection_id, scenario_id, profile, params) do
      {:ok, %Scenario{} = scenario} ->
        json(conn, %{scenario: Scenarios.json(scenario)})

      {:error, :collection_not_found} ->
        not_found(conn, "Collection")

      {:error, :scenario_not_found} ->
        not_found(conn, "Scenario")

      {:error, %Ecto.Changeset{} = changeset} ->
        changeset_error(conn, changeset)
    end
  end

  def delete(conn, %{"id" => collection_id, "scenario_id" => scenario_id}) do
    profile = current_profile(conn)

    case Scenarios.delete(collection_id, scenario_id, profile) do
      {:ok, _scenario} ->
        json(conn, %{success: true})

      {:error, :collection_not_found} ->
        not_found(conn, "Collection")

      {:error, :scenario_not_found} ->
        not_found(conn, "Scenario")
    end
  end

  def import_shared(conn, %{"id" => collection_id} = params) do
    profile = current_profile(conn)

    case Scenarios.import_shared(collection_id, profile, params) do
      {:ok, %Scenario{} = scenario} ->
        conn |> put_status(:created) |> json(%{scenario: Scenarios.json(scenario)})

      {:error, :collection_not_found} ->
        not_found(conn, "Collection")

      {:error, :snapshot_not_found} ->
        not_found(conn, "Financeiro snapshot")

      {:error, %Ecto.Changeset{} = changeset} ->
        changeset_error(conn, changeset)
    end
  end

  defp current_profile(conn) do
    %{user_id: conn.assigns[:current_user_id], org_id: conn.assigns[:current_org_id]}
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

  defp not_found(conn, name),
    do: conn |> put_status(:not_found) |> json(%{error: "#{name} not found"})
end
