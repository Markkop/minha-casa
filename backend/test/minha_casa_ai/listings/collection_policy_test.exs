defmodule MinhaCasaAi.Listings.CollectionPolicyTest do
  use ExUnit.Case, async: false

  import Ecto.Query

  alias MinhaCasaAi.Accounts.User
  alias MinhaCasaAi.Listings.{Collection, CollectionAccessGrant, CollectionPolicy}
  alias MinhaCasaAi.Workspaces.Workspace
  alias MinhaCasaAi.{Repo, Workspaces}

  setup do
    owner = insert_user("owner")
    viewer = insert_user("viewer")
    editor = insert_user("editor")
    {:ok, workspace} = Workspaces.ensure_personal_workspace(owner.id)

    collection =
      %Collection{}
      |> Collection.changeset(%{
        user_id: owner.id,
        workspace_id: workspace.id,
        created_by_user_id: owner.id,
        responsible_user_id: owner.id,
        name: "Grant policy"
      })
      |> Repo.insert!()

    viewer_grant = insert_grant(collection, owner, viewer, "viewer")
    editor_grant = insert_grant(collection, owner, editor, "editor")

    on_exit(fn ->
      Repo.delete_all(from(g in CollectionAccessGrant, where: g.collection_id == ^collection.id))
      Repo.delete_all(from(c in Collection, where: c.id == ^collection.id))
      Repo.delete_all(from(w in Workspace, where: w.id == ^workspace.id))

      Repo.delete_all(from(u in User, where: u.id in ^[owner.id, viewer.id, editor.id]))
    end)

    %{
      collection: collection,
      workspace: workspace,
      owner: owner,
      viewer: viewer,
      editor: editor,
      viewer_grant: viewer_grant,
      editor_grant: editor_grant
    }
  end

  test "viewer and editor receive only their allowed collection capabilities", context do
    assert {:ok, _, "owner"} =
             CollectionPolicy.authorize(context.owner.id, context.collection.id, :manage)

    assert {:ok, _, "viewer"} =
             CollectionPolicy.authorize(context.viewer.id, context.collection.id, :view)

    assert {:error, :forbidden} =
             CollectionPolicy.authorize(context.viewer.id, context.collection.id, :edit_existing)

    assert {:ok, _, "editor"} =
             CollectionPolicy.authorize(context.editor.id, context.collection.id, :edit_existing)

    assert {:error, :forbidden} =
             CollectionPolicy.authorize(context.editor.id, context.collection.id, :add_listing)

    assert {:error, :forbidden} =
             CollectionPolicy.authorize(context.editor.id, context.collection.id, :manage)
  end

  test "a professional or personal origin resolves as an external profile", context do
    assert {:ok, %{access: "external", workspace: workspace}} =
             Workspaces.resolve_access(context.viewer.id, context.workspace.id)

    assert workspace.id == context.workspace.id
  end

  test "revoked grants stop authorizing immediately", context do
    context.viewer_grant
    |> CollectionAccessGrant.changeset(%{
      status: "revoked",
      revoked_at: DateTime.utc_now(:second)
    })
    |> Repo.update!()

    assert {:error, :forbidden} =
             CollectionPolicy.authorize(context.viewer.id, context.collection.id, :view)
  end

  defp insert_user(prefix) do
    id = Ecto.UUID.generate()

    Repo.query!("INSERT INTO users (id, email, name) VALUES ($1, $2, $3)", [
      Ecto.UUID.dump!(id),
      "#{prefix}-#{System.unique_integer([:positive])}@example.com",
      prefix
    ])

    Repo.get!(User, id)
  end

  defp insert_grant(collection, owner, user, role) do
    %CollectionAccessGrant{}
    |> CollectionAccessGrant.changeset(%{
      collection_id: collection.id,
      user_id: user.id,
      role: role,
      granted_by_user_id: owner.id
    })
    |> Repo.insert!()
  end
end
