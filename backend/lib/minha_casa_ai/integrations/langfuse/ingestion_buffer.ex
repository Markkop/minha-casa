defmodule MinhaCasaAi.Integrations.Langfuse.IngestionBuffer do
  @moduledoc false
  use GenServer

  alias MinhaCasaAi.Integrations.Langfuse.{Client, Config}

  @flush_interval_ms 1_000
  @max_batch_size 50
  @max_queue_size 5_000

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def push(event) when is_map(event) do
    if Config.enabled?() do
      GenServer.cast(__MODULE__, {:push, event})
    end

    :ok
  end

  def flush do
    if Config.enabled?() do
      GenServer.call(__MODULE__, :flush, 30_000)
    else
      :ok
    end
  end

  @impl true
  def init(_opts) do
    schedule_flush()
    {:ok, %{queue: :queue.new(), flushing: false}}
  end

  @impl true
  def handle_cast({:push, event}, state) do
  queue =
      if :queue.len(state.queue) >= @max_queue_size do
        Logger.warning("langfuse ingestion queue full; dropping oldest event")
        {{:value, _}, rest} = :queue.out(state.queue)
        :queue.in(event, rest)
      else
        :queue.in(event, state.queue)
      end

    {:noreply, %{state | queue: queue}}
  end

  @impl true
  def handle_call(:flush, _from, state) do
    {events, queue} = drain_queue(state.queue, @max_queue_size)
    send_batch(events)
    {:reply, :ok, %{state | queue: queue}}
  end

  @impl true
  def handle_info(:flush, state) do
    schedule_flush()

    if not state.flushing and not :queue.is_empty(state.queue) do
      {events, queue} = drain_queue(state.queue, @max_batch_size)
      send_batch(events)
      {:noreply, %{state | queue: queue, flushing: false}}
    else
      {:noreply, state}
    end
  end

  defp schedule_flush do
    Process.send_after(self(), :flush, @flush_interval_ms)
  end

  defp drain_queue(queue, limit) do
    do_drain(queue, limit, [])
  end

  defp do_drain(queue, 0, acc), do: {Enum.reverse(acc), queue}

  defp do_drain(queue, limit, acc) do
    case :queue.out(queue) do
      {{:value, event}, rest} -> do_drain(rest, limit - 1, [event | acc])
      {:empty, _} -> {Enum.reverse(acc), queue}
    end
  end

  defp send_batch([]), do: :ok

  defp send_batch(events) do
    case Client.ingest_batch(events) do
      :ok ->
        :ok

      {:ok, _} ->
        :ok

      {:error, reason} ->
        Logger.warning("langfuse ingestion failed: #{inspect(reason)}")
        :ok
    end
  end
end
