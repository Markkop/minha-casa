defmodule MinhaCasaAi.Repo.Migrations.ReplaceAgencySeatsWithLicenseLimit do
  use Ecto.Migration

  def up do
    alter table(:organizations) do
      add(:license_limit, :integer)
    end

    execute("""
    UPDATE organizations AS organization
       SET license_limit = GREATEST(
             10,
             COALESCE(
               (
                 SELECT count(*)::integer
                   FROM organization_members AS membership
                  WHERE membership.org_id = organization.id
               ),
               0
             )
           ),
           updated_at = now()
     WHERE organization.kind = 'agency'
    """)

    create(
      constraint(:organizations, :organizations_license_limit_check,
        check:
          "(kind = 'agency' AND license_limit IS NOT NULL AND license_limit >= 10) OR " <>
            "(kind <> 'agency' AND license_limit IS NULL)"
      )
    )

    drop_if_exists(constraint(:subscriptions, :subscriptions_pending_licensed_seats_check))
    drop_if_exists(constraint(:subscriptions, :subscriptions_licensed_seats_check))
    drop_if_exists(constraint(:plans, :plans_seat_values_check))

    alter table(:subscriptions) do
      remove(:stripe_schedule_id)
      remove(:pending_seats_effective_at)
      remove(:pending_licensed_seats)
      remove(:licensed_seats)
      remove(:stripe_seat_item_id)
    end

    alter table(:plans) do
      remove(:stripe_additional_seat_price_id)
      remove(:additional_seat_price_in_cents)
      remove(:included_seats)
    end

    execute("""
    UPDATE plans
       SET limits = COALESCE(limits, '{}'::jsonb) - 'includedSeats' - 'additionalSeatPriceInCents',
           updated_at = now()
     WHERE slug = 'imobiliaria'
    """)
  end

  def down do
    alter table(:plans) do
      add(:included_seats, :integer)
      add(:additional_seat_price_in_cents, :integer)
      add(:stripe_additional_seat_price_id, :text)
    end

    alter table(:subscriptions) do
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
           limits = COALESCE(limits, '{}'::jsonb) ||
             '{"includedSeats": 10, "additionalSeatPriceInCents": 3900}'::jsonb,
           updated_at = now()
     WHERE slug = 'imobiliaria'
    """)

    execute("""
    UPDATE subscriptions AS subscription
       SET licensed_seats = organization.license_limit,
           updated_at = now()
      FROM organizations AS organization,
           plans AS plan
     WHERE subscription.target_workspace_id = organization.workspace_id
       AND subscription.plan_id = plan.id
       AND plan.slug = 'imobiliaria'
    """)

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

    drop_if_exists(constraint(:organizations, :organizations_license_limit_check))

    alter table(:organizations) do
      remove(:license_limit)
    end
  end
end
