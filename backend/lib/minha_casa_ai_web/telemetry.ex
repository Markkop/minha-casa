defmodule MinhaCasaAiWeb.Telemetry do
  use Supervisor

  def start_link(arg) do
    Supervisor.start_link(__MODULE__, arg, name: __MODULE__)
  end

  @impl true
  def init(_arg) do
    children = [
      {:telemetry_poller, measurements: periodic_measurements(), period: 10_000}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end

  defp periodic_measurements do
    [
      {__MODULE__, :dispatch_vm_metrics, []}
    ]
  end

  def dispatch_vm_metrics do
    :telemetry.execute([:minha_casa_ai, :vm], %{memory: :erlang.memory(:total)}, %{})
  end
end
