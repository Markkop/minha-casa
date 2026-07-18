defmodule MinhaCasaAi.PortalSearches.PortalSearch do
  use Ecto.Schema
  import Ecto.Changeset

  alias MinhaCasaAi.PortalSearches.FilterSet

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "portal_searches" do
    field :user_id, :binary_id
    field :org_id, :binary_id
    field :workspace_id, :binary_id
    field :name, :string
    field :filter_set, :map, default: %{}
    field :enabled_portals, {:array, :string}, default: []
    field :max_pages, :integer, default: 1
    field :last_run_id, :binary_id

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(search, attrs) do
    search
    |> cast(attrs, [
      :user_id,
      :org_id,
      :workspace_id,
      :name,
      :filter_set,
      :enabled_portals,
      :max_pages,
      :last_run_id
    ])
    |> validate_required([:workspace_id, :name, :filter_set, :enabled_portals])
    |> validate_owner()
    |> validate_filter_set()
  end

  defp validate_owner(changeset) do
    user_id = get_field(changeset, :user_id)
    org_id = get_field(changeset, :org_id)

    cond do
      is_binary(user_id) and is_nil(org_id) -> changeset
      is_nil(user_id) and is_binary(org_id) -> changeset
      true -> add_error(changeset, :base, "invalid owner: require user_id or org_id")
    end
  end

  defp validate_filter_set(changeset) do
    case FilterSet.parse(get_field(changeset, :filter_set)) do
      {:ok, parsed} -> put_change(changeset, :filter_set, parsed)
      {:error, reason} -> add_error(changeset, :filter_set, inspect(reason))
    end
  end
end
