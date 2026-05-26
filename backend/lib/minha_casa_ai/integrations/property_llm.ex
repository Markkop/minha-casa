defmodule MinhaCasaAi.Integrations.PropertyLlm do
  @moduledoc """
  Shared OpenAI client for property analysis agents (chat + vision JSON).
  Delegates to the Responses API via `OpenAIResponses`.
  """

  alias MinhaCasaAi.Integrations.OpenAIResponses
  alias MinhaCasaAi.Integrations.OpenAISchemas

  def chat_json(system_prompt, user_content, opts \\ []) do
    OpenAIResponses.json(system_prompt, user_content, normalize_opts(opts))
  end

  def vision_json(system_prompt, data_url, user_text \\ nil, opts \\ []) do
    schema = Keyword.get(opts, :schema, inventariante_schema())

    opts
    |> normalize_opts(max_output_tokens: 3_000, reasoning_effort: "low")
    |> Keyword.put(:schema, schema)
    |> then(&OpenAIResponses.vision_json(system_prompt, data_url, user_text, &1))
  end

  defp normalize_opts(opts, defaults \\ []) do
    max_out =
      Keyword.get(opts, :max_output_tokens) ||
        Keyword.get(opts, :max_tokens) ||
        Keyword.get(defaults, :max_output_tokens, 2_500)

    opts
    |> Keyword.merge(defaults)
    |> Keyword.put(:max_output_tokens, max_out)
    |> Keyword.delete(:max_tokens)
    |> Keyword.delete(:temperature)
  end

  defp inventariante_schema do
    %{
      name: "inventariante_inventory",
      schema: OpenAISchemas.inventariante_schema()
    }
  end
end
