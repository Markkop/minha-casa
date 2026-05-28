defmodule MinhaCasaAi.Application do
  use Application

  @impl true
  def start(_type, _args) do
    {:ok, _} = Application.ensure_all_started(:hackney)

    children = [
      MinhaCasaAiWeb.Telemetry,
      MinhaCasaAi.Repo,
      {Finch, name: MinhaCasaAi.Finch},
      {Phoenix.PubSub, name: MinhaCasaAi.PubSub},
      {Oban, Application.fetch_env!(:minha_casa_ai, Oban)},
      MinhaCasaAi.Integrations.Langfuse.IngestionBuffer,
      MinhaCasaAiWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: MinhaCasaAi.Supervisor]
    Supervisor.start_link(children, opts)
  end

  @impl true
  def config_change(changed, _new, removed) do
    MinhaCasaAiWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
