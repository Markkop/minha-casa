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
  end
end
