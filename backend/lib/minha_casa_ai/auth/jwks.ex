defmodule MinhaCasaAi.Auth.JWKS do
  @moduledoc """
  Fetches and caches Better Auth JWKS keys for Phoenix JWT verification.
  """

  use Agent

  alias MinhaCasaAi.Config

  def start_link(_opts) do
    Agent.start_link(fn -> nil end, name: __MODULE__)
  end

  def get_keys do
    case Agent.get(__MODULE__, & &1) do
      nil -> refresh_keys()
      keys -> {:ok, keys}
    end
  end

  def set_keys(keys) do
    Agent.update(__MODULE__, fn _ -> keys end)
  end

  def refresh_keys do
    url = Config.better_auth_jwks_url() || "http://localhost:5173/auth/jwks"

    case :httpc.request(:get, {String.to_charlist(url), []}, [{:timeout, 5_000}], []) do
      {:ok, {{_, 200, _}, _headers, body}} ->
        with {:ok, %{"keys" => keys}} <- Jason.decode(to_string(body)) do
          jwk_set = Enum.map(keys, &JOSE.JWK.from_map/1)
          set_keys(jwk_set)
          {:ok, jwk_set}
        else
          _ -> {:error, :invalid_jwks_response}
        end

      _ ->
        {:error, :jwks_fetch_failed}
    end
  end

  def verify_token(token) when is_binary(token) do
    with {:ok, keys} <- get_keys(),
         {:ok, claims} <- try_verify(token, keys) do
      {:ok, claims}
    else
      {:error, :verification_failed} ->
        case refresh_keys() do
          {:ok, keys} -> try_verify(token, keys)
          error -> error
        end

      error ->
        error
    end
  end

  def verify_token(_), do: {:error, :missing_token}

  defp try_verify(token, keys) do
    Enum.find_value(keys, {:error, :verification_failed}, fn key ->
      case JOSE.JWT.verify_strict(key, allowed_algorithms(), token) do
        {true, %JOSE.JWT{fields: claims}, _jws} ->
          if token_expired?(claims), do: nil, else: {:ok, claims}

        _ ->
          nil
      end
    end)
  end

  defp token_expired?(%{"exp" => exp}) when is_number(exp) do
    DateTime.utc_now() |> DateTime.to_unix() > exp
  end

  defp token_expired?(_), do: false

  defp allowed_algorithms, do: ["EdDSA", "ES256", "RS256", "PS256"]
end
