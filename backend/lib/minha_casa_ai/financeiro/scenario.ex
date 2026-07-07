defmodule MinhaCasaAi.Financeiro.Scenario do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "financeiro_scenarios" do
    field :collection_id, :binary_id
    field :name, :string
    field :payload, :map

    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(scenario, attrs) do
    scenario
    |> cast(attrs, [:collection_id, :name, :payload])
    |> update_change(:name, &String.trim/1)
    |> validate_required([:collection_id, :name, :payload])
    |> validate_length(:name, min: 1, max: 120)
    |> validate_payload()
    |> foreign_key_constraint(:collection_id)
  end

  def rename_changeset(scenario, attrs) do
    scenario
    |> cast(attrs, [:name])
    |> update_change(:name, &String.trim/1)
    |> validate_required([:name])
    |> validate_length(:name, min: 1, max: 120)
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
