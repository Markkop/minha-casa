defmodule MinhaCasaAi.PropertyAnalyses.Limits do
  @moduledoc """
  Configurable caps for /analise photo inventory (aligned with listing ingest max).
  """

  @ingest_max_images 40

  def max_images do
    Application.get_env(:minha_casa_ai, MinhaCasaAi.Config, [])
    |> Keyword.get(:property_analysis_max_images, @ingest_max_images)
    |> clamp_int(1, @ingest_max_images)
  end

  def photo_concurrency do
    Application.get_env(:minha_casa_ai, MinhaCasaAi.Config, [])
    |> Keyword.get(:property_analysis_photo_concurrency, 4)
    |> clamp_int(1, 8)
  end

  def ingest_max_images, do: @ingest_max_images

  defp clamp_int(value, min, max) when is_integer(value), do: max(min, min(value, max))

  defp clamp_int(value, min, max) when is_binary(value) do
    case Integer.parse(value) do
      {n, _} -> clamp_int(n, min, max)
      :error -> min
    end
  end

  defp clamp_int(_, min, _), do: min
end
