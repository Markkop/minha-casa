defmodule MinhaCasaAi.Assistant.LLM do
  @moduledoc """
  Optional LLM fallback with tool calling for ambiguous natural-language requests.
  """

  alias MinhaCasaAi.Assistant.Tools
  alias MinhaCasaAi.Config

  @tools [
    %{
      type: "function",
      function: %{
        name: "list_collections",
        description: "List user collections",
        parameters: %{type: "object", properties: %{}}
      }
    },
    %{
      type: "function",
      function: %{
        name: "list_recent_listings",
        description: "List recent listings in default collection",
        parameters: %{type: "object", properties: %{}}
      }
    },
    %{
      type: "function",
      function: %{
        name: "list_favorites",
        description: "List starred/favorite listings",
        parameters: %{type: "object", properties: %{}}
      }
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
    messages = [
      %{
        role: "system",
        content:
          "Você é o assistente do Minha Casa (imóveis). Responda em português do Brasil. Use ferramentas quando o usuário pedir coleções, imóveis ou favoritos. Seja breve."
      },
      %{role: "user", content: text}
    ]

    case chat_completion(messages) do
      {:ok, %{"choices" => [%{"message" => %{"tool_calls" => [call | _]}} | _]}} ->
        execute_tool(user_id, call, ctx)

      {:ok, %{"choices" => [%{"message" => %{"content" => content}} | _]}} when is_binary(content) ->
        {:ok, String.trim(content)}

      _ ->
        Tools.run(user_id, :help, ctx)
    end
  end

  defp execute_tool(user_id, %{"function" => %{"name" => name}}, ctx) do
    command =
      case name do
        "list_collections" -> :list_collections
        "list_recent_listings" -> :list_listings
        "list_favorites" -> :list_favorites
        _ -> :help
      end

    Tools.run(user_id, command, ctx)
  end

  defp execute_tool(user_id, _, ctx), do: Tools.run(user_id, :help, ctx)

  defp chat_completion(messages) do
    if Config.configured?(:openai) do
      api_key = Config.openai_api_key()
      url = "https://api.openai.com/v1/chat/completions"

      body = %{
        model: "gpt-4o-mini",
        messages: messages,
        tools: @tools,
        tool_choice: "auto",
        temperature: 0.2
      }

      case Req.post(url,
             json: body,
             headers: [{"authorization", "Bearer #{api_key}"}, {"content-type", "application/json"}]
           ) do
        {:ok, %{status: status, body: resp}} when status in 200..299 -> {:ok, resp}
        other -> other
      end
    else
      {:error, :openai_not_configured}
    end
  end

end
