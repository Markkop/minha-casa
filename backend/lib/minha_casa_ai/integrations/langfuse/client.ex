defmodule MinhaCasaAi.Integrations.Langfuse.Client do
  @moduledoc false

  alias MinhaCasaAi.Integrations.Langfuse.Config

  @ingestion_path "/api/public/ingestion"
  @prompt_path "/api/public/v2/prompts"

  def ingest_batch(events, opts \\ []) when is_list(events) do
    if Config.enabled?() and events != [] do
      body = %{"batch" => events}
      post(@ingestion_path, body, opts)
    else
      :ok
    end
  end

  def get_prompt(name, label \\ nil, opts \\ []) when is_binary(name) do
    if Config.configured?() do
      label = label || Config.prompt_label()
      path = "#{@prompt_path}/#{URI.encode(name)}?label=#{URI.encode(label)}"
      get(path, opts)
    else
      {:error, :langfuse_not_configured}
    end
  end

  def create_prompt(attrs, opts \\ []) when is_map(attrs) do
    if Config.configured?() do
      post(@prompt_path, attrs, opts)
    else
      {:error, :langfuse_not_configured}
    end
  end

  defp get(path, opts) do
    request(:get, path, nil, opts)
  end

  defp post(path, body, opts) do
    request(:post, path, body, opts)
  end

  defp request(method, path, body, opts) do
    request_fun = Keyword.get(opts, :request_fun, &default_request/5)
    url = base_url() <> path
    headers = default_headers()
    timeout = Keyword.get(opts, :timeout, 15_000)

    request_fun.(method, url, headers, body, timeout)
  end

  defp default_request(method, url, headers, body, timeout) do
    req_opts =
      [
        method: method,
        url: url,
        headers: headers,
        receive_timeout: timeout
      ]
      |> maybe_put_json(body)

    case Req.request(req_opts) do
      {:ok, %{status: status, body: body}} when status in 200..299 ->
        {:ok, body}

      {:ok, %{status: status, body: body}} ->
        {:error, {:langfuse_http_error, status, body}}

      {:error, reason} ->
        {:error, {:langfuse_network_error, reason}}
    end
  end

  defp maybe_put_json(opts, nil), do: opts
  defp maybe_put_json(opts, body), do: Keyword.put(opts, :json, body)

  defp default_headers do
    [
      {"authorization", Config.auth_header()},
      {"content-type", "application/json"}
    ]
  end

  defp base_url do
    Config.host()
    |> String.trim_trailing("/")
  end
end
