defmodule MinhaCasaAi.PortalSearches.PortalSearchRun do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "portal_search_runs" do
    field :portal_search_id, :binary_id
    field :status, :string, default: "queued"
    field :started_at, :utc_datetime_usec
    field :finished_at, :utc_datetime_usec
    field :error, :string
    field :totals, :map, default: %{}
    field :trace_id, :string
    field :refresh, :boolean, default: false

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(run, attrs) do
    run
    |> cast(attrs, [
      :portal_search_id,
      :status,
      :started_at,
      :finished_at,
      :error,
      :totals,
      :trace_id,
      :refresh
    ])
    |> validate_required([:portal_search_id, :status])
    |> validate_inclusion(:status, ~w(queued running completed failed))
  end
end
