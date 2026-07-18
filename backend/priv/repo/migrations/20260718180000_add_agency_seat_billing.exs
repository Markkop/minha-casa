defmodule MinhaCasaAi.Repo.Migrations.AddAgencySeatBilling do
  use Ecto.Migration

  def up do
    alter table(:plans) do
      add(:included_seats, :integer)
      add(:additional_seat_price_in_cents, :integer)
      add(:stripe_additional_seat_price_id, :text)
    end

    alter table(:organizations) do
      add(:stripe_customer_id, :text)
    end

    alter table(:subscriptions) do
      add(:stripe_base_item_id, :text)
      add(:stripe_seat_item_id, :text)
      add(:licensed_seats, :integer)
      add(:pending_licensed_seats, :integer)
      add(:pending_seats_effective_at, :utc_datetime)
      add(:stripe_schedule_id, :text)
    end

    execute("""
    UPDATE plans
       SET included_seats = 10,
           additional_seat_price_in_cents = 3900,
           updated_at = now()
     WHERE slug = 'imobiliaria'
    """)

    execute("""
    UPDATE subscriptions AS subscription
       SET licensed_seats = GREATEST(
             10,
             COALESCE(
               (
                 SELECT count(*)::integer
                   FROM organizations AS organization
                   JOIN organization_members AS membership
                     ON membership.org_id = organization.id
                  WHERE organization.workspace_id = subscription.target_workspace_id
               ),
               0
             )
           ),
           updated_at = now()
      FROM plans AS plan
     WHERE subscription.plan_id = plan.id
       AND plan.slug = 'imobiliaria'
    """)

    create(
      unique_index(:subscriptions, [:stripe_subscription_id],
        name: :subscriptions_stripe_subscription_unique,
        where: "stripe_subscription_id IS NOT NULL"
      )
    )

    create(
      constraint(:plans, :plans_seat_values_check,
        check:
          "(included_seats IS NULL OR included_seats > 0) AND " <>
            "(additional_seat_price_in_cents IS NULL OR additional_seat_price_in_cents >= 0)"
      )
    )

    create(
      constraint(:subscriptions, :subscriptions_licensed_seats_check,
        check: "licensed_seats IS NULL OR licensed_seats >= 10"
      )
    )

    create(
      constraint(:subscriptions, :subscriptions_pending_licensed_seats_check,
        check: "pending_licensed_seats IS NULL OR pending_licensed_seats >= 10"
      )
    )
  end

  def down do
    drop_if_exists(constraint(:subscriptions, :subscriptions_pending_licensed_seats_check))
    drop_if_exists(constraint(:subscriptions, :subscriptions_licensed_seats_check))
    drop_if_exists(constraint(:plans, :plans_seat_values_check))

    drop_if_exists(
      index(:subscriptions, [:stripe_subscription_id],
        name: :subscriptions_stripe_subscription_unique
      )
    )

    alter table(:subscriptions) do
      remove(:stripe_schedule_id)
      remove(:pending_seats_effective_at)
      remove(:pending_licensed_seats)
      remove(:licensed_seats)
      remove(:stripe_seat_item_id)
      remove(:stripe_base_item_id)
    end

    alter table(:organizations) do
      remove(:stripe_customer_id)
    end

    alter table(:plans) do
      remove(:stripe_additional_seat_price_id)
      remove(:additional_seat_price_in_cents)
      remove(:included_seats)
    end
  end
end
