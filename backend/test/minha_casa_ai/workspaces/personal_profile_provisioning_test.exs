defmodule MinhaCasaAi.Workspaces.PersonalProfileProvisioningTest do
  use ExUnit.Case, async: false

  import Ecto.Query

  alias MinhaCasaAi.Accounts.User
  alias MinhaCasaAi.Listings.{Collection, Collections}
  alias MinhaCasaAi.Organizations
  alias MinhaCasaAi.Organizations.{Organization, OrganizationMember}
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspaces
  alias MinhaCasaAi.Workspaces.Workspace

  setup do
    suffix = System.unique_integer([:positive])

    user =
      Repo.insert!(%User{
        email: "personal-profile-#{suffix}@example.com",
        name: "Personal Profile #{suffix}"
      })

    on_exit(fn ->
      workspace_ids =
        Repo.all(from(w in Workspace, where: w.owner_user_id == ^user.id, select: w.id))

      organization_ids =
        Repo.all(from(o in Organization, where: o.owner_id == ^user.id, select: o.id))

      organization_workspace_ids =
        Repo.all(
          from(o in Organization, where: o.id in ^organization_ids, select: o.workspace_id)
        )

      all_workspace_ids = workspace_ids ++ organization_workspace_ids

      Repo.delete_all(
        from(c in Collection,
          where: c.workspace_id in ^all_workspace_ids
        )
      )

      Repo.delete_all(from(m in OrganizationMember, where: m.org_id in ^organization_ids))
      Repo.delete_all(from(o in Organization, where: o.id in ^organization_ids))

      Repo.delete_all(from(w in Workspace, where: w.id in ^all_workspace_ids))

      Repo.delete_all(from(u in User, where: u.id == ^user.id))
    end)

    %{user: user}
  end

  test "personal profile discovery creates one correctly owned starter collection", %{user: user} do
    workspace = Workspaces.personal_for(user.id)
    assert %Workspace{type: "personal", owner_user_id: owner_id} = workspace
    assert owner_id == user.id

    assert [collection] = collections_for(workspace.id)
    assert collection.user_id == user.id
    assert collection.org_id == nil
    assert collection.created_by_user_id == user.id
    assert collection.responsible_user_id == user.id
    assert collection.visibility == "private"
    assert collection.status == "active"
    assert collection.is_default
    assert collection.name == Collections.default_collection_name()

    assert workspace.id == Workspaces.personal_for(user.id).id
    assert [same_collection] = collections_for(workspace.id)
    assert same_collection.id == collection.id
  end

  test "provisioning promotes the oldest active collection and demotes archived defaults", %{
    user: user
  } do
    {:ok, workspace} = Workspaces.ensure_personal_workspace(user.id)

    archived = insert_collection!(workspace, user, "Archived default", true, "archived")
    active = insert_collection!(workspace, user, "Existing active", false, "active")

    assert workspace.id == Workspaces.personal_for(user.id).id

    assert Repo.get!(Collection, active.id).is_default
    refute Repo.get!(Collection, archived.id).is_default
    assert length(collections_for(workspace.id)) == 2
  end

  test "provisioning creates an active starter when only archived collections exist", %{
    user: user
  } do
    {:ok, workspace} = Workspaces.ensure_personal_workspace(user.id)
    archived = insert_collection!(workspace, user, "Archived default", true, "archived")

    assert workspace.id == Workspaces.personal_for(user.id).id

    refute Repo.get!(Collection, archived.id).is_default

    assert [starter] =
             Repo.all(
               from(c in Collection,
                 where:
                   c.workspace_id == ^workspace.id and c.status == "active" and
                     c.is_default == true
               )
             )

    assert starter.name == Collections.default_collection_name()
  end

  test "concurrent personal profile provisioning remains idempotent", %{user: user} do
    1..4
    |> Task.async_stream(
      fn _ -> Workspaces.ensure_personal_profile(user.id) end,
      max_concurrency: 4,
      ordered: false,
      timeout: 15_000
    )
    |> Enum.each(fn result -> assert {:ok, {:ok, %Workspace{}}} = result end)

    assert Repo.aggregate(
             from(w in Workspace,
               where: w.owner_user_id == ^user.id and w.type == "personal"
             ),
             :count
           ) == 1

    workspace = Repo.get_by!(Workspace, owner_user_id: user.id, type: "personal")
    assert [collection] = collections_for(workspace.id)
    assert collection.is_default
  end

  test "legacy organization helper creates a workspace-owned team default", %{user: user} do
    assert {:ok, organization} =
             Organizations.create(user.id, %{
               "name" => "Provisioning Family",
               "kind" => "family"
             })

    collection = Collections.ensure_default_collection!(user.id, organization.id)

    assert collection.workspace_id == organization.workspace_id
    assert collection.user_id == nil
    assert collection.org_id == organization.id
    assert collection.created_by_user_id == user.id
    assert collection.responsible_user_id == user.id
    assert collection.visibility == "team"
    assert collection.is_default
    assert collection.id == Collections.ensure_default_collection!(user.id, organization.id).id
  end

  test "an explicitly requested workspace owned by another user remains forbidden", %{user: user} do
    suffix = System.unique_integer([:positive])

    other_user =
      Repo.insert!(%User{
        email: "other-workspace-owner-#{suffix}@example.com",
        name: "Other Workspace Owner #{suffix}"
      })

    {:ok, other_workspace} = Workspaces.ensure_personal_workspace(other_user.id)

    assert {:error, :forbidden} = Workspaces.resolve_access(user.id, other_workspace.id)

    Repo.delete!(other_workspace)
    Repo.delete!(other_user)
  end

  defp collections_for(workspace_id) do
    Repo.all(
      from(c in Collection,
        where: c.workspace_id == ^workspace_id,
        order_by: [asc: c.created_at, asc: c.id]
      )
    )
  end

  defp insert_collection!(workspace, user, name, is_default, status) do
    %Collection{}
    |> Collection.changeset(%{
      workspace_id: workspace.id,
      user_id: user.id,
      org_id: nil,
      created_by_user_id: user.id,
      responsible_user_id: user.id,
      name: name,
      visibility: "private",
      is_default: is_default,
      status: status
    })
    |> Repo.insert!()
  end
end
