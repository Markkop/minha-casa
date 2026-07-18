defmodule MinhaCasaAi.Workspaces.Workspace do
  use Ecto.Schema
  import Ecto.Changeset

  @types ~w(personal professional organization)
  @statuses ~w(active frozen archived)

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "workspaces" do
    field :type, :string
    field :owner_user_id, :binary_id
    field :name, :string
    field :status, :string, default: "active"
    field :settings, :map, default: %{}
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def types, do: @types
  def statuses, do: @statuses

  def changeset(workspace, attrs) do
    workspace
    |> cast(attrs, [:type, :owner_user_id, :name, :status, :settings])
    |> validate_required([:type, :name, :status])
    |> validate_inclusion(:type, @types)
    |> validate_inclusion(:status, @statuses)
    |> validate_owner()
    |> unique_constraint(:owner_user_id, name: :workspaces_personal_owner_idx)
    |> unique_constraint(:owner_user_id, name: :workspaces_professional_owner_idx)
  end

  defp validate_owner(changeset) do
    if get_field(changeset, :type) in ["personal", "professional"] do
      validate_required(changeset, [:owner_user_id])
    else
      changeset
    end
  end
end
