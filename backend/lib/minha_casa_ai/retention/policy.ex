defmodule MinhaCasaAi.Retention.Policy do
  @moduledoc "Fixed inactivity retention windows for workspace tiers."

  @retention_days %{
    "free" => 30,
    "pro" => 360,
    "corretor" => 360,
    "imobiliaria" => 720
  }

  def tiers, do: Map.keys(@retention_days)

  def days_for_slug(slug) when is_binary(slug), do: Map.fetch(@retention_days, slug)
  def days_for_slug(_slug), do: :error

  def expires_at(%DateTime{} = activity_at, slug) do
    with {:ok, days} <- days_for_slug(slug) do
      {:ok, DateTime.add(activity_at, days, :day)}
    end
  end
end
