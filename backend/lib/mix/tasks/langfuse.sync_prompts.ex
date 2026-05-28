defmodule Mix.Tasks.Langfuse.SyncPrompts do
  @shortdoc "Writes priv/langfuse/prompts.snapshot.json and optionally pushes prompts to Langfuse"
  @moduledoc false

  use Mix.Task

  alias MinhaCasaAi.Integrations.Langfuse.{Client, PromptDefinitions}

  @snapshot_path "priv/langfuse/prompts.snapshot.json"

  @impl Mix.Task
  def run(args) do
    Mix.Task.run("app.start")

    push? = "--push" in args
    label = if "--staging" in args, do: "staging", else: "production"

    snapshot = build_snapshot()
    write_snapshot!(snapshot)

    if push? do
      push_prompts!(snapshot, label)
    end

    Mix.shell().info("Wrote #{@snapshot_path} (#{map_size(snapshot)} prompts)")
    if push?, do: Mix.shell().info("Pushed prompts with label #{label}")
  end

  defp build_snapshot do
    PromptDefinitions.all()
    |> Map.new(fn %{"name" => name, "prompt" => prompt} = entry ->
      {name,
       %{
         "version" => 1,
         "type" => Map.get(entry, "type", "text"),
         "prompt" => String.trim(prompt)
       }}
    end)
  end

  defp write_snapshot!(snapshot) do
    path = Path.join(:code.priv_dir(:minha_casa_ai), "langfuse/prompts.snapshot.json")
    path = if File.exists?(path), do: path, else: Path.join("priv", @snapshot_path)

    File.mkdir_p!(Path.dirname(path))
    File.write!(path, Jason.encode!(snapshot, pretty: true))
  end

  defp push_prompts!(snapshot, label) do
    Enum.each(snapshot, fn {name, entry} ->
      body = %{
        "name" => name,
        "type" => entry["type"] || "text",
        "prompt" => entry["prompt"],
        "labels" => [label]
      }

      case Client.create_prompt(body) do
        {:ok, _} ->
          :ok

        {:error, {:langfuse_http_error, 409, _}} ->
          :ok

        {:error, reason} ->
          Mix.shell().error("Failed to push #{name}: #{inspect(reason)}")
      end
    end)
  end
end
