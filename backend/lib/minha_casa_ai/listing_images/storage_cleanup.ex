defmodule MinhaCasaAi.ListingImages.StorageCleanup do
  @moduledoc false

  alias MinhaCasaAi.Workers.StorageCleanupWorker

  def enqueue(opts) when is_list(opts) do
    keys = normalize(Keyword.get(opts, :keys, []))
    prefixes = normalize(Keyword.get(opts, :prefixes, []))

    if keys == [] and prefixes == [] do
      {:ok, nil}
    else
      %{"keys" => keys, "prefixes" => prefixes}
      |> StorageCleanupWorker.new()
      |> Oban.insert()
    end
  end

  def enqueue!(opts) when is_list(opts) do
    case enqueue(opts) do
      {:ok, job} -> job
      {:error, reason} -> raise "could not enqueue storage cleanup: #{inspect(reason)}"
    end
  end

  def stale_keys(previous_keys, active_keys) do
    active = active_keys |> normalize() |> MapSet.new()
    previous_keys |> normalize() |> Enum.reject(&MapSet.member?(active, &1))
  end

  defp normalize(values) when is_list(values) do
    values
    |> Enum.filter(&is_binary/1)
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> Enum.uniq()
  end

  defp normalize(_), do: []
end
