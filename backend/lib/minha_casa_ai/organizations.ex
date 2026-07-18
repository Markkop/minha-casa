defmodule MinhaCasaAi.Organizations do
  import Ecto.Query

  alias MinhaCasaAi.Accounts.User
  alias MinhaCasaAi.Billing.{Plan, Subscription}
  alias MinhaCasaAi.Listings.{Collection, Listing}
  alias MinhaCasaAi.Organizations.{Organization, OrganizationInvite, OrganizationMember}
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Retention
  alias MinhaCasaAi.Workspaces.Workspace

  @invite_ttl_days 7
  @invite_token_bytes 24

  def list_for_user(user_id) do
    OrganizationMember
    |> where([m], m.user_id == ^user_id)
    |> join(:inner, [m], o in Organization, on: o.id == m.org_id)
    |> order_by([m, o], asc: o.name)
    |> select([m, o], %{organization: o, role: m.role, joined_at: m.joined_at})
    |> Repo.all()
    |> Enum.map(fn row ->
      row.organization
      |> Map.put(:role, row.role)
      |> Map.put(:joined_at, row.joined_at)
      |> Map.merge(counts(row.organization.id))
    end)
  end

  def get_for_user(id, user_id) do
    with %Organization{} = org <- Repo.get(Organization, id),
         %OrganizationMember{} = membership <- get_membership(user_id, id) do
      {:ok,
       org
       |> Map.put(:role, membership.role)
       |> Map.put(:joined_at, membership.joined_at)
       |> Map.merge(counts(id))}
    else
      nil -> {:error, :not_found}
    end
  end

  def get_membership(user_id, org_id) when is_binary(user_id) and is_binary(org_id) do
    Repo.get_by(OrganizationMember, user_id: user_id, org_id: org_id)
  end

  def get_membership(_, _), do: nil

  def member?(user_id, org_id), do: match?(%OrganizationMember{}, get_membership(user_id, org_id))

  def create(user_id, attrs) do
    name = attrs |> Map.get("name", "") |> string()
    kind = attrs |> Map.get("kind", "family") |> string()
    provided_slug = attrs |> Map.get("slug", "") |> string()
    slug = if provided_slug == "", do: slugify(name), else: slugify(provided_slug)

    if name == "" or slug == "" or kind not in ["family", "agency"] do
      {:error, :invalid}
    else
      if kind == "family" and family_membership_exists?(user_id) do
        {:error, :family_membership_exists}
      else
        Repo.transaction(fn ->
          initial_status = if kind == "agency", do: "frozen", else: "active"

          workspace =
            %Workspace{}
            |> Workspace.changeset(%{type: "organization", name: name, status: initial_status})
            |> Repo.insert!()

          org =
            %Organization{}
            |> Organization.changeset(%{
              name: name,
              slug: unique_slug(slug),
              owner_id: user_id,
              workspace_id: workspace.id,
              kind: kind,
              status: initial_status,
              billing_owner_user_id: user_id,
              sponsor_user_id: if(kind == "family", do: user_id, else: nil),
              settings: if(kind == "family", do: %{"sponsorUserId" => user_id}, else: %{})
            })
            |> Repo.insert!()

          %OrganizationMember{}
          |> OrganizationMember.changeset(%{
            org_id: org.id,
            user_id: user_id,
            role: "owner",
            joined_at: DateTime.utc_now()
          })
          |> Repo.insert!()

          :ok = Retention.initialize_workspace(workspace)

          org
          |> Map.put(:role, "owner")
          |> Map.put(:joined_at, DateTime.utc_now())
          |> Map.merge(counts(org.id))
        end)
      end
    end
  end

  def ensure_family_for_user(user_id) when is_binary(user_id) do
    case Enum.find(list_for_user(user_id), &(&1.kind == "family")) do
      %Organization{} = family ->
        {:ok, family}

      nil ->
        with %User{} <- Repo.get(User, user_id) do
          create(user_id, %{"name" => "Família", "kind" => "family"})
        else
          nil -> {:error, :not_found}
        end
    end
  end

  def ensure_agency_for_owner(user_id) when is_binary(user_id) do
    agency =
      Repo.one(
        from(o in Organization,
          where:
            o.kind == "agency" and
              (o.owner_id == ^user_id or o.billing_owner_user_id == ^user_id),
          order_by: [asc: o.created_at],
          limit: 1
        )
      )

    case agency do
      %Organization{} = existing ->
        get_for_user(existing.id, user_id)

      nil ->
        with %User{} <- Repo.get(User, user_id) do
          create(user_id, %{
            "name" => "Imobiliária",
            "kind" => "agency"
          })
        else
          nil -> {:error, :not_found}
        end
    end
  end

  def rename_agency(%Organization{kind: "agency"} = organization, name) do
    name = string(name)

    if String.length(name) in 2..100 do
      Repo.transaction(fn ->
        updated =
          organization
          |> Organization.update_changeset(%{name: name})
          |> Repo.update!()

        Workspace
        |> Repo.get!(organization.workspace_id)
        |> Workspace.changeset(%{name: name})
        |> Repo.update!()

        updated
      end)
    else
      {:error, :invalid_name}
    end
  end

  def list_members(org_id) do
    OrganizationMember
    |> where([m], m.org_id == ^org_id)
    |> join(:inner, [m], u in User, on: u.id == m.user_id)
    |> order_by([m, u], asc: u.name)
    |> select([m, u], %{
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      user_name: u.name,
      user_email: u.email,
      user_image: u.image
    })
    |> Repo.all()
  end

  def add_member(org_id, email, role) when role in ["owner", "admin", "member", "broker"] do
    email = email |> string() |> String.downcase()

    Repo.transaction(fn ->
      org =
        Organization
        |> where([organization], organization.id == ^org_id)
        |> lock("FOR UPDATE")
        |> Repo.one()

      user = Repo.get_by(User, email: email)

      with %Organization{} <- org,
           :ok <- validate_role_for_kind(org.kind, role),
           %User{} <- user,
           :ok <- ensure_family_membership_available(org, user.id),
           :ok <- ensure_seat_available(org),
           nil <- get_membership(user.id, org_id),
           {:ok, member} <-
             %OrganizationMember{}
             |> OrganizationMember.changeset(%{
               org_id: org_id,
               user_id: user.id,
               role: role,
               joined_at: DateTime.utc_now()
             })
             |> Repo.insert() do
        member_with_user(member, user)
      else
        nil when is_nil(org) -> Repo.rollback(:not_found)
        nil when is_nil(user) -> Repo.rollback(:user_not_found)
        %OrganizationMember{} -> Repo.rollback(:already_member)
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
    |> case do
      {:ok, member} -> {:ok, member}
      {:error, reason} -> {:error, reason}
    end
  end

  def add_member(_, _, _), do: {:error, :invalid_role}

  def update_member_role(org_id, user_id, role)
      when role in ["owner", "admin", "member", "broker"] do
    org = Repo.get(Organization, org_id)

    with %Organization{} <- org,
         :ok <- validate_role_for_kind(org.kind, role) do
      case get_membership(user_id, org_id) do
        nil ->
          {:error, :not_found}

        member ->
          member
          |> OrganizationMember.changeset(%{role: role})
          |> Repo.update()
          |> case do
            {:ok, updated} ->
              user = Repo.get!(User, updated.user_id)
              {:ok, member_with_user(updated, user)}

            error ->
              error
          end
      end
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def update_member_role(_, _, _), do: {:error, :invalid_role}

  def remove_member(org_id, user_id) do
    org = Repo.get(Organization, org_id)

    case get_membership(user_id, org_id) do
      nil ->
        {:error, :not_found}

      member ->
        Repo.transaction(fn ->
          if org && org.kind == "agency" do
            from(c in Collection,
              where: c.workspace_id == ^org.workspace_id and c.responsible_user_id == ^user_id
            )
            |> Repo.update_all(
              set: [responsible_user_id: nil, updated_at: DateTime.utc_now(:second)]
            )
          end

          Repo.delete!(member)
        end)
    end
  end

  def list_invites(org_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    OrganizationInvite
    |> where([i], i.org_id == ^org_id and i.status == "pending" and i.expires_at > ^now)
    |> order_by([i], desc: i.created_at)
    |> Repo.all()
  end

  def create_invite(org_id, created_by_user_id, role)
      when role in ["owner", "admin", "member", "broker"] do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    with %Organization{} = org <- Repo.get(Organization, org_id),
         :ok <- validate_role_for_kind(org.kind, role),
         :ok <- ensure_seat_available(org) do
      %OrganizationInvite{}
      |> OrganizationInvite.changeset(%{
        org_id: org_id,
        token: generate_invite_token(),
        role: role,
        status: "pending",
        created_by_user_id: created_by_user_id,
        expires_at: DateTime.add(now, @invite_ttl_days * 24 * 60 * 60, :second)
      })
      |> Repo.insert()
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def create_invite(_, _, _), do: {:error, :invalid_role}

  def revoke_invite(org_id, invite_id) do
    case Repo.get_by(OrganizationInvite, id: invite_id, org_id: org_id, status: "pending") do
      nil ->
        {:error, :not_found}

      invite ->
        now = DateTime.utc_now() |> DateTime.truncate(:second)

        invite
        |> OrganizationInvite.changeset(%{status: "revoked", revoked_at: now})
        |> Repo.update()
    end
  end

  def get_invite_preview(token) do
    with %OrganizationInvite{} = invite <- get_invite_by_token(token),
         %Organization{} = org <- Repo.get(Organization, invite.org_id) do
      {:ok, invite_preview(invite, org)}
    else
      nil -> {:error, :not_found}
    end
  end

  def accept_invite(token, user_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    Repo.transaction(fn ->
      invite =
        OrganizationInvite
        |> where([i], i.token == ^string(token))
        |> lock("FOR UPDATE")
        |> Repo.one()

      cond do
        is_nil(invite) ->
          Repo.rollback(:not_found)

        invite.status != "pending" ->
          Repo.rollback(:unavailable)

        DateTime.compare(invite.expires_at, now) != :gt ->
          Repo.rollback(:expired)

        match?(%OrganizationMember{}, get_membership(user_id, invite.org_id)) ->
          {:already_member, invite}

        true ->
          org =
            Organization
            |> where([organization], organization.id == ^invite.org_id)
            |> lock("FOR UPDATE")
            |> Repo.one!()

          with :ok <- ensure_family_membership_available(org, user_id),
               :ok <- ensure_seat_available(org, invite.id) do
            case insert_invite_member(invite, user_id, now) do
              {:ok, member} ->
                accepted_invite =
                  invite
                  |> OrganizationInvite.changeset(%{
                    status: "accepted",
                    accepted_by_user_id: user_id,
                    accepted_at: now
                  })
                  |> Repo.update!()

                {:accepted, member, accepted_invite}

              {:error, changeset} ->
                Repo.rollback(changeset)
            end
          else
            {:error, reason} -> Repo.rollback(reason)
          end
      end
    end)
    |> case do
      {:ok, {:accepted, member, invite}} ->
        user = Repo.get!(User, member.user_id)

        {:ok, :accepted, member_with_user(member, user),
         organization_for_user!(invite.org_id, user_id)}

      {:ok, {:already_member, invite}} ->
        {:ok, :already_member, organization_for_user!(invite.org_id, user_id)}

      {:error, reason}
      when reason in [:not_found, :unavailable, :expired, :family_membership_exists, :seat_limit] ->
        {:error, reason}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:error, changeset}
    end
  end

  def owner_count(org_id) do
    Repo.aggregate(
      from(m in OrganizationMember, where: m.org_id == ^org_id and m.role == "owner"),
      :count
    )
  end

  def can_manage_members?(role), do: role in ["owner", "admin"]
  def can_delete_org?(%Organization{owner_id: owner_id}, user_id), do: owner_id == user_id
  def can_update_org?(role), do: role in ["owner", "admin"]

  def can_assign_member_role?("owner", role) when role in ["owner", "admin", "member", "broker"],
    do: :ok

  def can_assign_member_role?(_, "owner"), do: {:error, :forbidden_role}
  def can_assign_member_role?(_, role) when role in ["admin", "member", "broker"], do: :ok
  def can_assign_member_role?(_, _), do: {:error, :invalid_role}

  def invite_url(%OrganizationInvite{token: token}), do: invite_url(token)

  def invite_url(token) when is_binary(token) do
    base = MinhaCasaAi.Config.app_public_url() || ""
    String.trim_trailing(base, "/") <> "/convites/#{token}"
  end

  def invite_available?(%OrganizationInvite{} = invite) do
    invite.status == "pending" and DateTime.compare(invite.expires_at, DateTime.utc_now()) == :gt
  end

  defp member_with_user(member, user) do
    %{
      id: member.id,
      user_id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
      user_name: user.name,
      user_email: user.email,
      user_image: user.image
    }
  end

  defp counts(org_id) do
    member_count =
      Repo.aggregate(from(m in OrganizationMember, where: m.org_id == ^org_id), :count)

    collection_count = Repo.aggregate(from(c in Collection, where: c.org_id == ^org_id), :count)

    listing_count =
      Repo.aggregate(
        from(l in Listing,
          join: c in Collection,
          on: c.id == l.collection_id,
          where: c.org_id == ^org_id
        ),
        :count
      )

    %{
      member_count: member_count,
      collections_count: collection_count,
      listings_count: listing_count
    }
  end

  defp validate_role_for_kind("family", role) when role in ["owner", "admin", "member"], do: :ok
  defp validate_role_for_kind("agency", role) when role in ["owner", "admin", "broker"], do: :ok
  defp validate_role_for_kind(_, _), do: {:error, :invalid_role}

  defp ensure_family_membership_available(%Organization{kind: "family", id: org_id}, user_id) do
    exists =
      Repo.exists?(
        from(m in OrganizationMember,
          join: o in Organization,
          on: o.id == m.org_id,
          where: m.user_id == ^user_id and o.kind == "family" and o.id != ^org_id
        )
      )

    if exists, do: {:error, :family_membership_exists}, else: :ok
  end

  defp ensure_family_membership_available(_, _), do: :ok

  defp family_membership_exists?(user_id) do
    Repo.exists?(
      from(m in OrganizationMember,
        join: o in Organization,
        on: o.id == m.org_id,
        where: m.user_id == ^user_id and o.kind == "family"
      )
    )
  end

  defp ensure_seat_available(%Organization{} = org, accepting_invite_id \\ nil) do
    member_count =
      Repo.aggregate(from(m in OrganizationMember, where: m.org_id == ^org.id), :count)

    pending_count = pending_seat_count(org, accepting_invite_id)
    limit = seat_limit(org)
    if member_count + pending_count < limit, do: :ok, else: {:error, :seat_limit}
  end

  defp pending_seat_count(%Organization{kind: "agency"}, _accepting_invite_id), do: 0

  defp pending_seat_count(%Organization{} = org, accepting_invite_id) do
    query =
      from(i in OrganizationInvite,
        where:
          i.org_id == ^org.id and i.status == "pending" and
            i.expires_at > ^DateTime.utc_now(:second)
      )

    query =
      if accepting_invite_id,
        do: where(query, [i], i.id != ^accepting_invite_id),
        else: query

    Repo.aggregate(query, :count)
  end

  defp seat_limit(%Organization{kind: "family"}), do: 4

  defp seat_limit(%Organization{kind: "agency", workspace_id: workspace_id}) do
    now = DateTime.utc_now(:second)

    Repo.one(
      from(s in Subscription,
        join: p in Plan,
        on: p.id == s.plan_id,
        where:
          s.target_workspace_id == ^workspace_id and s.status == "active" and
            s.expires_at >= ^now and p.slug == "imobiliaria",
        order_by: [desc: s.created_at],
        select: coalesce(s.licensed_seats, coalesce(p.included_seats, 10)),
        limit: 1
      )
    ) || 0
  end

  defp get_invite_by_token(token) do
    token = string(token)

    if token == "" do
      nil
    else
      Repo.get_by(OrganizationInvite, token: token)
    end
  end

  defp invite_preview(invite, org) do
    %{
      id: invite.id,
      token: invite.token,
      role: invite.role,
      status: invite_status(invite),
      expires_at: invite.expires_at,
      organization: %{
        id: org.id,
        name: org.name,
        slug: org.slug,
        kind: org.kind
      },
      available: invite_available?(invite)
    }
  end

  defp invite_status(%OrganizationInvite{status: "pending"} = invite) do
    if invite_available?(invite), do: "pending", else: "expired"
  end

  defp invite_status(%OrganizationInvite{status: status}), do: status

  defp organization_for_user!(org_id, user_id) do
    {:ok, organization} = get_for_user(org_id, user_id)
    organization
  end

  defp insert_invite_member(invite, user_id, joined_at) do
    %OrganizationMember{}
    |> OrganizationMember.changeset(%{
      org_id: invite.org_id,
      user_id: user_id,
      role: invite.role,
      joined_at: joined_at
    })
    |> Repo.insert()
  end

  defp unique_slug(base, attempt \\ 0) do
    candidate = if attempt == 0, do: base, else: "#{base}-#{random_suffix()}"

    case Repo.get_by(Organization, slug: candidate) do
      nil -> candidate
      _ -> unique_slug(base, attempt + 1)
    end
  end

  defp random_suffix,
    do: :crypto.strong_rand_bytes(3) |> Base.url_encode64(padding: false) |> String.downcase()

  defp generate_invite_token do
    @invite_token_bytes
    |> :crypto.strong_rand_bytes()
    |> Base.url_encode64(padding: false)
  end

  defp slugify(value) do
    value
    |> string()
    |> String.downcase()
    |> String.normalize(:nfd)
    |> String.replace(~r/[^a-z0-9\s-]/u, "")
    |> String.replace(~r/\s+/, "-")
    |> String.replace(~r/-+/, "-")
    |> String.trim("-")
    |> String.slice(0, 50)
  end

  defp string(value) when is_binary(value), do: String.trim(value)
  defp string(_), do: ""
end
