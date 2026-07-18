defmodule MinhaCasaAi.AiUsageTest do
  use ExUnit.Case, async: false

  import Ecto.Query

  alias MinhaCasaAi.Accounts.User
  alias MinhaCasaAi.AiUsage
  alias MinhaCasaAi.AiUsage.{Event, Reservation}
  alias MinhaCasaAi.{Entitlements, Repo, Workspaces}

  setup do
    id = Ecto.UUID.generate()

    Repo.query!("INSERT INTO users (id, email, name) VALUES ($1, $2, $3)", [
      Ecto.UUID.dump!(id),
      "ai-usage-#{System.unique_integer([:positive])}@example.com",
      "AI Usage"
    ])

    user = Repo.get!(User, id)
    {:ok, workspace} = Workspaces.ensure_personal_workspace(user.id)

    entitlement =
      workspace
      |> Entitlements.for_workspace()
      |> put_in([:limits, "aiParsesPerCycle"], 2)

    on_exit(fn ->
      Repo.delete_all(from(e in Event, where: e.workspace_id == ^workspace.id))
      Repo.delete_all(from(r in Reservation, where: r.workspace_id == ^workspace.id))
      Repo.delete!(workspace)
      Repo.delete!(user)
    end)

    %{entitlement: entitlement, user: user}
  end

  test "reserves atomically without tolerance and reuses an idempotent request", context do
    assert {:ok, first} =
             AiUsage.reserve(context.entitlement, context.user.id, idempotency_key: "first")

    assert {:ok, repeated} =
             AiUsage.reserve(context.entitlement, context.user.id, idempotency_key: "first")

    assert repeated.reservation.id == first.reservation.id

    assert Repo.aggregate(
             from(r in Reservation, where: r.workspace_id == ^context.entitlement.workspace_id),
             :count
           ) == 1

    assert {:ok, second} =
             AiUsage.reserve(context.entitlement, context.user.id, idempotency_key: "second")

    assert second.alert == "limit_reached"

    assert {:error, :limit_reached} =
             AiUsage.reserve(context.entitlement, context.user.id, idempotency_key: "third")

    assert {:ok, _released} = AiUsage.release(first.reservation)

    assert {:ok, replacement} =
             AiUsage.reserve(context.entitlement, context.user.id, idempotency_key: "replacement")

    assert replacement.alert == "limit_reached"
  end

  test "rejects reuse of an idempotency key for a different actor", context do
    assert {:ok, _} =
             AiUsage.reserve(context.entitlement, context.user.id, idempotency_key: "same-key")

    assert {:error, :idempotency_conflict} =
             AiUsage.reserve(context.entitlement, Ecto.UUID.generate(),
               idempotency_key: "same-key"
             )
  end
end
