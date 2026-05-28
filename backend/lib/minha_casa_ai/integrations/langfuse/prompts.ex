defmodule MinhaCasaAi.Integrations.Langfuse.Prompts do
  @moduledoc """
  Fetches prompts from Langfuse (cached) with snapshot fallback and `{{var}}` compilation.
  """

  alias MinhaCasaAi.Integrations.Langfuse.{Client, Config, DefaultPrompts}

  @table :langfuse_prompt_cache
  @ttl_ms 60_000

  @type prompt_ref :: %{name: String.t(), version: integer()}

  @doc """
  Returns `{compiled_text, prompt_ref}`.
  """
  def compile(name, vars \\ %{}, opts \\ []) when is_binary(name) and is_map(vars) do
    label = Keyword.get(opts, :label, Config.prompt_label())

    with {:ok, entry} <- fetch_entry(name, label) do
      compiled = compile_template(entry.prompt, vars)
      ref = %{name: name, version: entry.version}
      {:ok, compiled, ref}
    end
  end

  def compile!(name, vars \\ %{}, opts \\ []) do
    case compile(name, vars, opts) do
      {:ok, text, ref} -> {text, ref}
      {:error, reason} -> raise "Langfuse prompt #{name}: #{inspect(reason)}"
    end
  end

  def clear_cache do
    :ets.delete_all_objects(@table)
    :ok
  end

  def ensure_table! do
    case :ets.info(@table) do
      :undefined ->
        :ets.new(@table, [:named_table, :set, :public, read_concurrency: true])

      _ ->
        :ok
    end
  end

  defp fetch_entry(name, label) do
    ensure_table!()
    cache_key = {name, label}
    now = System.monotonic_time(:millisecond)

    case :ets.lookup(@table, cache_key) do
      [{^cache_key, entry, expires_at}] when expires_at > now ->
        {:ok, entry}

      _ ->
        load_entry(name, label, cache_key, now)
    end
  end

  defp load_entry(name, label, cache_key, now) do
    entry =
      case Client.get_prompt(name, label) do
        {:ok, body} -> parse_remote(body, name)
        _ -> nil
      end

    entry =
      case entry do
        {:ok, e} -> e
        _ -> load_default(name)
      end

    case entry do
      {:ok, e} ->
        :ets.insert(@table, {cache_key, e, now + @ttl_ms})
        {:ok, e}

      error ->
        error
    end
  end

  defp load_default(name) do
    case DefaultPrompts.get(name) do
      {:ok, entry} -> {:ok, normalize_entry(entry)}
      error -> error
    end
  end

  defp parse_remote(body, name) do
    prompt =
      body["prompt"] ||
        get_in(body, ["prompt", "prompt"]) ||
        body["text"]

    version = body["version"] || body["promptVersion"] || 0

    if is_binary(prompt) and prompt != "" do
      {:ok, %{name: name, version: version, prompt: prompt, type: body["type"] || "text"}}
    else
      {:error, :invalid_prompt_response}
    end
  end

  defp normalize_entry(entry) do
    %{
      name: entry.name,
      version: entry.version || 0,
      prompt: entry.prompt,
      type: entry.type || "text"
    }
  end

  def compile_template(template, vars) when is_binary(template) and is_map(vars) do
    Enum.reduce(vars, template, fn {key, value}, acc ->
      key =
        case key do
          k when is_atom(k) -> Atom.to_string(k)
          k when is_binary(k) -> k
          k -> to_string(k)
        end

      value = if is_binary(value), do: value, else: to_string(value)
      String.replace(acc, "{{#{key}}}", value)
    end)
  end
end
