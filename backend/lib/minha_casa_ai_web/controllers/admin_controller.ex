defmodule MinhaCasaAiWeb.AdminController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Billing
  alias MinhaCasaAi.Config
  alias MinhaCasaAiWeb.{AdminJSON, BillingJSON}

  plug :require_admin

  def users(conn, _params) do
    json(conn, %{users: Enum.map(Billing.list_users(), &AdminJSON.user_row/1)})
  end

  def update_user(conn, %{"user_id" => user_id} = params) do
    case Billing.update_user(conn.assigns.current_user_id, user_id, params) do
      {:ok, user} ->
        json(conn, %{user: user_response(user)})

      {:error, :not_found} ->
        not_found(conn, "User")

      {:error, :self_admin} ->
        conn |> put_status(:bad_request) |> json(%{error: "Cannot remove your own admin status"})

      {:error, :last_super_admin} ->
        conn |> put_status(:conflict) |> json(%{error: "Cannot remove the last Super Admin"})

      {:error, :empty} ->
        conn |> put_status(:bad_request) |> json(%{error: "At least one field must be provided"})
    end
  end

  def delete_user(conn, %{"user_id" => user_id}) do
    case Billing.delete_user(conn.assigns.current_user_id, user_id) do
      {:ok, :ok} ->
        json(conn, %{success: true, message: "User deleted successfully"})

      {:error, :self_delete} ->
        conn |> put_status(:bad_request) |> json(%{error: "Cannot delete your own account"})

      {:error, :not_found} ->
        not_found(conn, "User")
    end
  end

  def stats(conn, _params) do
    json(conn, %{stats: AdminJSON.stats(Billing.stats())})
  end

  def plans(conn, _params) do
    json(conn, %{
      plans: Billing.list_plans(true) |> Enum.map(&BillingJSON.plan/1),
      stripeTestMode: Config.stripe_test_mode?()
    })
  end

  def organizations(conn, _params) do
    json(conn, %{
      organizations: Billing.list_organizations() |> Enum.map(&AdminJSON.organization_row/1)
    })
  end

  def stripe_reconciliation(conn, _params) do
    case Billing.stripe_reconciliation() do
      {:ok, result} ->
        json(conn, result)

      {:error, :stripe_not_configured} ->
        conn |> put_status(:service_unavailable) |> json(%{error: "Stripe is not configured"})

      {:error, {:stripe, message}} ->
        conn |> put_status(:bad_gateway) |> json(%{error: message})
    end
  end

  def update_plan(conn, %{"slug" => slug, "stripePriceId" => stripe_price_id}) do
    case Billing.update_plan_stripe_price(slug, stripe_price_id) do
      {:ok, plan} -> json(conn, %{plan: BillingJSON.plan(plan)})
      {:error, :not_found} -> not_found(conn, "Plan")
      {:error, changeset} -> changeset_error(conn, changeset)
    end
  end

  def update_plan(conn, _params) do
    conn |> put_status(:bad_request) |> json(%{error: "stripePriceId is required"})
  end

  def subscription(conn, %{"id" => id}) do
    case Billing.get_subscription(id) do
      {:ok, %{subscription: subscription, plan: plan, user: user}} ->
        json(conn, %{
          subscription: BillingJSON.subscription(subscription),
          plan: BillingJSON.plan(plan),
          user: user_response(user)
        })

      {:error, :not_found} ->
        not_found(conn, "Subscription")
    end
  end

  def update_subscription(conn, %{"id" => id} = params) do
    case Billing.update_subscription(id, params) do
      {:ok, %{subscription: subscription, plan: plan}} ->
        json(conn, %{
          subscription: BillingJSON.subscription(subscription),
          plan: BillingJSON.plan(plan)
        })

      {:error, :not_found} ->
        not_found(conn, "Subscription")

      {:error, :invalid_date} ->
        conn |> put_status(:bad_request) |> json(%{error: "expiresAt must be a valid ISO date"})

      {:error, {:stripe, message}} ->
        conn |> put_status(:bad_gateway) |> json(%{error: message})

      {:error, changeset} ->
        changeset_error(conn, changeset)
    end
  end

  def user_subscriptions(conn, %{"user_id" => user_id}) do
    case Billing.user_subscription_history(user_id) do
      {:ok, %{user: user, subscriptions: subscriptions}} ->
        json(conn, %{
          user: user_response(user),
          subscriptions: Enum.map(subscriptions, &AdminJSON.subscription_history_row/1)
        })

      {:error, :not_found} ->
        not_found(conn, "User")
    end
  end

  defp require_admin(conn, _opts) do
    if Billing.admin?(conn.assigns[:current_user_id]) do
      conn
    else
      conn |> put_status(:forbidden) |> json(%{error: "Forbidden"}) |> halt()
    end
  end

  defp user_response(nil), do: nil

  defp user_response(user) do
    %{
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.is_admin,
      isSuperAdmin: Billing.admin?(user.id),
      emailVerified: user.email_verified,
      createdAt: BillingJSON.datetime_to_iso(user.created_at)
    }
  end

  defp changeset_error(conn, %Ecto.Changeset{} = changeset) do
    error =
      changeset
      |> Ecto.Changeset.traverse_errors(fn {msg, _} -> msg end)
      |> Enum.map(fn {field, msgs} -> "#{field} #{Enum.join(msgs, ", ")}" end)
      |> List.first()

    conn |> put_status(:bad_request) |> json(%{error: error || "Invalid data"})
  end

  defp not_found(conn, name),
    do: conn |> put_status(:not_found) |> json(%{error: "#{name} not found"})
end
