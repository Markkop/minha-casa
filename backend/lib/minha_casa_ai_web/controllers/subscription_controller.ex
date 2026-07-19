defmodule MinhaCasaAiWeb.SubscriptionController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Billing
  alias MinhaCasaAiWeb.{BillingJSON, PublicError}

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
        PublicError.json_error(conn, :service_unavailable, :stripe_not_configured)

      {:error, :invalid} ->
        PublicError.json_error(conn, :bad_request, "planId is required")

      {:error, :not_found} ->
        PublicError.json_error(conn, :not_found, :not_found, context: :link)

      {:error, :inactive_plan} ->
        PublicError.json_error(conn, :bad_request, :inactive_plan)

      {:error, :missing_stripe_price} ->
        PublicError.json_error(
          conn,
          :bad_request,
          "Este plano ainda não está disponível para pagamento online. Entre em contato com o suporte."
        )

      {:error, :already_subscribed} ->
        PublicError.json_error(conn, :conflict, :already_subscribed)

      {:error, :target_workspace_required} ->
        PublicError.json_error(conn, :bad_request, :target_workspace_required)

      {:error, {:stripe, _message}} ->
        PublicError.json_error(
          conn,
          :bad_gateway,
          "Não foi possível iniciar o pagamento. Tente novamente em instantes.",
          default: "Não foi possível iniciar o pagamento. Tente novamente em instantes."
        )
    end
  end

  def portal(conn, _params) do
    case Billing.create_billing_portal_session(conn.assigns.current_user_id) do
      {:ok, portal} ->
        json(conn, %{url: portal.url})

      {:error, :stripe_not_configured} ->
        PublicError.json_error(conn, :service_unavailable, :stripe_not_configured)

      {:error, :missing_customer} ->
        PublicError.json_error(
          conn,
          :bad_request,
          "Conclua uma assinatura antes de acessar o portal de cobrança."
        )

      {:error, :not_found} ->
        PublicError.json_error(conn, :not_found, :not_found, context: :link)

      {:error, {:stripe, _message}} ->
        PublicError.json_error(
          conn,
          :bad_gateway,
          "Não foi possível abrir o portal de cobrança. Tente novamente em instantes.",
          default: "Não foi possível abrir o portal de cobrança. Tente novamente em instantes."
        )
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
        PublicError.json_error(conn, :forbidden, "Somente administradores podem criar assinaturas.")

      {:error, :invalid} ->
        PublicError.json_error(
          conn,
          :bad_request,
          "Informe usuário, plano e data de expiração."
        )

      {:error, :invalid_date} ->
        PublicError.json_error(conn, :bad_request, "A data de expiração deve ser válida.")

      {:error, :inactive_plan} ->
        PublicError.json_error(conn, :bad_request, "Não é possível criar assinatura para plano inativo.")

      {:error, :plan_conflict} ->
        PublicError.json_error(
          conn,
          :conflict,
          "Os planos Pro e Corretor não podem ser combinados.",
          code: "plan_conflict"
        )

      {:error, :target_workspace_required} ->
        PublicError.json_error(conn, :bad_request, "É necessário ter uma imobiliária vinculada para este plano.")

      {:error, :not_found} ->
        PublicError.json_error(conn, :not_found, "Usuário ou plano não encontrado.")

      {:error, changeset} ->
        PublicError.json_error(conn, :bad_request, changeset)
    end
  end
end
