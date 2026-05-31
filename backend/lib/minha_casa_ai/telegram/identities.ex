defmodule MinhaCasaAi.Telegram.Identities do
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Telegram.Identity

  def get_by_chat_id(chat_id) do
    Repo.get_by(Identity, chat_id: to_string(chat_id))
  end

  def get_by_user_id(user_id) do
    Repo.get_by(Identity, user_id: user_id)
  end

  def linked?(chat_id) do
    not is_nil(get_by_chat_id(chat_id))
  end

  def link!(chat_id, user_id, telegram_user_id \\ nil) do
    chat_id = to_string(chat_id)
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    case get_by_chat_id(chat_id) do
      %Identity{user_id: ^user_id} = identity ->
        {:ok, identity}

      %Identity{user_id: other} ->
        {:error, {:already_linked, other}}

      nil ->
        %Identity{}
        |> Identity.changeset(%{
          chat_id: chat_id,
          user_id: user_id,
          telegram_user_id: telegram_user_id && to_string(telegram_user_id),
          linked_at: now
        })
        |> Repo.insert()
    end
  end

  def default_org_id(user_id) when is_binary(user_id) do
    case Ecto.Adapters.SQL.query(
           Repo,
           "SELECT org_id::text FROM organization_members WHERE user_id = $1::uuid ORDER BY joined_at ASC LIMIT 1",
           [user_id]
         ) do
      {:ok, %{rows: [[org_id]]}} when is_binary(org_id) -> org_id
      _ -> nil
    end
  rescue
    _ -> nil
  end
end
