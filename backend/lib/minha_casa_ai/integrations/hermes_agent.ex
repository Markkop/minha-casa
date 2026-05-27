defmodule MinhaCasaAi.Integrations.HermesAgent do
  @moduledoc """
  Minimal client for Hermes Agent's internal API server.
  """

  alias MinhaCasaAi.Config

  @poll_interval_ms 1_000

  def run(input, opts \\ []) when is_binary(input) do
    base_url = Keyword.get(opts, :base_url, Config.hermes_api_url())
    api_key = Keyword.get(opts, :api_key, Config.hermes_api_key())
    timeout_ms = Keyword.get(opts, :timeout_ms, Config.hermes_analysis_timeout_ms())

    with :ok <- require_config(base_url, api_key),
         {:ok, run_id} <- create_run(input, base_url, api_key, opts),
         {:ok, run} <- poll_run(run_id, base_url, api_key, timeout_ms, opts),
         {:ok, result} <- extract_result(run) do
      {:ok, result}
    end
  end

  def create_run(input, base_url, api_key, opts \\ []) do
    body =
      %{
        "input" => input,
        "instructions" => Keyword.get(opts, :instructions, instructions())
      }
      |> maybe_put("session_id", Keyword.get(opts, :session_id))

    case request(:post, endpoint(base_url, "/v1/runs"), api_key, body, opts) do
      {:ok, %{"run_id" => run_id}} when is_binary(run_id) ->
        {:ok, run_id}

      {:ok, %{"id" => run_id}} when is_binary(run_id) ->
        {:ok, run_id}

      {:ok, body} ->
        {:error, {:invalid_hermes_create_response, body}}

      {:error, _} = error ->
        error
    end
  end

  def poll_run(run_id, base_url, api_key, timeout_ms, opts \\ []) do
    now_fun = Keyword.get(opts, :now_fun, fn -> System.monotonic_time(:millisecond) end)
    sleep_fun = Keyword.get(opts, :sleep_fun, fn ms -> Process.sleep(ms) end)
    poll_interval_ms = Keyword.get(opts, :poll_interval_ms, @poll_interval_ms)
    deadline = now_fun.() + timeout_ms

    do_poll_run(run_id, base_url, api_key, deadline, now_fun, sleep_fun, poll_interval_ms, opts)
  end

  def extract_result(%{"output" => %{} = output}), do: {:ok, output}
  def extract_result(%{"result" => %{} = result}), do: {:ok, result}

  def extract_result(%{"output" => output}) when is_binary(output), do: decode_json(output)

  def extract_result(%{"response" => %{"output_text" => output}}) when is_binary(output) do
    decode_json(output)
  end

  def extract_result(%{"response" => %{"output" => output}}) when is_list(output) do
    output |> output_text() |> decode_json()
  end

  def extract_result(%{"output" => output}) when is_list(output) do
    output |> output_text() |> decode_json()
  end

  def extract_result(body), do: {:error, {:missing_hermes_output, body}}

  defp do_poll_run(
         run_id,
         base_url,
         api_key,
         deadline,
         now_fun,
         sleep_fun,
         poll_interval_ms,
         opts
       ) do
    if now_fun.() > deadline do
      {:error, :hermes_timeout}
    else
      case request(:get, endpoint(base_url, "/v1/runs/#{run_id}"), api_key, nil, opts) do
        {:ok, %{"status" => status} = body} when status in ["completed", "succeeded"] ->
          {:ok, body}

        {:ok, %{"status" => status} = body} when status in ["failed", "error"] ->
          {:error, {:hermes_run_failed, Map.get(body, "error") || body}}

        {:ok, %{"status" => "cancelled"}} ->
          {:error, :hermes_run_cancelled}

        {:ok, %{"status" => status}}
        when status in ["started", "queued", "running", "in_progress"] ->
          sleep_fun.(poll_interval_ms)

          do_poll_run(
            run_id,
            base_url,
            api_key,
            deadline,
            now_fun,
            sleep_fun,
            poll_interval_ms,
            opts
          )

        {:ok, body} ->
          {:error, {:invalid_hermes_run_response, body}}

        {:error, _} = error ->
          error
      end
    end
  end

  defp request(method, url, api_key, body, opts) do
    request_fun = Keyword.get(opts, :request_fun, &default_request/5)
    headers = [{"authorization", "Bearer #{api_key}"}, {"content-type", "application/json"}]
    timeout = Keyword.get(opts, :request_timeout_ms, 60_000)

    request_fun.(method, url, headers, body, timeout)
  end

  defp default_request(method, url, headers, body, timeout) do
    req_opts =
      [method: method, url: url, headers: headers, receive_timeout: timeout]
      |> maybe_put_req_body(body)

    case Req.request(req_opts) do
      {:ok, %{status: status, body: body}} when status in 200..299 -> {:ok, body}
      {:ok, %{status: status, body: body}} -> {:error, {:hermes_http_error, status, body}}
      {:error, reason} -> {:error, {:hermes_network_error, reason}}
    end
  end

  defp maybe_put_req_body(opts, nil), do: opts
  defp maybe_put_req_body(opts, body), do: Keyword.put(opts, :json, body)

  defp endpoint(base_url, path), do: String.trim_trailing(base_url, "/") <> path

  defp require_config(base_url, api_key) do
    if present?(base_url) and present?(api_key),
      do: :ok,
      else: {:error, :hermes_not_configured}
  end

  defp present?(value), do: is_binary(value) and String.trim(value) != ""

  defp maybe_put(map, _key, nil), do: map
  defp maybe_put(map, key, value), do: Map.put(map, key, value)

  defp output_text(output) do
    output
    |> Enum.flat_map(fn
      %{"type" => "message", "content" => content} when is_list(content) ->
        Enum.flat_map(content, fn
          %{"type" => "output_text", "text" => text} when is_binary(text) -> [text]
          %{"text" => text} when is_binary(text) -> [text]
          _ -> []
        end)

      %{"text" => text} when is_binary(text) ->
        [text]

      _ ->
        []
    end)
    |> Enum.join("")
  end

  defp decode_json(text) when is_binary(text) do
    text = text |> String.trim() |> strip_code_fence()

    with {:error, _} <- Jason.decode(text),
         {:ok, candidate} <- object_candidate(text),
         {:ok, map} when is_map(map) <- Jason.decode(candidate) do
      {:ok, map}
    else
      {:ok, map} when is_map(map) -> {:ok, map}
      _ -> {:error, :invalid_hermes_json}
    end
  end

  defp strip_code_fence("```json\n" <> rest), do: String.trim_trailing(rest, "`") |> String.trim()
  defp strip_code_fence("```\n" <> rest), do: String.trim_trailing(rest, "`") |> String.trim()
  defp strip_code_fence(text), do: text

  defp object_candidate(text) do
    start = :binary.match(text, "{")
    stop = :binary.matches(text, "}") |> List.last()

    case {start, stop} do
      {{first, _}, {last, _}} when last >= first ->
        {:ok, binary_part(text, first, last - first + 1)}

      _ ->
        {:error, :no_json_object}
    end
  end

  defp instructions do
    """
    Você é o motor interno da análise imobiliária Minha Casa.
    Responda somente JSON válido, sem Markdown, sem comentários e sem texto fora do objeto JSON.
    """
  end
end
