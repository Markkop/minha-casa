defmodule MinhaCasaAi.WhatsApp.LinkCodes do
  import Ecto.Query

  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.WhatsApp.LinkCode

  @ttl_minutes 30
  @code_length 8

  def create_for_wa_id(wa_id, phone \\ nil) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)
    expires_at = DateTime.add(now, @ttl_minutes * 60, :second)

    expire_pending_for_wa_id!(wa_id, now)

    %LinkCode{}
    |> LinkCode.changeset(%{
      code: generate_code(),
      wa_id: wa_id,
      phone: phone,
      status: "pending",
      expires_at: expires_at
    })
    |> Repo.insert()
  end

  def get_pending(code) when is_binary(code) do
    normalized = String.upcase(String.trim(code))
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    from(c in LinkCode,
      where: c.code == ^normalized and c.status == "pending" and c.expires_at > ^now
    )
    |> Repo.one()
  end

  def consume!(%LinkCode{} = link_code, user_id) do
    link_code
    |> LinkCode.changeset(%{status: "consumed", consumed_by_user_id: user_id})
    |> Repo.update!()
  end

  def expire_pending_for_wa_id!(wa_id, now \\ DateTime.utc_now() |> DateTime.truncate(:second)) do
    from(c in LinkCode,
      where: c.wa_id == ^wa_id and c.status == "pending",
      update: [set: [status: "expired"]]
    )
    |> Repo.update_all([])
  end

  defp generate_code do
    :crypto.strong_rand_bytes(6)
    |> Base.encode32(padding: false)
    |> String.slice(0, @code_length)
    |> String.upcase()
  end
end
