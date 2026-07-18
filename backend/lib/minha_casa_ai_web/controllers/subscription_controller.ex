defmodule MinhaCasaAiWeb.SubscriptionController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Billing
  alias MinhaCasaAiWeb.BillingJSON

  def show_current(conn, _params) do
    case Billing.current_subscription(conn.assigns.current_user_id) do
      nil ->
        json(conn, %{
          accessStatus: "inactive",
          hasActiveSubscription: false,
          subscription: nil,
          plan: nil
        })

      %{subscription: subscription, plan: plan} ->
        json(conn, %{
          accessStatus: "active",
          hasActiveSubscription: true,
          subscription: BillingJSON.subscription(subscription),
          plan: BillingJSON.plan(plan)
        })
    end
  end

  def checkout(conn, params) do
    case Billing.create_checkout_session(conn.assigns.current_user_id, params) do
      {:ok, session} ->
        json(conn, %{checkoutUrl: session.checkout_url, sessionId: session.session_id})

      {:error, :stripe_not_configured} ->
        conn
        |> put_status(:service_unavailable)
        |> json(%{error: "Payment system is not configured"})

      {:error, :invalid} ->
        conn |> put_status(:bad_request) |> json(%{error: "planId is required"})

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "Plan not found"})

      {:error, :inactive_plan} ->
        conn |> put_status(:bad_request) |> json(%{error: "Plan is not available"})

      {:error, :missing_stripe_price} ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "Plan is not configured for online payment. Please contact support."})

      {:error, {:stripe, message}} ->
        conn |> put_status(:bad_gateway) |> json(%{error: message})
    end
  end

  def portal(conn, _params) do
    case Billing.create_billing_portal_session(conn.assigns.current_user_id) do
      {:ok, portal} ->
        json(conn, %{url: portal.url})

      {:error, :stripe_not_configured} ->
        conn
        |> put_status(:service_unavailable)
        |> json(%{error: "Payment system is not configured"})

      {:error, :missing_customer} ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "No Stripe customer on file. Subscribe once through checkout first."})

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "User not found"})

      {:error, {:stripe, message}} ->
        conn |> put_status(:bad_gateway) |> json(%{error: message})
    end
  end

  def create(conn, params) do
    with true <- Billing.admin?(conn.assigns.current_user_id),
         {:ok, subscription} <- Billing.grant_subscription(conn.assigns.current_user_id, params) do
      conn
      |> put_status(:created)
      |> json(%{subscription: BillingJSON.subscription(subscription)})
    else
      false ->
        conn |> put_status(:forbidden) |> json(%{error: "Only admins can create subscriptions"})

      {:error, :invalid} ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "userId, planId, and expiresAt are required"})

      {:error, :invalid_date} ->
        conn |> put_status(:bad_request) |> json(%{error: "expiresAt must be a valid ISO date"})

      {:error, :inactive_plan} ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "Cannot create subscription for inactive plan"})

      {:error, :plan_conflict} ->
        conn
        |> put_status(:conflict)
        |> json(%{error: "Pro and Corretor are mutually exclusive", code: "plan_conflict"})

      {:error, :target_workspace_required} ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "An agency workspace is required for this plan"})

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "User or plan not found"})

      {:error, changeset} ->
        changeset_error(conn, changeset)
    end
  end

  defp changeset_error(conn, %Ecto.Changeset{} = changeset) do
    error =
      changeset
      |> Ecto.Changeset.traverse_errors(fn {msg, _} -> msg end)
      |> Enum.map(fn {field, msgs} -> "#{field} #{Enum.join(msgs, ", ")}" end)
      |> List.first()

    conn |> put_status(:bad_request) |> json(%{error: error || "Invalid data"})
  end
end
