defmodule MinhaCasaAiWeb.ApiConsolidationTest do
  use ExUnit.Case, async: true

  import Plug.Conn
  import Plug.Test

  alias MinhaCasaAi.Workspaces.Workspace
  alias MinhaCasaAiWeb.{ListingImageController, Router, UserController}

  test "me exposes the workspace context verified by JWT authentication" do
    workspace = %Workspace{id: "workspace-1", type: "organization", status: "active"}

    response =
      conn(:get, "/api/me")
      |> assign(:current_user_id, "user-1")
      |> assign(:current_user_is_admin, true)
      |> assign(:current_workspace_id, workspace.id)
      |> assign(:current_workspace, workspace)
      |> assign(:current_workspace_access, "admin")
      |> assign(:current_org_id, "organization-1")
      |> UserController.me(%{})
      |> Map.fetch!(:resp_body)
      |> Jason.decode!()

    assert response == %{
             "user" => %{
               "id" => "user-1",
               "isAdmin" => true,
               "isSuperAdmin" => true,
               "superAdmin" => true
             },
             "context" => %{
               "workspaceId" => "workspace-1",
               "workspaceType" => "organization",
               "workspaceStatus" => "active",
               "organizationId" => "organization-1",
               "access" => "admin"
             }
           }
  end

  test "canonical listing image route is authenticated and the internal route is namespaced" do
    canonical = Phoenix.Router.route_info(Router, "GET", "/api/listings/listing-1/images/0", "")
    internal = Phoenix.Router.route_info(Router, "GET", "/api/internal/listings/listing-1/images/0", "")
    shared =
      Phoenix.Router.route_info(
        Router,
        "GET",
        "/api/shared/share-token/listings/listing-1/images/0",
        ""
      )

    assert %{plug: ListingImageController, plug_opts: :show} = canonical
    assert %{plug: ListingImageController, plug_opts: :show} = internal
    assert %{plug: ListingImageController, plug_opts: :shared_show} = shared
    assert :authenticated in canonical.pipe_through
    assert :subscribed in canonical.pipe_through
    assert :internal_api in internal.pipe_through
    refute :authenticated in internal.pipe_through
    refute :authenticated in shared.pipe_through
    refute :internal_api in shared.pipe_through
  end
end
