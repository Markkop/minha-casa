defmodule MinhaCasaAi.Listings.MergeAdvisor do
  @moduledoc """
  LLM judge for duplicate imports: given the imported listing, the existing
  (target) listing, the heuristic duplicate signals and the field diff, decides
  whether they are really the same property and, when they are, suggests only
  the field updates worth applying.
  """

  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Integrations.Langfuse.PromptHelpers
  alias MinhaCasaAi.Integrations.{OpenAIResponses, OpenAISchemas}

  @data_drop_keys ~w(
    imageStorageKeys imageFingerprints imageEnvironments
    imageIngestionStatus imageIngestionError imageUrls
  )

  @doc """
  Returns `{:ok, %{"verdict" => ..., "confidence" => ..., "suggestions" => [...]}}`
  or `{:error, reason}` when OpenAI is unavailable or the answer is unusable.
  """
  def advise(imported_data, current_data, fields, signals)
      when is_map(imported_data) and is_map(current_data) and is_list(fields) do
    {instructions, prompt_ref} = PromptHelpers.compile("listing-merge/advisor", %{})
    lf = PromptHelpers.langfuse_ctx("listing-merge/advisor", prompt_ref)

    with :ok <- require_key(),
         {:ok, map} <-
           OpenAIResponses.json(
             instructions,
             user_content(imported_data, current_data, fields, signals),
             reasoning_effort: "low",
             max_output_tokens: 1_500,
             timeout: 45_000,
             schema: %{name: "merge_advisor", schema: OpenAISchemas.merge_advisor_schema()},
             langfuse: lf
           ) do
      normalize(map, fields)
    end
  end

  @doc """
  Validates and coerces the raw advisor response against the field diff:
  drops suggestions for unknown paths and values that do not match the field's
  valueType.
  """
  def normalize(map, fields) when is_map(map) and is_list(fields) do
    case map["verdict"] do
      verdict when verdict in ["duplicate", "distinct"] ->
        fields_by_path = Map.new(fields, &{&1["path"], &1})

        suggestions =
          map
          |> Map.get("suggestions")
          |> List.wrap()
          |> Enum.flat_map(&normalize_suggestion(&1, fields_by_path))
          |> Enum.uniq_by(& &1["path"])

        {:ok,
         %{
           "verdict" => verdict,
           "confidence" => clamp_confidence(map["confidence"]),
           "suggestions" => if(verdict == "duplicate", do: suggestions, else: [])
         }}

      _ ->
        {:error, :invalid_ai_json}
    end
  end

  def normalize(_, _), do: {:error, :invalid_ai_json}

  defp normalize_suggestion(%{"path" => path} = suggestion, fields_by_path)
       when is_binary(path) do
    case Map.get(fields_by_path, path) do
      %{} = field ->
        case coerce_value(suggestion["suggestedValue"], field["valueType"]) do
          {:ok, value} ->
            [
              %{
                "path" => path,
                "suggestedValue" => value,
                "note" => normalize_note(suggestion["note"])
              }
            ]

          :error ->
            []
        end

      _ ->
        []
    end
  end

  defp normalize_suggestion(_, _), do: []

  defp coerce_value(value, "text") when is_binary(value) do
    case String.trim(value) do
      "" -> :error
      trimmed -> {:ok, trimmed}
    end
  end

  defp coerce_value(value, "number") when is_number(value), do: {:ok, value}

  defp coerce_value(value, "number") when is_binary(value) do
    normalized = value |> String.trim() |> String.replace(",", ".")

    case Float.parse(normalized) do
      {parsed, ""} -> {:ok, if(parsed == trunc(parsed), do: trunc(parsed), else: parsed)}
      _ -> :error
    end
  end

  defp coerce_value(value, "boolean") when is_boolean(value), do: {:ok, value}
  defp coerce_value("true", "boolean"), do: {:ok, true}
  defp coerce_value("false", "boolean"), do: {:ok, false}
  defp coerce_value(_, _), do: :error

  defp normalize_note(note) when is_binary(note) do
    case String.trim(note) do
      "" -> nil
      trimmed -> trimmed
    end
  end

  defp normalize_note(_), do: nil

  defp clamp_confidence(value) when is_number(value), do: value |> max(0.0) |> min(1.0)
  defp clamp_confidence(_), do: nil

  defp user_content(imported_data, current_data, fields, signals) do
    Jason.encode!(%{
      "signals" => signals || %{},
      "fieldDiff" =>
        Enum.map(fields, fn field ->
          Map.take(field, ["path", "label", "valueType", "currentValue", "incomingValue"])
        end),
      "imported" => compact_data(imported_data),
      "current" => compact_data(current_data)
    })
  end

  defp compact_data(data) when is_map(data) do
    data
    |> Map.drop(@data_drop_keys)
    |> Enum.reject(fn {_key, value} -> is_nil(value) end)
    |> Map.new()
  end

  defp require_key do
    if Config.configured?(:openai), do: :ok, else: {:error, :openai_not_configured}
  end
end
