defmodule MinhaCasaAi.Integrations.OpenAIResponses do
  @moduledoc """
  Shared OpenAI Responses API client (gpt-5.4-mini and successors).
  """

  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Integrations.Langfuse.OpenAI, as: LangfuseOpenAI

  @api_url "https://api.openai.com/v1/responses"

  def json(instructions, user_content, opts \\ []) do
    with {:ok, api_key} <- require_key() do
      body =
        base_body(opts)
        |> Map.put(:instructions, instructions)
        |> Map.put(:input, user_content)
        |> put_text_format(opts)

      timeout = Keyword.get(opts, :timeout, 55_000)
      model = body.model

      LangfuseOpenAI.wrap(
        Keyword.get(opts, :langfuse),
        model,
        instructions,
        user_content,
        fn -> post_and_decode_json(api_key, body, timeout) end
      )
    end
  end

  def vision_json(instructions, data_url, user_text \\ nil, opts \\ []) do
    text =
      user_text ||
        "Catalogue apenas fatos visíveis nesta foto (materiais, sistemas, acabamentos)."

    input = [
      %{
        role: "user",
        content: [
          %{type: "input_text", text: text},
          %{type: "input_image", image_url: data_url}
        ]
      }
    ]

    with {:ok, api_key} <- require_key() do
      body =
        base_body(opts)
        |> Map.put(:instructions, instructions)
        |> Map.put(:input, input)
        |> put_text_format(opts)

      timeout = Keyword.get(opts, :timeout, 90_000)
      model = body.model

      LangfuseOpenAI.wrap(
        Keyword.get(opts, :langfuse),
        model,
        instructions,
        %{user_text: text, image: "[image]"},
        fn -> post_and_decode_json(api_key, body, timeout) end
      )
    end
  end

  def with_tools(instructions, user_content, tools, opts \\ []) do
    with {:ok, api_key} <- require_key() do
      body =
        base_body(opts)
        |> Map.put(:instructions, instructions)
        |> Map.put(:input, user_content)
        |> Map.put(:tools, tools)
        |> Map.put(:tool_choice, Keyword.get(opts, :tool_choice, "auto"))

      timeout = Keyword.get(opts, :timeout, 55_000)
      model = body.model

      LangfuseOpenAI.wrap(
        Keyword.get(opts, :langfuse),
        model,
        instructions,
        user_content,
        fn ->
          case post(api_key, body, timeout) do
            {:ok, resp} -> {:ok, resp, resp}
            error -> error
          end
        end
      )
    end
  end

  def extract_output_text(resp) when is_map(resp) do
    cond do
      is_binary(resp["output_text"]) and resp["output_text"] != "" ->
        {:ok, resp["output_text"]}

      is_list(resp["output"]) ->
        extract_text_from_output(resp["output"])

      true ->
        {:error, :empty_ai_response}
    end
  end

  def extract_function_call(resp) when is_map(resp) do
    output = resp["output"] || []

    case Enum.find(output, &(&1["type"] == "function_call")) do
      %{"name" => name} = call when is_binary(name) ->
        {:ok, call}

      _ ->
        :none
    end
  end

  defp extract_text_from_output(output) when is_list(output) do
    output
    |> Enum.flat_map(fn
      %{"type" => "message", "content" => content} when is_list(content) ->
        Enum.flat_map(content, fn
          %{"type" => "output_text", "text" => text} when is_binary(text) -> [text]
          %{"text" => text} when is_binary(text) -> [text]
          _ -> []
        end)

      _ ->
        []
    end)
    |> Enum.join("")
    |> case do
      "" -> {:error, :empty_ai_response}
      text -> {:ok, text}
    end
  end

  defp base_body(opts) do
    %{
      model: Keyword.get(opts, :model, Config.openai_model()),
      store: false,
      reasoning: %{effort: Keyword.get(opts, :reasoning_effort, Config.openai_reasoning_effort())},
      max_output_tokens: Keyword.get(opts, :max_output_tokens, 2_500)
    }
  end

  defp put_text_format(body, opts) do
    format =
      case Keyword.get(opts, :schema) do
        %{name: name, schema: schema} ->
          %{
            type: "json_schema",
            name: name,
            strict: true,
            schema: schema
          }

        _ ->
          %{type: "json_object"}
      end

    Map.put(body, :text, %{format: format})
  end

  defp post_and_decode_json(api_key, body, timeout) do
    with {:ok, resp} <- post(api_key, body, timeout),
         {:ok, content} <- extract_output_text(resp),
         {:ok, map} <- decode_json_object(content) do
      {:ok, map, resp}
    end
  end

  defp post(api_key, body, timeout) do
    headers = [
      {"content-type", "application/json"},
      {"authorization", "Bearer #{api_key}"}
    ]

    case Req.post(@api_url,
           headers: headers,
           json: body,
           receive_timeout: timeout,
           retry: false
         ) do
      {:ok, %{status: status, body: resp}} when status in 200..299 and is_map(resp) ->
        if resp["status"] == "incomplete" do
          {:error, :empty_ai_response}
        else
          {:ok, resp}
        end

      {:ok, %{status: status, body: resp}} when status in 200..299 and is_binary(resp) ->
        case Jason.decode(resp) do
          {:ok, map} when is_map(map) -> {:ok, map}
          _ -> {:error, :empty_ai_response}
        end

      {:ok, %{status: 401}} ->
        {:error, :openai_unauthorized}

      {:ok, %{status: 429}} ->
        {:error, :openai_rate_limited}

      {:ok, %{status: status}} when status >= 500 ->
        {:error, :openai_unavailable}

      {:ok, _} ->
        {:error, :openai_error}

      {:error, _} ->
        {:error, :openai_network_error}
    end
  end

  defp require_key do
    if Config.configured?(:openai),
      do: {:ok, Config.openai_api_key()},
      else: {:error, :openai_not_configured}
  end

  defp decode_json_object(content) do
    case Jason.decode(content) do
      {:ok, map} when is_map(map) -> {:ok, map}
      _ -> {:error, :invalid_ai_json}
    end
  end
end
