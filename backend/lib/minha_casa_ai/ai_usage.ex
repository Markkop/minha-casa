defmodule MinhaCasaAi.AiUsage do
  @moduledoc "Atomic, idempotent reservations for the internal parsing pool."

  import Ecto.Query

  alias MinhaCasaAi.AiUsage.{Event, Reservation}
  alias MinhaCasaAi.Entitlements
  alias MinhaCasaAi.Repo

  def reserve(entitlement, actor_user_id, opts \\ []) do
    idempotency_key = Keyword.get_lazy(opts, :idempotency_key, &Ecto.UUID.generate/0)
    collection_id = Keyword.get(opts, :collection_id)
    credits = Keyword.get(opts, :credits, 1)
    limit = entitlement.limits["aiParsesPerCycle"] || 0
    cycle = Entitlements.cycle(entitlement)

    if not Entitlements.can_parse?(entitlement, Keyword.get(opts, :access, "owner")) do
      {:error, :parsing_forbidden}
    else
      Repo.transaction(fn ->
        lock_pool!(entitlement.ledger_workspace_id)

        case Repo.get_by(Reservation, idempotency_key: idempotency_key) do
          %Reservation{} = existing ->
            if same_request?(existing, entitlement, actor_user_id, collection_id, cycle) do
              %{reservation: existing, alert: alert(existing_usage(existing), limit)}
            else
              Repo.rollback(:idempotency_conflict)
            end

          nil ->
            used = current_usage(entitlement.ledger_workspace_id, cycle)

            if used + credits > limit do
              Repo.rollback(:limit_reached)
            end

            reservation =
              %Reservation{}
              |> Reservation.changeset(%{
                workspace_id: entitlement.ledger_workspace_id,
                actor_user_id: actor_user_id,
                collection_id: collection_id,
                credits: credits,
                status: "reserved",
                idempotency_key: idempotency_key,
                cycle_starts_at: cycle.starts_at,
                cycle_ends_at: cycle.ends_at
              })
              |> Repo.insert!()

            event!(reservation, "reserved", credits)
            %{reservation: reservation, alert: alert(used + credits, limit)}
        end
      end)
      |> unwrap_transaction()
    end
  end

  def consume(%Reservation{status: "reserved"} = reservation) do
    Repo.transaction(fn ->
      locked =
        Reservation |> where([r], r.id == ^reservation.id) |> lock("FOR UPDATE") |> Repo.one!()

      if locked.status == "reserved" do
        now = DateTime.utc_now(:second)

        {:ok, updated} =
          locked
          |> Reservation.changeset(%{status: "consumed", consumed_at: now})
          |> Repo.update()

        event!(updated, "consumed", 0)
        updated
      else
        locked
      end
    end)
    |> unwrap_transaction()
  end

  def consume(%Reservation{} = reservation), do: {:ok, reservation}

  def release(reservation, metadata \\ %{})

  def release(%Reservation{status: "reserved"} = reservation, metadata) do
    Repo.transaction(fn ->
      locked =
        Reservation |> where([r], r.id == ^reservation.id) |> lock("FOR UPDATE") |> Repo.one!()

      if locked.status == "reserved" do
        now = DateTime.utc_now(:second)

        {:ok, updated} =
          locked
          |> Reservation.changeset(%{status: "released", released_at: now, metadata: metadata})
          |> Repo.update()

        event!(updated, "released", -updated.credits, metadata)
        updated
      else
        locked
      end
    end)
    |> unwrap_transaction()
  end

  def release(%Reservation{} = reservation, _metadata), do: {:ok, reservation}

  def usage(workspace_id, starts_at, ends_at) do
    current_usage(workspace_id, %{starts_at: starts_at, ends_at: ends_at})
  end

  defp current_usage(workspace_id, cycle) do
    Repo.one(
      from(r in Reservation,
        where:
          r.workspace_id == ^workspace_id and r.cycle_starts_at == ^cycle.starts_at and
            r.cycle_ends_at == ^cycle.ends_at and r.status in ["reserved", "consumed"],
        select: coalesce(sum(r.credits), 0)
      )
    )
  end

  defp existing_usage(reservation) do
    current_usage(reservation.workspace_id, %{
      starts_at: reservation.cycle_starts_at,
      ends_at: reservation.cycle_ends_at
    })
  end

  defp same_request?(reservation, entitlement, actor_user_id, collection_id, cycle) do
    reservation.workspace_id == entitlement.ledger_workspace_id and
      reservation.actor_user_id == actor_user_id and reservation.collection_id == collection_id and
      reservation.cycle_starts_at == cycle.starts_at and
      reservation.cycle_ends_at == cycle.ends_at
  end

  defp lock_pool!(workspace_id) do
    Repo.query!("SELECT pg_advisory_xact_lock(hashtext($1))", [workspace_id])
  end

  defp event!(reservation, type, delta, metadata \\ %{}) do
    %Event{}
    |> Event.changeset(%{
      reservation_id: reservation.id,
      workspace_id: reservation.workspace_id,
      actor_user_id: reservation.actor_user_id,
      event_type: type,
      credits_delta: delta,
      metadata: metadata,
      occurred_at: DateTime.utc_now(:second)
    })
    |> Repo.insert!()
  end

  defp alert(used, limit) when limit > 0 and used >= limit, do: "limit_reached"
  defp alert(used, limit) when limit > 0 and used * 100 >= limit * 80, do: "near_limit"
  defp alert(_, _), do: nil

  defp unwrap_transaction({:ok, value}), do: {:ok, value}
  defp unwrap_transaction({:error, reason}), do: {:error, reason}
end
