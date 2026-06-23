defmodule MinhaCasaAi.Financeiro.SharedSnapshots do
  @moduledoc """
  Static public Financeiro snapshots.
  """

  import Ecto.Query

  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Financeiro.SharedSnapshot
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspace.Profile

  @token_bytes 18

  def create_snapshot(profile, attrs) when is_map(attrs) do
    title = attrs |> Map.get("title", Map.get(attrs, :title, "Simulação financeira")) |> string()
    payload = Map.get(attrs, "payload", Map.get(attrs, :payload, %{}))

    %SharedSnapshot{}
    |> SharedSnapshot.changeset(
      Map.merge(Profile.profile_values(profile), %{
        token: generate_token(),
        title: default_title(title),
        payload: stringify_keys(payload)
      })
    )
    |> Repo.insert()
  end

  def get_public_snapshot(token) do
    normalized = token |> string()

    if normalized == "" do
      nil
    else
      SharedSnapshot
      |> where([s], s.token == ^normalized)
      |> Repo.one()
    end
  end

  def public_json(%SharedSnapshot{} = snapshot) do
    %{
      token: snapshot.token,
      title: snapshot.title,
      createdAt: snapshot.created_at,
      payload: snapshot.payload || %{}
    }
  end

  def share_url(%SharedSnapshot{token: token}), do: share_url(token)

  def share_url(token) when is_binary(token) do
    base = Config.app_public_url() || ""
    String.trim_trailing(base, "/") <> "/financeiro/s/#{token}"
  end

  defp generate_token do
    @token_bytes
    |> :crypto.strong_rand_bytes()
    |> Base.url_encode64(padding: false)
  end

  defp default_title(""), do: "Simulação financeira"
  defp default_title(title), do: title

  defp string(value) when is_binary(value), do: String.trim(value)
  defp string(_), do: ""

  defp stringify_keys(value) when is_map(value) do
    Map.new(value, fn {key, val} -> {to_string(key), stringify_keys(val)} end)
  end

  defp stringify_keys(value) when is_list(value), do: Enum.map(value, &stringify_keys/1)
  defp stringify_keys(value), do: value
end
