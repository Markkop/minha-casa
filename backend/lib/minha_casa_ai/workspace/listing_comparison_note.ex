defmodule MinhaCasaAi.Workspace.ListingComparisonNote do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "listing_comparison_notes" do
    field :listing_id, :binary_id
    field :pros, {:array, :string}, default: []
    field :cons, {:array, :string}, default: []
    field :notes, :string

    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(note, attrs) do
    note
    |> cast(attrs, [:listing_id, :pros, :cons, :notes])
    |> validate_required([:listing_id])
  end
end
