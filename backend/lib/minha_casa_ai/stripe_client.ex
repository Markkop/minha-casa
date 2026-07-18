defmodule MinhaCasaAi.StripeClient do
  @moduledoc false

  alias MinhaCasaAi.Config

  def get(path, params \\ %{}) do
    request(:get, path, params: params)
  end

  def post(path, form, opts \\ []) do
    request(:post, path,
      form: form,
      idempotency_key: Keyword.get(opts, :idempotency_key)
    )
  end

  def delete(path, form \\ %{}, opts \\ []) do
    request(:delete, path,
      form: form,
      idempotency_key: Keyword.get(opts, :idempotency_key)
    )
  end

  defp request(method, path, opts) do
    base_url = Application.get_env(:minha_casa_ai, :stripe_api_url, "https://api.stripe.com")

    headers =
      case Keyword.get(opts, :idempotency_key) do
        value when is_binary(value) and value != "" -> [{"idempotency-key", value}]
        _ -> []
      end

    request_opts =
      [
        auth: {:bearer, Config.stripe_secret_key()},
        headers: headers,
        receive_timeout: 30_000
      ]
      |> maybe_put(:params, Keyword.get(opts, :params))
      |> maybe_put(:form, Keyword.get(opts, :form))

    request_opts = Keyword.merge([method: method, url: base_url <> path], request_opts)

    case Req.request(request_opts) do
      {:ok, %{status: status, body: body}} when status in 200..299 ->
        {:ok, body}

      {:ok, %{body: %{"error" => %{"message" => message}}}} ->
        {:error, {:stripe, message}}

      {:ok, %{status: status, body: body}} ->
        {:error, {:stripe, "Stripe request failed with status #{status}: #{inspect(body)}"}}

      {:error, reason} ->
        {:error, {:stripe, inspect(reason)}}
    end
  end

  defp maybe_put(opts, _key, nil), do: opts
  defp maybe_put(opts, key, value), do: Keyword.put(opts, key, value)
end
