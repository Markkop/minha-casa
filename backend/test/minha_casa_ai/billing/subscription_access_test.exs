defmodule MinhaCasaAi.Billing.SubscriptionAccessTest do
  use ExUnit.Case, async: false

  import Ecto.Query
  import Plug.Conn
  import Plug.Test

  alias MinhaCasaAi.Accounts.User
  alias MinhaCasaAi.Billing
  alias MinhaCasaAi.Billing.{Plan, Subscription}
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspaces
  alias MinhaCasaAiWeb.SubscriptionController
  alias MinhaCasaAiWeb.Plugs.RequireSubscription

  setup do
    suffix = System.unique_integer([:positive])

    user =
      Repo.insert!(%User{
        email: "billing-access-#{suffix}@example.com",
        name: "Billing Access #{suffix}"
      })

    plan =
      Repo.insert!(%Plan{
        name: "Billing Access #{suffix}",
        slug: "billing-access-#{suffix}",
        price_in_cents: 1_000,
        is_active: true,
        limits: %{}
      })

    {:ok, workspace} = Workspaces.ensure_personal_workspace(user.id)

    on_exit(fn ->
      Repo.delete_all(from s in Subscription, where: s.user_id == ^user.id)
      Repo.delete!(plan)
      Repo.delete!(workspace)
      Repo.delete!(user)
    end)

    %{user: user, plan: plan, workspace: workspace}
  end

  test "returns a current active subscription whose expiration is in the future", %{
    user: user,
    plan: plan
  } do
    subscription = insert_subscription(user, plan, "active", DateTime.add(now(), 60, :second))

    assert %{subscription: current, plan: current_plan} = Billing.current_subscription(user.id)
    assert current.id == subscription.id
    assert current_plan.id == plan.id
    assert Billing.active_subscription?(user.id)
  end

  test "does not return an active subscription whose expiration is in the past", %{
    user: user,
    plan: plan
  } do
    insert_subscription(user, plan, "active", DateTime.add(now(), -60, :second))

    assert Billing.current_subscription(user.id) == nil
    refute Billing.active_subscription?(user.id)
  end

  test "does not return a cancelled subscription even when its expiration is in the future", %{
    user: user,
    plan: plan
  } do
    insert_subscription(user, plan, "cancelled", DateTime.add(now(), 60, :second))

    assert Billing.current_subscription(user.id) == nil
    refute Billing.active_subscription?(user.id)
  end

  test "subscription plug allows a user with a valid subscription", %{
    user: user,
    plan: plan,
    workspace: workspace
  } do
    insert_subscription(user, plan, "active", DateTime.add(now(), 60, :second))

    conn =
      conn(:get, "/api/collections")
      |> assign(:current_user_id, user.id)
      |> assign(:current_user_is_admin, false)
      |> assign(:current_workspace, workspace)
      |> assign(:current_workspace_access, "owner")
      |> RequireSubscription.call([])

    refute conn.halted
  end

  test "subscription plug falls back to Free when a personal subscription is expired", %{
    user: user,
    plan: plan,
    workspace: workspace
  } do
    insert_subscription(user, plan, "active", DateTime.add(now(), -60, :second))

    conn =
      conn(:get, "/api/collections")
      |> assign(:current_user_id, user.id)
      |> assign(:current_user_is_admin, false)
      |> assign(:current_workspace, workspace)
      |> assign(:current_workspace_access, "owner")
      |> RequireSubscription.call([])

    refute conn.halted
    assert conn.assigns.current_entitlement.plan_slug == "free"
  end

  test "subscription plug allows a Super Admin personal workspace", %{
    user: user,
    workspace: workspace
  } do
    conn =
      conn(:get, "/api/collections")
      |> assign(:current_user_id, user.id)
      |> assign(:current_user_is_admin, true)
      |> assign(:current_workspace, workspace)
      |> assign(:current_workspace_access, "owner")
      |> RequireSubscription.call([])

    refute conn.halted
  end

  test "current subscription endpoint exposes the active access contract", %{
    user: user,
    plan: plan
  } do
    subscription = insert_subscription(user, plan, "active", DateTime.add(now(), 60, :second))

    response =
      conn(:get, "/api/subscriptions")
      |> assign(:current_user_id, user.id)
      |> SubscriptionController.show_current(%{})
      |> Map.fetch!(:resp_body)
      |> Jason.decode!()

    assert response["accessStatus"] == "active"
    assert response["hasActiveSubscription"] == true
    assert response["subscription"]["id"] == subscription.id
    assert response["plan"]["id"] == plan.id
  end

  test "current subscription endpoint exposes inactive access for an expired subscription", %{
    user: user,
    plan: plan
  } do
    insert_subscription(user, plan, "active", DateTime.add(now(), -60, :second))

    response =
      conn(:get, "/api/subscriptions")
      |> assign(:current_user_id, user.id)
      |> SubscriptionController.show_current(%{})
      |> Map.fetch!(:resp_body)
      |> Jason.decode!()

    assert response == %{
             "accessStatus" => "inactive",
             "hasActiveSubscription" => false,
             "plan" => nil,
             "subscription" => nil
           }
  end

  test "current subscription endpoint does not fabricate a subscription for a platform admin", %{
    user: user
  } do
    response =
      conn(:get, "/api/subscriptions")
      |> assign(:current_user_id, user.id)
      |> assign(:current_user_is_admin, true)
      |> SubscriptionController.show_current(%{})
      |> Map.fetch!(:resp_body)
      |> Jason.decode!()

    assert response == %{
             "accessStatus" => "inactive",
             "hasActiveSubscription" => false,
             "plan" => nil,
             "subscription" => nil
           }
  end

  defp insert_subscription(user, plan, status, expires_at) do
    Repo.insert!(%Subscription{
      user_id: user.id,
      plan_id: plan.id,
      status: status,
      starts_at: now(),
      expires_at: expires_at
    })
  end

  defp now, do: DateTime.utc_now() |> DateTime.truncate(:second)
end
