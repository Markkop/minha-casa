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

  pipeline :subscribed do
    plug MinhaCasaAiWeb.Plugs.RequireSubscription
  end

  scope "/", MinhaCasaAiWeb do
    pipe_through :api

    get "/health", HealthController, :show
    get "/webhooks/whatsapp", WhatsAppWebhookController, :verify
    post "/webhooks/whatsapp", WhatsAppWebhookController, :receive
    post "/webhooks/telegram", TelegramWebhookController, :receive
    post "/api/webhooks/stripe", StripeWebhookController, :receive
    get "/api/shared/:token", CollectionController, :shared
    get "/api/financeiro/snapshots/:token", FinanceiroSnapshotController, :show
    get "/api/organization-invites/:token", OrganizationInviteController, :show
    get "/api/collaboration-invites/:token", CollectionSharingController, :invite_preview

    get "/api/shared/:token/listings/:listing_id/images/:index",
        ListingImageController,
        :shared_show

    get "/api/collections/public", CollectionController, :public_index
    get "/api/collections/public/:id", CollectionController, :public_show
    get "/api/short-links/:short_id", ShortLinkController, :show
    get "/api/plans", PlanController, :index
  end

  scope "/api", MinhaCasaAiWeb do
    pipe_through [:api, :authenticated]

    get "/me", UserController, :me
    get "/profiles", ProfileController, :index
    post "/shared/:token/claim", CollectionSharingController, :claim_link
    post "/collaboration-invites/:token/accept", CollectionSharingController, :accept_invite
    get "/subscriptions", SubscriptionController, :show_current
    post "/subscriptions", SubscriptionController, :create
    post "/checkout/session", SubscriptionController, :checkout
    post "/billing/portal", SubscriptionController, :portal
    get "/addons/access/:slug", AddonController, :access
    get "/user/addons", AddonController, :user_index
    patch "/user/addons/:slug", AddonController, :update_user
    delete "/user/addons/:slug", AddonController, :delete_user

    get "/admin/users", AdminController, :users
    get "/admin/plans", AdminController, :plans
    patch "/admin/users/:user_id", AdminController, :update_user
    delete "/admin/users/:user_id", AdminController, :delete_user
    get "/admin/stats", AdminController, :stats
    get "/admin/addons", AdminController, :addons
    get "/admin/stripe/reconciliation", AdminController, :stripe_reconciliation
    patch "/admin/plans/:slug", AdminController, :update_plan
    get "/admin/subscriptions/:id", AdminController, :subscription
    patch "/admin/subscriptions/:id", AdminController, :update_subscription
    get "/admin/subscriptions/user/:user_id", AdminController, :user_subscriptions
    get "/admin/users/:user_id/addons", AdminController, :user_addons
    post "/admin/users/:user_id/addons", AdminController, :grant_user_addon
    delete "/admin/users/:user_id/addons/:slug", AdminController, :revoke_user_addon
    get "/admin/organizations/addons", AdminController, :organizations_addons
    get "/admin/organizations/:org_id/addons", AdminController, :organization_addons
    post "/admin/organizations/:org_id/addons", AdminController, :grant_organization_addon

    delete "/admin/organizations/:org_id/addons/:slug",
           AdminController,
           :revoke_organization_addon

    get "/organizations", OrganizationController, :index
    get "/organizations/:id", OrganizationController, :show
    patch "/agencies/:id", OrganizationController, :update_agency
    get "/organizations/:id/members", OrganizationController, :members
    post "/organizations/:id/members", OrganizationController, :add_member
    put "/organizations/:id/members/:user_id", OrganizationController, :update_member
    delete "/organizations/:id/members/:user_id", OrganizationController, :remove_member
    get "/organizations/:id/invites", OrganizationController, :invites
    post "/organizations/:id/invites", OrganizationController, :create_invite
    delete "/organizations/:id/invites/:invite_id", OrganizationController, :revoke_invite
    post "/organization-invites/:token/accept", OrganizationInviteController, :accept
    get "/organizations/:id/addons", AddonController, :organization_index
    patch "/organizations/:id/addons/:slug", AddonController, :update_organization
    delete "/organizations/:id/addons/:slug", AddonController, :delete_organization

    post "/whatsapp/link", WhatsAppLinkController, :link
    get "/whatsapp/status", WhatsAppLinkController, :status
    post "/telegram/link", TelegramLinkController, :link
    get "/telegram/status", TelegramLinkController, :status
  end

  scope "/", MinhaCasaAiWeb do
    pipe_through [:api, :authenticated]

    post "/mcp", McpController, :handle
  end

  scope "/api", MinhaCasaAiWeb do
    pipe_through [:api, :authenticated, :subscribed]

    post "/property-analyses", PropertyAnalysisController, :create
    get "/property-analyses/:id", PropertyAnalysisController, :show
    post "/property-analyses/:id/steps/:step/retry", PropertyAnalysisController, :retry_step

    post "/property-analyses/:id/ambientes/:ambiente_id/xray/retry",
         PropertyAnalysisController,
         :retry_card_xray

    get "/listings/:listing_id/analyses/latest", PropertyAnalysisController, :latest
    post "/workspace/parse", ParseController, :create
    post "/workspace/listings/check-duplicate", ListingsDuplicateController, :check
    post "/workspace/listing-merge-sessions", ListingMergeSessionController, :create
    get "/workspace/listing-merge-sessions/:id", ListingMergeSessionController, :show

    post "/workspace/listing-merge-sessions/:id/apply",
         ListingMergeSessionController,
         :apply_merge

    delete "/workspace/listing-merge-sessions/:id", ListingMergeSessionController, :delete

    get "/workspace/listing-merge-sessions/:id/images/:image_id",
        ListingMergeSessionController,
        :image

    post "/workspace/listings/:id/ingest-images", ListingImageController, :ingest
    get "/workspace/listings/:id/images/:index", ListingImageController, :show
    get "/workspace/listings/:listing_id/nearby", ListingNearbyController, :show

    get "/portal-searches", PortalSearchController, :index
    post "/portal-searches", PortalSearchController, :create
    get "/portal-searches/:id", PortalSearchController, :show
    patch "/portal-searches/:id", PortalSearchController, :update
    post "/portal-searches/:id/runs", PortalSearchController, :create_run
    get "/portal-searches/:id/runs/:run_id/stream", PortalSearchController, :stream
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

    get "/workspace/listing-preferences", WorkspaceController, :listing_preferences_index
    put "/workspace/listing-preferences", WorkspaceController, :listing_preferences_update

    get "/workspace/comparison-notes", WorkspaceController, :comparison_notes_index
    post "/workspace/comparison-notes", WorkspaceController, :comparison_notes_upsert

    get "/collections", CollectionController, :index
    post "/collections", CollectionController, :create
    get "/collections/:id", CollectionController, :show
    put "/collections/:id", CollectionController, :update
    delete "/collections/:id", CollectionController, :delete
    post "/collections/:id/share", CollectionController, :share
    delete "/collections/:id/share", CollectionController, :revoke_share
    post "/collections/:id/collaboration-invites", CollectionSharingController, :create_invite
    delete "/collections/:id/grants/:grant_id", CollectionSharingController, :revoke_grant
    post "/collections/:id/copy", CollectionController, :copy
    post "/collections/:id/sync-listing-titles", CollectionController, :sync_listing_titles
    get "/collections/:id/financeiro-scenarios", FinanceiroScenarioController, :index
    post "/collections/:id/financeiro-scenarios", FinanceiroScenarioController, :create

    patch "/collections/:id/financeiro-scenarios/:scenario_id",
          FinanceiroScenarioController,
          :update

    delete "/collections/:id/financeiro-scenarios/:scenario_id",
           FinanceiroScenarioController,
           :delete

    post "/collections/:id/financeiro-scenarios/import-shared",
         FinanceiroScenarioController,
         :import_shared

    get "/collections/:id/listings", CollectionController, :listings
    post "/collections/:id/listings", CollectionController, :create_listing
    get "/collections/:id/listings/:listing_id", CollectionController, :show_listing
    put "/collections/:id/listings/:listing_id", CollectionController, :update_listing
    delete "/collections/:id/listings/:listing_id", CollectionController, :delete_listing

    post "/financeiro/snapshots", FinanceiroSnapshotController, :create
  end

  scope "/api", MinhaCasaAiWeb do
    pipe_through [:api, :internal_api]

    post "/parse", ParseController, :create
    post "/listings/check-duplicate", ListingsDuplicateController, :check
    post "/listing-merge-sessions", ListingMergeSessionController, :create
    get "/listing-merge-sessions/:id", ListingMergeSessionController, :show
    post "/listing-merge-sessions/:id/apply", ListingMergeSessionController, :apply_merge
    delete "/listing-merge-sessions/:id", ListingMergeSessionController, :delete
    get "/listing-merge-sessions/:id/images/:image_id", ListingMergeSessionController, :image
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
  end
end
