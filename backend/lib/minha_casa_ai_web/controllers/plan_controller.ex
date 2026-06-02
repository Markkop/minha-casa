defmodule MinhaCasaAiWeb.PlanController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Billing
  alias MinhaCasaAi.Config
  alias MinhaCasaAiWeb.BillingJSON

  def index(conn, params) do
    include_inactive = Map.get(params, "includeInactive") == "true" and admin?(conn)

    json(conn, %{
      plans: BillingJSON.plans(Billing.list_plans(include_inactive)),
      stripeTestMode: Config.stripe_test_mode?()
    })
  end

  defp admin?(conn), do: Billing.admin?(conn.assigns[:current_user_id])
end
