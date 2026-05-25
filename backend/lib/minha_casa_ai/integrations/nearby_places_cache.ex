defmodule MinhaCasaAi.Integrations.NearbyPlacesCache do
  @moduledoc """
  Long-lived in-memory cache for Google Places nearby results (per listing + coordinates).
  """

  @table :nearby_places_cache
  @ttl_ms 7 * 24 * 60 * 60 * 1000

  def fetch(cache_key, fun) when is_binary(cache_key) and is_function(fun, 0) do
    ensure_table()
    now = System.monotonic_time(:millisecond)

    case :ets.lookup(@table, cache_key) do
      [{^cache_key, data, expires_at}] when expires_at > now ->
        {:ok, data}

      _ ->
        data = fun.()
        expires_at = now + @ttl_ms
        :ets.insert(@table, {cache_key, data, expires_at})
        {:ok, data}
    end
  end

  defp ensure_table do
    case :ets.whereis(@table) do
      :undefined ->
        :ets.new(@table, [:named_table, :set, :public, read_concurrency: true])

      _ ->
        :ok
    end
  end
end
