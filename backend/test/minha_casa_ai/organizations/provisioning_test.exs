defmodule MinhaCasaAi.Organizations.ProvisioningTest do
  use ExUnit.Case, async: false

  import Ecto.Query

  alias MinhaCasaAi.Accounts.User
  alias MinhaCasaAi.Organizations
  alias MinhaCasaAi.Organizations.Organization
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspaces.Workspace

  setup do
    user_id = Ecto.UUID.generate()

    Repo.query!("INSERT INTO users (id, email, name) VALUES ($1, $2, $3)", [
      Ecto.UUID.dump!(user_id),
      "workspace-provisioning-#{System.unique_integer([:positive])}@example.com",
      "João Silva"
    ])

    on_exit(fn ->
      workspace_ids =
        Repo.all(from(o in Organization, where: o.owner_id == ^user_id, select: o.workspace_id))

      Repo.delete_all(from(o in Organization, where: o.owner_id == ^user_id))
      Repo.delete_all(from(w in Workspace, where: w.id in ^workspace_ids))
      Repo.delete_all(from(u in User, where: u.id == ^user_id))
    end)

    %{user_id: user_id}
  end

  test "provisions one family idempotently", %{user_id: user_id} do
    assert {:ok, first} = Organizations.ensure_family_for_user(user_id)
    assert first.kind == "family"
    assert first.status == "active"
    assert first.role == "owner"
    assert first.name == "Família"

    assert {:ok, repeated} = Organizations.ensure_family_for_user(user_id)
    assert repeated.id == first.id
  end

  test "provisions one frozen agency idempotently", %{user_id: user_id} do
    assert {:ok, first} = Organizations.ensure_agency_for_owner(user_id)
    assert first.kind == "agency"
    assert first.status == "frozen"
    assert first.role == "owner"
    assert first.name == "Imobiliária"

    assert {:ok, repeated} = Organizations.ensure_agency_for_owner(user_id)
    assert repeated.id == first.id
  end

  test "renames an agency and its workspace together", %{user_id: user_id} do
    assert {:ok, agency} = Organizations.ensure_agency_for_owner(user_id)
    assert {:ok, renamed} = Organizations.rename_agency(agency, "Imobiliária Central")

    assert renamed.name == "Imobiliária Central"
    assert Repo.get!(Workspace, agency.workspace_id).name == "Imobiliária Central"
    assert {:error, :invalid_name} = Organizations.rename_agency(renamed, " ")
  end
end
