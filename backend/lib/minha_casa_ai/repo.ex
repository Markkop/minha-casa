defmodule MinhaCasaAi.Repo do
  use Ecto.Repo,
    otp_app: :minha_casa_ai,
    adapter: Ecto.Adapters.Postgres
end
