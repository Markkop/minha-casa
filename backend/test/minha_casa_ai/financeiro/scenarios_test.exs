defmodule MinhaCasaAi.Financeiro.ScenariosTest do
  use ExUnit.Case, async: false

  import Ecto.Query

  alias MinhaCasaAi.Financeiro.{Scenario, Scenarios, SharedSnapshot, SharedSnapshots}
  alias MinhaCasaAi.Listings.Collection
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspaces

  setup do
    user_id = Ecto.UUID.generate()
    other_user_id = Ecto.UUID.generate()
    org_id = Ecto.UUID.generate()
    unique = System.unique_integer([:positive])

    insert_user!(user_id, "financeiro-scenario-#{unique}@example.com")
    insert_user!(other_user_id, "financeiro-scenario-other-#{unique}@example.com")
    {:ok, personal_workspace} = Workspaces.ensure_personal_workspace(user_id)
    {:ok, other_workspace} = Workspaces.ensure_personal_workspace(other_user_id)
    org_workspace_id = Ecto.UUID.generate()

    Repo.query!(
      "INSERT INTO workspaces (id, type, name, status, created_at, updated_at) VALUES ($1, 'organization', $2, 'active', now(), now())",
      [Ecto.UUID.dump!(org_workspace_id), "Financeiro Org"]
    )

    Ecto.Adapters.SQL.query!(
      Repo,
      """
      INSERT INTO organizations (id, name, slug, owner_id, workspace_id)
      VALUES ($1, $2, $3, $4, $5)
      """,
      [
        Ecto.UUID.dump!(org_id),
        "Financeiro Org",
        "financeiro-scenario-org-#{unique}",
        Ecto.UUID.dump!(user_id),
        Ecto.UUID.dump!(org_workspace_id)
      ]
    )

    Ecto.Adapters.SQL.query!(
      Repo,
      """
      INSERT INTO organization_members (id, org_id, user_id, role)
      VALUES ($1, $2, $3, 'owner')
      """,
      [Ecto.UUID.dump!(Ecto.UUID.generate()), Ecto.UUID.dump!(org_id), Ecto.UUID.dump!(user_id)]
    )

    {:ok, personal_collection} =
      %Collection{}
      |> Collection.changeset(%{
        user_id: user_id,
        org_id: nil,
        workspace_id: personal_workspace.id,
        created_by_user_id: user_id,
        responsible_user_id: user_id,
        name: "Pessoal",
        is_default: true,
        is_public: false
      })
      |> Repo.insert()

    {:ok, org_collection} =
      %Collection{}
      |> Collection.changeset(%{
        user_id: nil,
        org_id: org_id,
        workspace_id: org_workspace_id,
        created_by_user_id: user_id,
        responsible_user_id: user_id,
        visibility: "team",
        name: "Organização",
        is_default: true,
        is_public: false
      })
      |> Repo.insert()

    on_exit(fn ->
      collection_ids = [personal_collection.id, org_collection.id]
      Repo.delete_all(from s in Scenario, where: s.collection_id in ^collection_ids)

      Repo.delete_all(
        from s in SharedSnapshot, where: s.user_id == ^user_id or s.org_id == ^org_id
      )

      Repo.delete_all(from(c in Collection, where: c.id in ^collection_ids))

      Ecto.Adapters.SQL.query!(Repo, "DELETE FROM organizations WHERE id = $1", [
        Ecto.UUID.dump!(org_id)
      ])

      Repo.delete_all(
        from(w in MinhaCasaAi.Workspaces.Workspace,
          where: w.id in ^[personal_workspace.id, other_workspace.id, org_workspace_id]
        )
      )

      Ecto.Adapters.SQL.query!(Repo, "DELETE FROM users WHERE id IN ($1, $2)", [
        Ecto.UUID.dump!(user_id),
        Ecto.UUID.dump!(other_user_id)
      ])
    end)

    %{
      user_id: user_id,
      other_user_id: other_user_id,
      org_id: org_id,
      personal_collection: personal_collection,
      org_collection: org_collection
    }
  end

  test "creates, lists, renames, and deletes scenarios in a personal collection", %{
    user_id: user_id,
    personal_collection: collection
  } do
    profile = %{user_id: user_id, org_id: nil}

    assert {:ok, scenario} =
             Scenarios.create(collection.id, profile, %{
               "name" => "Compra conservadora",
               "payload" => payload(%{"valorImovel" => 1_500_000})
             })

    assert scenario.collection_id == collection.id
    assert scenario.name == "Compra conservadora"
    assert scenario.payload["params"]["valorImovel"] == 1_500_000

    assert {:ok, [listed]} = Scenarios.list(collection.id, profile)
    assert listed.id == scenario.id

    assert {:ok, renamed} =
             Scenarios.update(collection.id, scenario.id, profile, %{"name" => "Renomeado"})

    assert renamed.name == "Renomeado"

    assert {:ok, _deleted} = Scenarios.delete(collection.id, scenario.id, profile)
    assert {:ok, []} = Scenarios.list(collection.id, profile)
  end

  test "blocks access to collections outside the active profile", %{
    other_user_id: other_user_id,
    personal_collection: collection
  } do
    other_profile = %{user_id: other_user_id, org_id: nil}

    assert {:error, :collection_not_found} =
             Scenarios.create(collection.id, other_profile, %{
               "name" => "Sem acesso",
               "payload" => payload()
             })
  end

  test "creates scenarios in an organization profile", %{
    user_id: user_id,
    org_id: org_id,
    org_collection: collection
  } do
    assert {:ok, scenario} =
             Scenarios.create(collection.id, %{user_id: user_id, org_id: org_id}, %{
               name: "Cenário da organização",
               payload: payload()
             })

    assert scenario.collection_id == collection.id
  end

  test "imports a shared snapshot into an existing collection", %{
    user_id: user_id,
    personal_collection: collection
  } do
    profile = %{user_id: user_id, org_id: nil}

    assert {:ok, snapshot} =
             SharedSnapshots.create_snapshot(profile, %{
               "title" => "Link público",
               "payload" => payload(%{"valorImovel" => 2_200_000})
             })

    assert {:ok, imported} =
             Scenarios.import_shared(collection.id, profile, %{"token" => snapshot.token})

    assert imported.name == "Link público"
    assert imported.payload["params"]["valorImovel"] == 2_200_000

    assert {:error, :snapshot_not_found} =
             Scenarios.import_shared(collection.id, profile, %{"token" => "missing"})
  end

  defp payload(params \\ %{}) do
    %{
      "version" => 1,
      "params" => Map.merge(%{"linkedListingId" => nil}, params),
      "settings" => %{"cetAdditionalCost" => 0.02}
    }
  end

  defp insert_user!(id, email) do
    Ecto.Adapters.SQL.query!(
      Repo,
      """
      INSERT INTO users (id, email, name)
      VALUES ($1, $2, $3)
      """,
      [Ecto.UUID.dump!(id), email, "Financeiro Scenario Test"]
    )
  end
end
