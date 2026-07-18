defmodule MinhaCasaAi.Integrations.Langfuse.PromptCache do
  @moduledoc false

  use GenServer

  @table :langfuse_prompt_cache

  def start_link(_opts), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    if :ets.info(@table) == :undefined do
      :ets.new(@table, [:named_table, :set, :public, read_concurrency: true])
    end

    {:ok, %{}}
  end
end
