defmodule MinhaCasaAi.Financeiro.SharedSnapshotsTest do
  use ExUnit.Case, async: false

  import Ecto.Query

  alias MinhaCasaAi.Financeiro.{SharedSnapshot, SharedSnapshots}
  alias MinhaCasaAi.Repo

  setup do
    user_id = Ecto.UUID.generate()
    email = "financeiro-snapshot-#{System.unique_integer([:positive])}@example.com"

    Ecto.Adapters.SQL.query!(
      Repo,
      """
      INSERT INTO users (id, email, name)
      VALUES ($1, $2, $3)
      """,
      [Ecto.UUID.dump!(user_id), email, "Financeiro Snapshot Test"]
    )

    on_exit(fn ->
      Repo.delete_all(from s in SharedSnapshot, where: s.user_id == ^user_id)

      Ecto.Adapters.SQL.query!(Repo, "DELETE FROM organizations WHERE owner_id = $1", [
        Ecto.UUID.dump!(user_id)
      ])

      Ecto.Adapters.SQL.query!(Repo, "DELETE FROM users WHERE id = $1", [
        Ecto.UUID.dump!(user_id)
      ])
    end)

    %{user_id: user_id}
  end

  test "creates a static snapshot for a personal profile", %{user_id: user_id} do
    assert {:ok, snapshot} =
             SharedSnapshots.create_snapshot(%{user_id: user_id, org_id: nil}, %{
               "title" => "Minha análise",
               "payload" => %{
                 "version" => 1,
                 "params" => %{"valorImovel" => 1_500_000, "linkedListingId" => nil},
                 "settings" => %{}
               }
             })

    assert snapshot.user_id == user_id
    assert snapshot.org_id == nil
    assert snapshot.title == "Minha análise"
    assert snapshot.payload["version"] == 1
    assert is_binary(snapshot.token)
  end

  test "creates a static snapshot for an organization profile", %{user_id: user_id} do
    org_id = Ecto.UUID.generate()

    Ecto.Adapters.SQL.query!(
      Repo,
      """
      INSERT INTO organizations (id, name, slug, owner_id)
      VALUES ($1, $2, $3, $4)
      """,
      [
        Ecto.UUID.dump!(org_id),
        "Financeiro Org",
        "financeiro-org-#{System.unique_integer([:positive])}",
        Ecto.UUID.dump!(user_id)
      ]
    )

    assert {:ok, snapshot} =
             SharedSnapshots.create_snapshot(%{user_id: nil, org_id: org_id}, %{
               title: "Org snapshot",
               payload: %{version: 1, params: %{}, settings: %{}}
             })

    assert snapshot.user_id == nil
    assert snapshot.org_id == org_id
  end

  test "returns public snapshots by token without owner fields", %{user_id: user_id} do
    assert {:ok, snapshot} =
             SharedSnapshots.create_snapshot(%{user_id: user_id, org_id: nil}, %{
               "title" => "Público",
               "payload" => %{"version" => 1, "params" => %{}, "settings" => %{}}
             })

    assert SharedSnapshots.get_public_snapshot(snapshot.token).id == snapshot.id

    public = SharedSnapshots.public_json(snapshot)
    assert public.title == "Público"
    assert public.token == snapshot.token
    refute Map.has_key?(public, :user_id)
    refute Map.has_key?(public, :org_id)
    refute Map.has_key?(public, :id)
  end

  test "returns nil for blank and missing tokens" do
    assert SharedSnapshots.get_public_snapshot("") == nil
    assert SharedSnapshots.get_public_snapshot("missing-token") == nil
  end

  test "rejects payloads without version 1", %{user_id: user_id} do
    assert {:error, changeset} =
             SharedSnapshots.create_snapshot(%{user_id: user_id, org_id: nil}, %{
               "title" => "Inválido",
               "payload" => %{"version" => 2}
             })

    assert "version must be 1" in errors_on(changeset).payload
  end

  defp errors_on(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {message, _opts} -> message end)
  end
end
