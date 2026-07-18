defmodule MinhaCasaAiWeb.UserController do
  use MinhaCasaAiWeb, :controller

  def me(conn, _params) do
    is_admin = conn.assigns[:current_user_is_admin] == true
    workspace = conn.assigns.current_workspace

    json(conn, %{
      user: %{
        id: conn.assigns.current_user_id,
        isAdmin: is_admin,
        isSuperAdmin: is_admin,
        superAdmin: is_admin
      },
      context: %{
        workspaceId: conn.assigns.current_workspace_id,
        workspaceType: workspace.type,
        workspaceStatus: workspace.status,
        organizationId: conn.assigns[:current_org_id],
        access: conn.assigns.current_workspace_access
      }
    })
  end
end
