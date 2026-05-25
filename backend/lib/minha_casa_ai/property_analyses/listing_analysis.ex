defmodule MinhaCasaAi.PropertyAnalyses.ListingAnalysis do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "listing_analyses" do
    field :listing_id, :binary_id
    field :workflow_run_id, :binary_id
    field :user_id, :binary_id
    field :org_id, :binary_id
    field :status, :string, default: "queued"
    field :input, :map, default: %{}
    field :result, :map
    field :error, :string
    field :created_at, :utc_datetime
    field :updated_at, :utc_datetime
  end

  def changeset(analysis, attrs) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    analysis
    |> cast(attrs, [
      :listing_id,
      :workflow_run_id,
      :user_id,
      :org_id,
      :status,
      :input,
      :result,
      :error
    ])
    |> put_change(:created_at, Map.get(attrs, :created_at) || analysis.created_at || now)
    |> put_change(:updated_at, now)
    |> validate_required([:listing_id, :status, :input])
    |> validate_inclusion(:status, ["queued", "running", "completed", "failed"])
  end
end
