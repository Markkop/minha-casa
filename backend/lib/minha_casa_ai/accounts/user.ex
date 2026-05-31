defmodule MinhaCasaAi.Accounts.User do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  schema "users" do
    field :email, :string
    field :name, :string
    field :image, :string
    field :is_admin, :boolean, default: false
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end
end
