defmodule MinhaCasaAi.Workspace.Profile do
  @moduledoc """
  Workspace profile scoping (personal user vs organization), mirroring Next.js `profileWhere`.
  """

  import Ecto.Query

  def profile_from_headers(user_id, org_id) do
    org_id = blank_to_nil(org_id)
    user_id = blank_to_nil(user_id)

    cond do
      is_binary(org_id) ->
        %{user_id: nil, org_id: org_id}

      is_binary(user_id) ->
        %{user_id: user_id, org_id: nil}

      true ->
        {:error, :missing_profile}
    end
  end

  def scope_query(queryable, %{user_id: user_id, org_id: nil}) when is_binary(user_id) do
    from(r in queryable, where: r.user_id == ^user_id and is_nil(r.org_id))
  end

  def scope_query(queryable, %{user_id: nil, org_id: org_id}) when is_binary(org_id) do
    from(r in queryable, where: r.org_id == ^org_id)
  end

  def scope_query(_queryable, _), do: from(r in "saved_links", where: false)

  def profile_values(%{user_id: user_id, org_id: org_id}) do
    %{user_id: user_id, org_id: org_id}
  end

  defp blank_to_nil(nil), do: nil

  defp blank_to_nil(value) when is_binary(value) do
    trimmed = String.trim(value)
    if trimmed == "", do: nil, else: trimmed
  end

  defp blank_to_nil(value), do: value
end
