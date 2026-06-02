defmodule MinhaCasaAi.Billing.Addon do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  schema "addons" do
    field :name, :string
    field :slug, :string
    field :description, :string
    field :created_at, :utc_datetime
  end
end
