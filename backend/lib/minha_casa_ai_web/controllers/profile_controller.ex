defmodule MinhaCasaAiWeb.ProfileController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.{Entitlements, Workspaces}

  def index(conn, _params) do
    profiles =
      conn.assigns.current_user_id
      |> Workspaces.list_profiles()
      |> Enum.map(&with_entitlement/1)

    json(conn, %{
      profiles: profiles,
      activeWorkspaceId: conn.assigns.current_workspace_id
    })
  end

  defp with_entitlement(%{type: "external"} = profile) do
    Map.merge(profile, %{plan: nil, capabilities: %{canParse: false, canShare: false}})
  end

  defp with_entitlement(profile) do
    {:ok, entitlement} = Entitlements.for_workspace_id(profile.workspaceId)

    Map.merge(profile, %{
      status: entitlement.workspace_status,
      plan: entitlement.plan_slug,
      capabilities: %{
        canParse: entitlement.workspace_status == "active",
        canShareReadOnly: entitlement.limits["canShareReadOnly"] == true,
        canShareEditable: entitlement.limits["canShareEditable"] == true
      },
      limits: %{
        collections: entitlement.limits["collectionsLimit"],
        listings: entitlement.limits["listingsLimit"]
      }
    })
  end
end
