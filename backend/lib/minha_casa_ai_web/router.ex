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
    post "/mcp", McpController, :handle
  end

  scope "/api", MinhaCasaAiWeb do
    pipe_through [:api, :internal_api]

    post "/parse", ParseController, :create
    post "/attachments", AttachmentController, :create
    post "/workflows/ingestions", WorkflowController, :create
    get "/workflows/:id", WorkflowController, :show
    post "/workflows/:id/confirm", WorkflowController, :confirm
    post "/chat/messages", ChatController, :create
  end
end
