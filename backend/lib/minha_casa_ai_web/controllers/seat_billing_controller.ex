defmodule MinhaCasaAiWeb.SeatBillingController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Billing.Seats

  def show(conn, %{"id" => organization_id}) do
    case Seats.summary(organization_id, current_user_id(conn)) do
      {:ok, seats} -> json(conn, %{seats: seats})
      {:error, reason} -> render_error(conn, reason)
    end
  end

  def preview(conn, %{"id" => organization_id} = params) do
    case Seats.preview(organization_id, current_user_id(conn), params) do
      {:ok, preview} -> json(conn, %{preview: preview})
      {:error, reason} -> render_error(conn, reason)
    end
  end

  def update(conn, %{"id" => organization_id} = params) do
    case Seats.update(organization_id, current_user_id(conn), params) do
      {:ok, seats} -> json(conn, %{seats: seats})
      {:error, reason} -> render_error(conn, reason)
    end
  end

  defp render_error(conn, :not_found),
    do: conn |> put_status(:not_found) |> json(%{error: "Organization not found"})

  defp render_error(conn, :agency_only),
    do:
      conn
      |> put_status(:bad_request)
      |> json(%{error: "Seat billing is only available for agencies"})

  defp render_error(conn, :forbidden),
    do:
      conn
      |> put_status(:forbidden)
      |> json(%{error: "Only the organization owner or billing owner can manage seats"})

  defp render_error(conn, :no_active_subscription),
    do:
      conn
      |> put_status(:conflict)
      |> json(%{error: "The agency does not have an active subscription"})

  defp render_error(conn, :invalid_seat_count),
    do:
      conn
      |> put_status(:unprocessable_entity)
      |> json(%{error: "totalSeats must be a positive integer"})

  defp render_error(conn, {:invalid_seat_count, minimum}),
    do:
      conn
      |> put_status(:unprocessable_entity)
      |> json(%{
        error: "The seat limit cannot be lower than #{minimum}",
        minimumSeats: minimum
      })

  defp render_error(conn, :invalid_quote),
    do:
      conn
      |> put_status(:conflict)
      |> json(%{error: "This seat quote is invalid or expired. Request a new preview."})

  defp render_error(conn, :stale_quote),
    do:
      conn
      |> put_status(:conflict)
      |> json(%{error: "Seat billing changed since this preview. Request a new preview."})

  defp render_error(conn, :stripe_not_configured),
    do:
      conn
      |> put_status(:service_unavailable)
      |> json(%{error: "Payment system is not configured"})

  defp render_error(conn, :missing_stripe_subscription),
    do:
      conn
      |> put_status(:conflict)
      |> json(%{error: "The agency subscription is not linked to Stripe"})

  defp render_error(conn, :missing_seat_price),
    do:
      conn
      |> put_status(:conflict)
      |> json(%{error: "Additional-seat pricing is not configured"})

  defp render_error(conn, :missing_period_end),
    do:
      conn
      |> put_status(:conflict)
      |> json(%{error: "Stripe has not provided the current billing period"})

  defp render_error(conn, :payment_incomplete),
    do:
      conn
      |> put_status(:payment_required)
      |> json(%{
        error:
          "Stripe could not complete the prorated payment. Update the payment method and try again."
      })

  defp render_error(conn, {:stripe, message}),
    do: conn |> put_status(:bad_gateway) |> json(%{error: message})

  defp render_error(conn, %Ecto.Changeset{} = changeset) do
    error =
      changeset
      |> Ecto.Changeset.traverse_errors(fn {message, _opts} -> message end)
      |> Enum.map(fn {field, messages} -> "#{field} #{Enum.join(messages, ", ")}" end)
      |> List.first()

    conn |> put_status(:unprocessable_entity) |> json(%{error: error || "Invalid seat change"})
  end

  defp render_error(conn, _reason),
    do: conn |> put_status(:bad_request) |> json(%{error: "Seat change could not be completed"})

  defp current_user_id(conn), do: conn.assigns[:current_user_id]
end
