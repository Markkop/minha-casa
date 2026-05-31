defmodule MinhaCasaAiWeb.OrganizationJSON do
  @moduledoc false

  def organization(org) do
    %{
      id: org.id,
      name: org.name,
      slug: org.slug,
      ownerId: org.owner_id,
      role: Map.get(org, :role),
      userRole: Map.get(org, :role),
      joinedAt: datetime_to_iso(Map.get(org, :joined_at)),
      createdAt: datetime_to_iso(org.created_at),
      updatedAt: datetime_to_iso(org.updated_at),
      memberCount: Map.get(org, :member_count, 0),
      collectionsCount: Map.get(org, :collections_count, 0),
      listingsCount: Map.get(org, :listings_count, 0)
    }
  end

  def organizations(rows), do: Enum.map(rows, &organization/1)

  def member(member) do
    %{
      id: member.id,
      userId: member.user_id,
      role: member.role,
      joinedAt: datetime_to_iso(member.joined_at),
      userName: member.user_name,
      userEmail: member.user_email,
      userImage: member.user_image
    }
  end

  def members(rows), do: Enum.map(rows, &member/1)

  defp datetime_to_iso(nil), do: nil
  defp datetime_to_iso(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp datetime_to_iso(%NaiveDateTime{} = ndt), do: NaiveDateTime.to_iso8601(ndt) <> "Z"
end
