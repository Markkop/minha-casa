defmodule MinhaCasaAi.Organizations do
  import Ecto.Query

  alias MinhaCasaAi.Accounts.User
  alias MinhaCasaAi.Listings.{Collection, Listing}
  alias MinhaCasaAi.Organizations.{Organization, OrganizationMember}
  alias MinhaCasaAi.Repo

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
      {:ok, org |> Map.put(:role, membership.role) |> Map.put(:joined_at, membership.joined_at) |> Map.merge(counts(id))}
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
    provided_slug = attrs |> Map.get("slug", "") |> string()
    slug = if provided_slug == "", do: slugify(name), else: slugify(provided_slug)

    if name == "" or slug == "" do
      {:error, :invalid}
    else
      Repo.transaction(fn ->
        org =
          %Organization{}
          |> Organization.changeset(%{name: name, slug: unique_slug(slug), owner_id: user_id})
          |> Repo.insert!()

        %OrganizationMember{}
        |> OrganizationMember.changeset(%{
          org_id: org.id,
          user_id: user_id,
          role: "owner",
          joined_at: DateTime.utc_now()
        })
        |> Repo.insert!()

        org |> Map.put(:role, "owner") |> Map.put(:joined_at, DateTime.utc_now()) |> Map.merge(counts(org.id))
      end)
    end
  end

  def update(org, attrs) do
    org
    |> Organization.update_changeset(%{name: string(Map.get(attrs, "name"))})
    |> Repo.update()
  end

  def delete(%Organization{} = org), do: Repo.delete(org)

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

  def add_member(org_id, email, role) when role in ["owner", "admin", "member"] do
    email = email |> string() |> String.downcase()

    with %User{} = user <- Repo.get_by(User, email: email),
         nil <- get_membership(user.id, org_id) do
      %OrganizationMember{}
      |> OrganizationMember.changeset(%{
        org_id: org_id,
        user_id: user.id,
        role: role,
        joined_at: DateTime.utc_now()
      })
      |> Repo.insert()
      |> case do
        {:ok, member} -> {:ok, member_with_user(member, user)}
        error -> error
      end
    else
      nil -> {:error, :user_not_found}
      %OrganizationMember{} -> {:error, :already_member}
    end
  end

  def add_member(_, _, _), do: {:error, :invalid_role}

  def update_member_role(org_id, user_id, role) when role in ["owner", "admin", "member"] do
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
  end

  def update_member_role(_, _, _), do: {:error, :invalid_role}

  def remove_member(org_id, user_id) do
    case get_membership(user_id, org_id) do
      nil -> {:error, :not_found}
      member -> Repo.delete(member)
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
    member_count = Repo.aggregate(from(m in OrganizationMember, where: m.org_id == ^org_id), :count)
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

    %{member_count: member_count, collections_count: collection_count, listings_count: listing_count}
  end

  defp unique_slug(base, attempt \\ 0) do
    candidate = if attempt == 0, do: base, else: "#{base}-#{random_suffix()}"

    case Repo.get_by(Organization, slug: candidate) do
      nil -> candidate
      _ -> unique_slug(base, attempt + 1)
    end
  end

  defp random_suffix, do: :crypto.strong_rand_bytes(3) |> Base.url_encode64(padding: false) |> String.downcase()

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
