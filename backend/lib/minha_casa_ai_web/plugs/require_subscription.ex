defmodule MinhaCasaAiWeb.Plugs.RequireSubscription do
  @moduledoc """
  Ensures the authenticated user has a non-expired active subscription.
  Admins bypass this check.
  """

  import Plug.Conn
  import Phoenix.Controller

  alias MinhaCasaAi.Billing

  def init(opts), do: opts

  def call(conn, _opts) do
    if conn.assigns[:current_user_is_admin] || Billing.active_subscription?(conn.assigns.current_user_id) do
      conn
    else
      conn
      |> put_status(:payment_required)
      |> json(%{error: "Subscription required"})
      |> halt()
    end
  end
end
