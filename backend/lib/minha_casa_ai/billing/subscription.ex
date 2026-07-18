defmodule MinhaCasaAi.Billing.Subscription do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "subscriptions" do
    field :user_id, :binary_id
    field :plan_id, :binary_id
    field :status, :string, default: "active"
    field :starts_at, :utc_datetime
    field :expires_at, :utc_datetime
    field :granted_by, :binary_id
    field :notes, :string
    field :stripe_customer_id, :string
    field :stripe_subscription_id, :string
    field :stripe_status, :string
    field :current_period_end, :utc_datetime
    field :cancel_at_period_end, :boolean, default: false
    field :last_payment_failed_at, :utc_datetime
    field :source, :string, default: "manual"
    field :target_workspace_id, :binary_id
    field :grant_reason, :string
    field :revoked_at, :utc_datetime
    field :revoked_by_user_id, :binary_id
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(subscription, attrs) do
    subscription
    |> cast(attrs, [
      :user_id,
      :plan_id,
      :status,
      :starts_at,
      :expires_at,
      :granted_by,
      :notes,
      :stripe_customer_id,
      :stripe_subscription_id,
      :stripe_status,
      :current_period_end,
      :cancel_at_period_end,
      :last_payment_failed_at,
      :source,
      :target_workspace_id,
      :grant_reason,
      :revoked_at,
      :revoked_by_user_id
    ])
    |> validate_required([:user_id, :plan_id, :status, :expires_at])
    |> validate_inclusion(:status, ["active", "expired", "cancelled"])
    |> validate_inclusion(:source, ["stripe", "manual", "trial"])
    |> validate_inclusion(:grant_reason, [
      "friend",
      "pilot",
      "test",
      "support",
      "promotion",
      "other"
    ])
  end

  def update_changeset(subscription, attrs) do
    subscription
    |> cast(attrs, [
      :status,
      :expires_at,
      :notes,
      :stripe_customer_id,
      :stripe_subscription_id,
      :stripe_status,
      :current_period_end,
      :cancel_at_period_end,
      :last_payment_failed_at,
      :source,
      :target_workspace_id,
      :grant_reason,
      :revoked_at,
      :revoked_by_user_id
    ])
    |> validate_inclusion(:status, ["active", "expired", "cancelled"])
    |> validate_inclusion(:source, ["stripe", "manual", "trial"])
    |> validate_inclusion(:grant_reason, [
      "friend",
      "pilot",
      "test",
      "support",
      "promotion",
      "other"
    ])
  end
end
