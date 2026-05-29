defmodule MinhaCasaAiWeb.Router do
  use MinhaCasaAiWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :internal_api do
    plug MinhaCasaAiWeb.Plugs.InternalAuth
  end

  scope "/", MinhaCasaAiWeb do
    pipe_through :api

    get "/health", HealthController, :show
    get "/webhooks/whatsapp", WhatsAppWebhookController, :verify
    post "/webhooks/whatsapp", WhatsAppWebhookController, :receive
    post "/webhooks/telegram", TelegramWebhookController, :receive
    post "/mcp", McpController, :handle
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
    post "/whatsapp/link", WhatsAppLinkController, :link
    get "/whatsapp/status", WhatsAppLinkController, :status
    post "/telegram/link", TelegramLinkController, :link
    get "/telegram/status", TelegramLinkController, :status
    get "/saved-links", SavedLinkController, :index
    post "/saved-links", SavedLinkController, :create
    get "/saved-links/:id", SavedLinkController, :show
    put "/saved-links/:id", SavedLinkController, :update
    delete "/saved-links/:id", SavedLinkController, :delete
    post "/saved-links/:id/enrich", SavedLinkController, :enrich
    post "/property-analyses", PropertyAnalysisController, :create
    get "/property-analyses/:id", PropertyAnalysisController, :show
    post "/property-analyses/:id/steps/:step/retry", PropertyAnalysisController, :retry_step

    post "/property-analyses/:id/ambientes/:ambiente_id/xray/retry",
         PropertyAnalysisController,
         :retry_card_xray
    get "/listings/:listing_id/analyses/latest", PropertyAnalysisController, :latest
    get "/listings/:listing_id/nearby", ListingNearbyController, :show
    get "/portal-searches", PortalSearchController, :index
    post "/portal-searches", PortalSearchController, :create
    get "/portal-searches/:id", PortalSearchController, :show
    patch "/portal-searches/:id", PortalSearchController, :update
    post "/portal-searches/:id/runs", PortalSearchController, :create_run
    get "/portal-searches/:id/runs/:run_id", PortalSearchController, :show_run
    get "/portal-searches/:id/runs/:run_id/cards", PortalSearchController, :list_cards
    get "/portal-searches/:id/runs/:run_id/cost", PortalSearchController, :run_cost
    get "/portal-searches/:id/runs/:run_id/stream", PortalSearchController, :stream
  end
end
