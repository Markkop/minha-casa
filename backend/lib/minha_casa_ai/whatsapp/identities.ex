defmodule MinhaCasaAi.WhatsApp.Identities do
  import Ecto.Query

  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.WhatsApp.Identity

  def get_by_wa_id(wa_id) when is_binary(wa_id) do
    Repo.get_by(Identity, wa_id: wa_id)
  end

  def get_by_user_id(user_id) do
    Repo.get_by(Identity, user_id: user_id)
  end

  def linked?(wa_id) when is_binary(wa_id) do
    not is_nil(get_by_wa_id(wa_id))
  end

  def link!(wa_id, user_id, phone \\ nil) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    case get_by_wa_id(wa_id) do
      %Identity{user_id: ^user_id} = identity ->
        {:ok, identity}

      %Identity{user_id: other} ->
        {:error, {:already_linked, other}}

      nil ->
        %Identity{}
        |> Identity.changeset(%{
          wa_id: wa_id,
          user_id: user_id,
          phone: phone,
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
