defmodule MinhaCasaAiWeb.Router do
  use MinhaCasaAiWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :internal_api do
    plug MinhaCasaAiWeb.Plugs.InternalAuth
  end

  pipeline :authenticated do
    plug MinhaCasaAiWeb.Plugs.JwtAuth
  end

  scope "/", MinhaCasaAiWeb do
    pipe_through :api

    get "/health", HealthController, :show
    get "/webhooks/whatsapp", WhatsAppWebhookController, :verify
    post "/webhooks/whatsapp", WhatsAppWebhookController, :receive
    post "/webhooks/telegram", TelegramWebhookController, :receive
    post "/mcp", McpController, :handle
    get "/api/shared/:token", CollectionController, :shared
    get "/api/short-links/:short_id", ShortLinkController, :show
  end

  scope "/api", MinhaCasaAiWeb do
    pipe_through [:api, :authenticated]

    get "/me", UserController, :me
    get "/organizations", OrganizationController, :index
    post "/organizations", OrganizationController, :create
    get "/organizations/:id", OrganizationController, :show
    put "/organizations/:id", OrganizationController, :update
    delete "/organizations/:id", OrganizationController, :delete
    get "/organizations/:id/members", OrganizationController, :members
    post "/organizations/:id/members", OrganizationController, :add_member
    put "/organizations/:id/members/:user_id", OrganizationController, :update_member
    delete "/organizations/:id/members/:user_id", OrganizationController, :remove_member

    post "/whatsapp/link", WhatsAppLinkController, :link
    get "/whatsapp/status", WhatsAppLinkController, :status
    post "/telegram/link", TelegramLinkController, :link
    get "/telegram/status", TelegramLinkController, :status

    post "/property-analyses", PropertyAnalysisController, :create
    get "/property-analyses/:id", PropertyAnalysisController, :show
    post "/property-analyses/:id/steps/:step/retry", PropertyAnalysisController, :retry_step

    post "/property-analyses/:id/ambientes/:ambiente_id/xray/retry",
         PropertyAnalysisController,
         :retry_card_xray

    get "/listings/:listing_id/analyses/latest", PropertyAnalysisController, :latest

    get "/portal-searches", PortalSearchController, :index
    post "/portal-searches", PortalSearchController, :create
    get "/portal-searches/:id", PortalSearchController, :show
    patch "/portal-searches/:id", PortalSearchController, :update
    post "/portal-searches/:id/runs", PortalSearchController, :create_run
    get "/portal-searches/:id/runs/:run_id", PortalSearchController, :show_run
    get "/portal-searches/:id/runs/:run_id/cards", PortalSearchController, :list_cards
    get "/portal-searches/:id/runs/:run_id/cost", PortalSearchController, :run_cost

    get "/workspace/saved-links", SavedLinkController, :index
    post "/workspace/saved-links", SavedLinkController, :create
    get "/workspace/saved-links/:id", SavedLinkController, :show
    put "/workspace/saved-links/:id", SavedLinkController, :update
    delete "/workspace/saved-links/:id", SavedLinkController, :delete
    post "/workspace/saved-links/:id/enrich", SavedLinkController, :enrich

    get "/workspace/contacts", WorkspaceController, :contacts_index
    post "/workspace/contacts", WorkspaceController, :contacts_create
    put "/workspace/contacts/:id", WorkspaceController, :contacts_update
    delete "/workspace/contacts/:id", WorkspaceController, :contacts_delete

    get "/workspace/regions", WorkspaceController, :regions_index
    post "/workspace/regions", WorkspaceController, :regions_create
    put "/workspace/regions/:id", WorkspaceController, :regions_update
    delete "/workspace/regions/:id", WorkspaceController, :regions_delete

    get "/workspace/condominiums", WorkspaceController, :condominiums_index
    post "/workspace/condominiums", WorkspaceController, :condominiums_create
    put "/workspace/condominiums/:id", WorkspaceController, :condominiums_update
    delete "/workspace/condominiums/:id", WorkspaceController, :condominiums_delete

    get "/workspace/comparison-notes", WorkspaceController, :comparison_notes_index
    post "/workspace/comparison-notes", WorkspaceController, :comparison_notes_upsert

    get "/collections", CollectionController, :index
    post "/collections", CollectionController, :create
    get "/collections/:id", CollectionController, :show
    put "/collections/:id", CollectionController, :update
    delete "/collections/:id", CollectionController, :delete
    post "/collections/:id/share", CollectionController, :share
    delete "/collections/:id/share", CollectionController, :revoke_share
    get "/collections/:id/listings", CollectionController, :listings
    post "/collections/:id/listings", CollectionController, :create_listing
    get "/collections/:id/listings/:listing_id", CollectionController, :show_listing
    put "/collections/:id/listings/:listing_id", CollectionController, :update_listing
    delete "/collections/:id/listings/:listing_id", CollectionController, :delete_listing
  end

  scope "/api", MinhaCasaAiWeb do
    pipe_through [:api, :internal_api]

    post "/parse", ParseController, :create
    post "/listings/check-duplicate", ListingsDuplicateController, :check
    post "/listings/:id/ingest-images", ListingImageController, :ingest
    get "/listings/:id/images/:index", ListingImageController, :show
    post "/attachments", AttachmentController, :create
    post "/workflows/ingestions", WorkflowController, :create
    get "/workflows/:id", WorkflowController, :show
    post "/workflows/:id/confirm", WorkflowController, :confirm
    post "/chat/messages", ChatController, :create
    get "/saved-links", SavedLinkController, :index
    post "/saved-links", SavedLinkController, :create
    get "/saved-links/:id", SavedLinkController, :show
    put "/saved-links/:id", SavedLinkController, :update
    delete "/saved-links/:id", SavedLinkController, :delete
    post "/saved-links/:id/enrich", SavedLinkController, :enrich
    get "/listings/:listing_id/nearby", ListingNearbyController, :show
    get "/portal-searches/:id/runs/:run_id/stream", PortalSearchController, :stream
  end
end
