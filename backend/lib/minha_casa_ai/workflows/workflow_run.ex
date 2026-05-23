defmodule MinhaCasaAi.Workflows.WorkflowRun do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "ai_workflow_runs" do
    field :kind, :string
    field :status, :string, default: "received"
    field :input, :map, default: %{}
    field :result, :map
    field :error, :string
    field :user_id, :binary_id
    field :org_id, :binary_id
    timestamps(type: :utc_datetime)
  end

  def changeset(run, attrs) do
    run
    |> cast(attrs, [:kind, :status, :input, :result, :error, :user_id, :org_id])
    |> validate_required([:kind, :status, :input])
  end
end
