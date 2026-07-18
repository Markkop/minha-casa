defmodule MinhaCasaAi.Accounts.User do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  schema "users" do
    field :email, :string
    field :email_verified, :boolean, default: false
    field :name, :string
    field :image, :string
    field :is_admin, :boolean, default: false
    field :stripe_customer_id, :string
    field :last_login_at, :utc_datetime
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end
end
