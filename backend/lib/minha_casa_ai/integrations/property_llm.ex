defmodule MinhaCasaAi.Integrations.PropertyLlm do
  @moduledoc """
  Shared OpenAI client for property analysis agents (chat + vision JSON).
  """

  alias MinhaCasaAi.Config

  @default_chat_model "gpt-4o-mini"
  @default_vision_model "gpt-4o"

  def chat_json(system_prompt, user_content, opts \\ []) do
    with {:ok, api_key} <- require_key() do
      model = Keyword.get(opts, :model, chat_model())
      temperature = Keyword.get(opts, :temperature, 0.3)
      max_tokens = Keyword.get(opts, :max_tokens, 2_500)
      timeout = Keyword.get(opts, :timeout, 55_000)

      body = %{
        model: model,
        messages: [
          %{role: "system", content: system_prompt},
          %{role: "user", content: user_content}
        ],
        temperature: temperature,
        max_tokens: max_tokens,
        response_format: %{type: "json_object"}
      }

      case post_completions(api_key, body, timeout) do
        {:ok, content} -> decode_json_object(content)
        error -> error
      end
    end
  end

  def vision_json(system_prompt, data_url, user_text \\ nil, opts \\ []) do
    with {:ok, api_key} <- require_key() do
      model = Keyword.get(opts, :model, vision_model())
      temperature = Keyword.get(opts, :temperature, 0.2)
      max_tokens = Keyword.get(opts, :max_tokens, 1_200)
      timeout = Keyword.get(opts, :timeout, 90_000)

      text =
        user_text ||
          "Catalogue apenas fatos visíveis nesta foto (materiais, sistemas, acabamentos)."

      body = %{
        model: model,
        messages: [
          %{role: "system", content: system_prompt},
          %{
            role: "user",
            content: [
              %{type: "text", text: text},
              %{type: "image_url", image_url: %{url: data_url}}
            ]
          }
        ],
        temperature: temperature,
        max_tokens: max_tokens,
        response_format: %{type: "json_object"}
      }

      case post_completions(api_key, body, timeout) do
        {:ok, content} -> decode_json_object(content)
        error -> error
      end
    end
  end

  defp chat_model do
    Application.get_env(:minha_casa_ai, MinhaCasaAi.Config, [])
    |> Keyword.get(:property_agent_chat_model, @default_chat_model)
  end

  defp vision_model do
    Application.get_env(:minha_casa_ai, MinhaCasaAi.Config, [])
    |> Keyword.get(:property_agent_vision_model, @default_vision_model)
  end

  defp require_key do
    if Config.configured?(:openai),
      do: {:ok, Config.openai_api_key()},
      else: {:error, :openai_not_configured}
  end

  defp post_completions(api_key, body, timeout) do
    url = "https://api.openai.com/v1/chat/completions"

    headers = [
      {"content-type", "application/json"},
      {"authorization", "Bearer #{api_key}"}
    ]

    case :hackney.post(url, headers, Jason.encode!(body),
           with_body: true,
           recv_timeout: timeout,
           pool: :default
         ) do
      {:ok, status, _, resp} when status in 200..299 and is_binary(resp) ->
        with {:ok, %{"choices" => [%{"message" => %{"content" => content}} | _]}} <- Jason.decode(resp),
             true <- is_binary(content) do
          {:ok, content}
        else
          _ -> {:error, :empty_ai_response}
        end

      _ ->
        {:error, :openai_error}
    end
  end

  defp decode_json_object(content) do
    case Jason.decode(content) do
      {:ok, map} when is_map(map) -> {:ok, map}
      _ -> {:error, :invalid_ai_json}
    end
  end
end
