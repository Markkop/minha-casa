defmodule MinhaCasaAi.Workspace.Contact do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "contacts" do
    field :user_id, :binary_id
    field :org_id, :binary_id
    field :name, :string
    field :phone, :string
    field :normalized_phone, :string
    field :email, :string
    field :notes, :string
    field :source, :string, default: "manual"
    field :listings, {:array, :map}, virtual: true, default: []

    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(contact, attrs) do
    contact
    |> cast(attrs, [:user_id, :org_id, :name, :phone, :normalized_phone, :email, :notes, :source])
    |> validate_inclusion(:source, ["manual", "listing"])
    |> validate_required([:source])
    |> validate_contact_method()
    |> validate_owner()
  end

  defp validate_contact_method(changeset) do
    if present?(get_field(changeset, :name)) or present?(get_field(changeset, :phone)) or
         present?(get_field(changeset, :email)) do
      changeset
    else
      add_error(changeset, :base, "name, phone or email is required")
    end
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

  defp present?(value), do: is_binary(value) and String.trim(value) != ""
end
