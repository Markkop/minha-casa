defmodule MinhaCasaAiWeb.CollectionCopyTest do
  use ExUnit.Case, async: false

  import Ecto.Query
  import Plug.Conn
  import Plug.Test

  alias MinhaCasaAi.Accounts.User
  alias MinhaCasaAi.Billing.{Plan, Subscription}
  alias MinhaCasaAi.Entitlements
  alias MinhaCasaAi.Financeiro.Scenario
  alias MinhaCasaAi.Listings.{Collection, Listing}
  alias MinhaCasaAi.Organizations
  alias MinhaCasaAi.Organizations.{Organization, OrganizationMember}
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspace.ListingComparisonNote
  alias MinhaCasaAi.Workspaces
  alias MinhaCasaAi.Workspaces.Workspace
  alias MinhaCasaAiWeb.CollectionController

  setup do
    unique = System.unique_integer([:positive])
    owner = insert_user!("collection-copy-owner-#{unique}")
    member = insert_user!("collection-copy-member-#{unique}")
    outsider = insert_user!("collection-copy-outsider-#{unique}")

    {:ok, owner_workspace} = Workspaces.ensure_personal_profile(owner.id)
    {:ok, member_workspace} = Workspaces.ensure_personal_profile(member.id)
    {:ok, outsider_workspace} = Workspaces.ensure_personal_profile(outsider.id)
    {:ok, family} = Organizations.ensure_family_for_user(owner.id)

    %OrganizationMember{}
    |> OrganizationMember.changeset(%{
      org_id: family.id,
      user_id: member.id,
      role: "member",
      joined_at: DateTime.utc_now(:second)
    })
    |> Repo.insert!()

    pro_plan = Repo.get_by!(Plan, slug: "pro")

    Repo.insert!(%Subscription{
      user_id: owner.id,
      plan_id: pro_plan.id,
      status: "active",
      starts_at: DateTime.utc_now(:second),
      expires_at: DateTime.utc_now(:second) |> DateTime.add(30, :day),
      target_workspace_id: owner_workspace.id,
      source: "manual",
      grant_reason: "test"
    })

    personal_source =
      insert_collection!(owner, owner_workspace, %{
        name: "Seleção principal",
        kind: "presentation",
        tags: ["favoritos", "centro"],
        publication_settings: %{"showAddress" => false, "theme" => "light"}
      })

    family_source =
      insert_collection!(owner, Repo.get!(Workspace, family.workspace_id), %{
        user_id: nil,
        org_id: family.id,
        name: "Escolhas da família",
        visibility: "team"
      })

    member_source = insert_collection!(member, member_workspace, %{name: "Coleção do membro"})

    outsider_source =
      insert_collection!(outsider, outsider_workspace, %{name: "Coleção externa"})

    source_listing =
      %Listing{}
      |> Listing.changeset(%{
        collection_id: personal_source.id,
        data: %{
          "title" => "Apartamento ensolarado",
          "address" => "Rua das Flores, 42",
          "price" => 950_000,
          "internalNotes" => "não deve ser copiado",
          "aiMetadata" => %{"trace" => "privado"}
        }
      })
      |> Repo.insert!()

    %ListingComparisonNote{}
    |> ListingComparisonNote.changeset(%{
      listing_id: source_listing.id,
      pros: ["Boa iluminação"],
      cons: ["Condomínio alto"],
      notes: "Visitar pela manhã"
    })
    |> Repo.insert!()

    %Scenario{}
    |> Scenario.changeset(%{
      collection_id: personal_source.id,
      name: "Entrada maior",
      payload: %{
        "version" => 1,
        "params" => %{"downPayment" => 300_000},
        "settings" => %{}
      }
    })
    |> Repo.insert!()

    workspace_ids = [
      owner_workspace.id,
      member_workspace.id,
      outsider_workspace.id,
      family.workspace_id
    ]

    user_ids = [owner.id, member.id, outsider.id]

    on_exit(fn -> cleanup!(workspace_ids, family.id, user_ids) end)

    %{
      owner: owner,
      member: member,
      outsider: outsider,
      owner_workspace: owner_workspace,
      family: family,
      personal_source: personal_source,
      family_source: family_source,
      member_source: member_source,
      outsider_source: outsider_source
    }
  end

  test "copies a personal collection to the family workspace for an owner", context do
    conn =
      copy_collection(context.owner.id, context.personal_source.id, %{
        "targetOrgId" => context.family.id,
        "newName" => "Seleção compartilhada"
      })

    assert conn.status == 200
    response = Jason.decode!(conn.resp_body)
    assert response["copiedListingsCount"] == 1

    copied = Repo.get!(Collection, response["collection"]["id"])

    assert copied.workspace_id == context.family.workspace_id
    assert copied.org_id == context.family.id
    assert copied.user_id == nil
    assert copied.created_by_user_id == context.owner.id
    assert copied.responsible_user_id == context.owner.id
    assert copied.visibility == "team"
    assert copied.name == "Seleção compartilhada"
    assert copied.kind == context.personal_source.kind
    assert copied.tags == context.personal_source.tags
    assert copied.publication_settings == context.personal_source.publication_settings
    assert copied.source_collection_id == context.personal_source.id

    refute Repo.exists?(
             from(c in Collection,
               where:
                 c.workspace_id == ^context.owner_workspace.id and
                   c.source_collection_id == ^context.personal_source.id
             )
           )

    copied_listing = Repo.one!(from(l in Listing, where: l.collection_id == ^copied.id))
    assert copied_listing.data["title"] == "Apartamento ensolarado"
    assert copied_listing.data["address"] == "Rua das Flores, 42"
    refute Map.has_key?(copied_listing.data, "internalNotes")
    refute Map.has_key?(copied_listing.data, "aiMetadata")

    copied_note = Repo.get_by!(ListingComparisonNote, listing_id: copied_listing.id)
    assert copied_note.pros == ["Boa iluminação"]
    assert copied_note.cons == ["Condomínio alto"]
    assert copied_note.notes == "Visitar pela manhã"

    copied_scenario = Repo.get_by!(Scenario, collection_id: copied.id)
    assert copied_scenario.name == "Entrada maior"
    assert copied_scenario.payload["params"]["downPayment"] == 300_000
  end

  test "copies a family collection back to the personal workspace", context do
    conn =
      copy_collection(context.owner.id, context.family_source.id, %{
        "targetOrgId" => nil
      })

    assert conn.status == 200
    response = Jason.decode!(conn.resp_body)
    assert response["copiedListingsCount"] == 0

    copied = Repo.get!(Collection, response["collection"]["id"])
    assert copied.workspace_id == context.owner_workspace.id
    assert copied.user_id == context.owner.id
    assert copied.org_id == nil
    assert copied.visibility == "private"
    assert copied.name == "Escolhas da família (cópia)"
    assert copied.source_collection_id == context.family_source.id
  end

  test "allows an organization admin to copy into the family workspace", context do
    OrganizationMember
    |> Repo.get_by!(org_id: context.family.id, user_id: context.member.id)
    |> OrganizationMember.changeset(%{role: "admin"})
    |> Repo.update!()

    conn =
      copy_collection(context.member.id, context.member_source.id, %{
        "targetOrgId" => context.family.id,
        "newName" => "Coleção do admin"
      })

    assert conn.status == 200
    response = Jason.decode!(conn.resp_body)
    copied = Repo.get!(Collection, response["collection"]["id"])

    assert copied.workspace_id == context.family.workspace_id
    assert copied.org_id == context.family.id
    assert copied.created_by_user_id == context.member.id
  end

  test "includeListings false omits listings and notes but still copies scenarios", context do
    conn =
      copy_collection(context.owner.id, context.personal_source.id, %{
        "includeListings" => false,
        "newName" => "Somente estrutura"
      })

    assert conn.status == 200
    response = Jason.decode!(conn.resp_body)
    assert response["copiedListingsCount"] == 0

    copied = Repo.get!(Collection, response["collection"]["id"])
    refute Repo.exists?(from(l in Listing, where: l.collection_id == ^copied.id))

    refute Repo.exists?(
             from(n in ListingComparisonNote,
               join: l in Listing,
               on: l.id == n.listing_id,
               where: l.collection_id == ^copied.id
             )
           )

    copied_scenario = Repo.get_by!(Scenario, collection_id: copied.id)
    assert copied_scenario.name == "Entrada maior"
    assert copied.source_collection_id == context.personal_source.id
  end

  test "rejects unauthorized and invalid organization destinations without partial copies",
       context do
    member_response =
      copy_collection(context.member.id, context.member_source.id, %{
        "targetOrgId" => context.family.id
      })

    OrganizationMember
    |> Repo.get_by!(org_id: context.family.id, user_id: context.member.id)
    |> OrganizationMember.changeset(%{role: "broker"})
    |> Repo.update!()

    broker_response =
      copy_collection(context.member.id, context.member_source.id, %{
        "targetOrgId" => context.family.id
      })

    outsider_response =
      copy_collection(context.outsider.id, context.outsider_source.id, %{
        "targetOrgId" => context.family.id
      })

    invalid_response =
      copy_collection(context.owner.id, context.personal_source.id, %{
        "targetOrgId" => Ecto.UUID.generate()
      })

    assert member_response.status == 403
    assert broker_response.status == 403
    assert outsider_response.status == 403
    assert invalid_response.status == 403

    unauthorized_source_ids = [context.member_source.id, context.outsider_source.id]

    refute Repo.exists?(
             from(c in Collection,
               where: c.source_collection_id in ^unauthorized_source_ids
             )
           )

    assert Repo.aggregate(
             from(c in Collection,
               where: c.source_collection_id == ^context.personal_source.id
             ),
             :count
           ) == 0

    inaccessible_source_response =
      copy_collection(context.outsider.id, context.personal_source.id, %{
        "targetOrgId" => context.family.id
      })

    assert inaccessible_source_response.status == 404
  end

  test "evaluates collection quota in the destination workspace", context do
    family_workspace = Repo.get!(Workspace, context.family.workspace_id)
    entitlement = Entitlements.for_workspace(family_workspace)
    limit = entitlement.limits["collectionsLimit"]

    used =
      Repo.aggregate(from(c in Collection, where: c.workspace_id == ^family_workspace.id), :count)

    available_slots = limit - used

    assert available_slots > 0

    Enum.each(1..available_slots, fn index ->
      insert_collection!(context.owner, family_workspace, %{
        user_id: nil,
        org_id: context.family.id,
        name: "Coleção de quota #{index}",
        visibility: "team"
      })
    end)

    conn =
      copy_collection(context.owner.id, context.personal_source.id, %{
        "targetOrgId" => context.family.id
      })

    assert conn.status == 422

    refute Repo.exists?(
             from(c in Collection,
               where:
                 c.workspace_id == ^family_workspace.id and
                   c.source_collection_id == ^context.personal_source.id
             )
           )
  end

  test "rejects copies into a frozen destination workspace", context do
    family_workspace = Repo.get!(Workspace, context.family.workspace_id)

    family_workspace
    |> Workspace.changeset(%{status: "frozen"})
    |> Repo.update!()

    conn =
      copy_collection(context.owner.id, context.personal_source.id, %{
        "targetOrgId" => context.family.id
      })

    assert conn.status == 423

    refute Repo.exists?(
             from(c in Collection,
               where:
                 c.workspace_id == ^family_workspace.id and
                   c.source_collection_id == ^context.personal_source.id
             )
           )
  end

  defp copy_collection(user_id, collection_id, params) do
    controller_params = Map.put(params, "id", collection_id)

    conn(:post, "/api/collections/#{collection_id}/copy")
    |> assign(:current_user_id, user_id)
    |> CollectionController.copy(controller_params)
  end

  defp insert_user!(prefix) do
    Repo.insert!(%User{
      email: "#{prefix}@example.com",
      name: prefix
    })
  end

  defp insert_collection!(user, workspace, attrs) do
    attrs =
      %{
        workspace_id: workspace.id,
        user_id: user.id,
        created_by_user_id: user.id,
        responsible_user_id: user.id
      }
      |> Map.merge(attrs)

    %Collection{}
    |> Collection.changeset(attrs)
    |> Repo.insert!()
  end

  defp cleanup!(workspace_ids, org_id, user_ids) do
    collection_ids =
      Repo.all(from(c in Collection, where: c.workspace_id in ^workspace_ids, select: c.id))

    listing_ids =
      Repo.all(from(l in Listing, where: l.collection_id in ^collection_ids, select: l.id))

    Repo.delete_all(from(n in ListingComparisonNote, where: n.listing_id in ^listing_ids))
    Repo.delete_all(from(s in Scenario, where: s.collection_id in ^collection_ids))
    Repo.delete_all(from(l in Listing, where: l.id in ^listing_ids))
    Repo.delete_all(from(c in Collection, where: c.id in ^collection_ids))
    Repo.delete_all(from(s in Subscription, where: s.user_id in ^user_ids))
    Repo.delete_all(from(m in OrganizationMember, where: m.org_id == ^org_id))
    Repo.delete_all(from(o in Organization, where: o.id == ^org_id))
    Repo.delete_all(from(w in Workspace, where: w.id in ^workspace_ids))
    Repo.delete_all(from(u in User, where: u.id in ^user_ids))
  end
end
