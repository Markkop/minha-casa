defmodule MinhaCasaAi.Assistant.LLM do
  @moduledoc """
  Optional LLM fallback with tool calling for ambiguous natural-language requests.
  """

  alias MinhaCasaAi.Assistant.Tools
  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Integrations.Langfuse.PromptHelpers
  alias MinhaCasaAi.Integrations.OpenAIResponses

  @tools [
    %{
      type: "function",
      name: "list_collections",
      description: "List user collections",
      parameters: %{
        type: "object",
        properties: %{},
        required: [],
        additionalProperties: false
      },
      strict: true
    },
    %{
      type: "function",
      name: "list_recent_listings",
      description: "List recent listings in default collection",
      parameters: %{
        type: "object",
        properties: %{},
        required: [],
        additionalProperties: false
      },
      strict: true
    },
    %{
      type: "function",
      name: "list_favorites",
      description: "List starred/favorite listings",
      parameters: %{
        type: "object",
        properties: %{},
        required: [],
        additionalProperties: false
      },
      strict: true
    }
  ]

  def run(user_id, text, ctx) do
    if Config.assistant_llm_enabled?() and Config.configured?(:openai) do
      do_run(user_id, text, ctx)
    else
      Tools.run(user_id, :help, ctx)
    end
  end

  defp do_run(user_id, text, ctx) do
    {instructions, prompt_ref} = PromptHelpers.compile("assistant/instructions", %{})
    lf =
      case PromptHelpers.langfuse_ctx("assistant/llm", prompt_ref) do
        nil -> nil
        ctx -> Map.put(ctx, :metadata, Map.merge(ctx[:metadata] || %{}, %{user_id: user_id}))
      end

    case OpenAIResponses.with_tools(instructions, text, @tools,
           reasoning_effort: "low",
           max_output_tokens: 1_500,
           timeout: 55_000,
           langfuse: lf
         ) do
      {:ok, resp} ->
        case OpenAIResponses.extract_function_call(resp) do
          {:ok, %{"name" => name}} ->
            execute_tool(user_id, name, ctx)

          :none ->
            case OpenAIResponses.extract_output_text(resp) do
              {:ok, content} -> {:ok, String.trim(content)}
              _ -> Tools.run(user_id, :help, ctx)
            end
        end

      _ ->
        Tools.run(user_id, :help, ctx)
    end
  end

  defp execute_tool(user_id, name, ctx) do
    command =
      case name do
        "list_collections" -> :list_collections
        "list_recent_listings" -> :list_listings
        "list_favorites" -> :list_favorites
        _ -> :help
      end

    Tools.run(user_id, command, ctx)
  end
end
