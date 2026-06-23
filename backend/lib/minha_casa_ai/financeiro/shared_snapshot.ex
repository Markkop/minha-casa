defmodule MinhaCasaAi.Financeiro.SharedSnapshot do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "financeiro_shared_snapshots" do
    field :token, :string
    field :user_id, :binary_id
    field :org_id, :binary_id
    field :title, :string
    field :payload, :map

    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(snapshot, attrs) do
    snapshot
    |> cast(attrs, [:token, :user_id, :org_id, :title, :payload])
    |> validate_required([:token, :title, :payload])
    |> validate_length(:title, min: 1, max: 120)
    |> validate_owner()
    |> validate_payload()
    |> unique_constraint(:token)
  end

  defp validate_owner(changeset) do
    user_id = get_field(changeset, :user_id)
    org_id = get_field(changeset, :org_id)

    cond do
      is_binary(user_id) and is_nil(org_id) ->
        changeset

      is_nil(user_id) and is_binary(org_id) ->
        changeset

      true ->
        add_error(changeset, :base, "invalid owner: require user_id or org_id")
    end
  end

  defp validate_payload(changeset) do
    payload = get_field(changeset, :payload)

    cond do
      not is_map(payload) ->
        add_error(changeset, :payload, "must be an object")

      Map.get(payload, "version") != 1 and Map.get(payload, :version) != 1 ->
        add_error(changeset, :payload, "version must be 1")

      true ->
        changeset
    end
  end
end
