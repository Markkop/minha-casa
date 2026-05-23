defmodule MinhaCasaAi.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      MinhaCasaAiWeb.Telemetry,
      MinhaCasaAi.Repo,
      {Phoenix.PubSub, name: MinhaCasaAi.PubSub},
      {Oban, Application.fetch_env!(:minha_casa_ai, Oban)},
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
