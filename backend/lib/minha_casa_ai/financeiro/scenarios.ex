defmodule MinhaCasaAi.Financeiro.Scenarios do
  @moduledoc """
  Persisted Financeiro simulator scenarios scoped by collection/profile.
  """

  import Ecto.Query

  alias MinhaCasaAi.Financeiro.{Scenario, SharedSnapshot, SharedSnapshots}
  alias MinhaCasaAi.Listings
  alias MinhaCasaAi.Repo

  def list(collection_id, profile) do
    with {:ok, _collection} <- authorize_collection(collection_id, profile) do
      scenarios =
        Scenario
        |> where([s], s.collection_id == ^collection_id)
        |> order_by([s], asc: s.created_at)
        |> Repo.all()

      {:ok, scenarios}
    end
  end

  def create(collection_id, profile, attrs) when is_map(attrs) do
    with {:ok, _collection} <- authorize_collection(collection_id, profile) do
      %Scenario{}
      |> Scenario.changeset(%{
        collection_id: collection_id,
        name: attrs |> Map.get("name", Map.get(attrs, :name, "Cenário")),
        payload: stringify_keys(Map.get(attrs, "payload", Map.get(attrs, :payload, %{})))
      })
      |> Repo.insert()
    end
  end

  def update(collection_id, scenario_id, profile, attrs) when is_map(attrs) do
    with {:ok, _collection} <- authorize_collection(collection_id, profile),
         %Scenario{} = scenario <- get_in_collection(collection_id, scenario_id) do
      scenario
      |> Scenario.rename_changeset(%{
        name: attrs |> Map.get("name", Map.get(attrs, :name, scenario.name))
      })
      |> Repo.update()
    else
      nil -> {:error, :scenario_not_found}
      {:error, _} = error -> error
    end
  end

  def delete(collection_id, scenario_id, profile) do
    with {:ok, _collection} <- authorize_collection(collection_id, profile),
         %Scenario{} = scenario <- get_in_collection(collection_id, scenario_id) do
      Repo.delete(scenario)
    else
      nil -> {:error, :scenario_not_found}
      {:error, _} = error -> error
    end
  end

  def import_shared(collection_id, profile, attrs) when is_map(attrs) do
    token = attrs |> Map.get("token", Map.get(attrs, :token, "")) |> string()

    with {:ok, _collection} <- authorize_collection(collection_id, profile),
         true <- token != "",
         %SharedSnapshot{} = snapshot <- SharedSnapshots.get_public_snapshot(token) do
      create(collection_id, profile, %{
        "name" => import_name(attrs, snapshot),
        "payload" => snapshot.payload || %{}
      })
    else
      false -> {:error, :snapshot_not_found}
      nil -> {:error, :snapshot_not_found}
      {:error, _} = error -> error
    end
  end

  def json(%Scenario{} = scenario) do
    %{
      id: scenario.id,
      collectionId: scenario.collection_id,
      name: scenario.name,
      capturedAt: scenario.created_at,
      createdAt: scenario.created_at,
      updatedAt: scenario.updated_at,
      payload: scenario.payload || %{}
    }
  end

  defp authorize_collection(collection_id, profile) do
    Listings.get_collection(collection_id, profile.user_id, profile.org_id)
  end

  defp get_in_collection(collection_id, scenario_id) do
    Scenario
    |> where([s], s.id == ^scenario_id and s.collection_id == ^collection_id)
    |> Repo.one()
  end

  defp import_name(attrs, %SharedSnapshot{} = snapshot) do
    case string(Map.get(attrs, "name", Map.get(attrs, :name, ""))) do
      "" -> snapshot.title || "Simulação financeira"
      name -> name
    end
  end

  defp stringify_keys(value) when is_map(value) do
    Map.new(value, fn {key, val} -> {to_string(key), stringify_keys(val)} end)
  end

  defp stringify_keys(value) when is_list(value), do: Enum.map(value, &stringify_keys/1)
  defp stringify_keys(value), do: value

  defp string(value) when is_binary(value), do: String.trim(value)
  defp string(_), do: ""
end
