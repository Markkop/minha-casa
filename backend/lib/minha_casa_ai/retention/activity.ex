defmodule MinhaCasaAi.Retention.Activity do
  @moduledoc "Records login activity through the database-owned retention refresh function."

  alias MinhaCasaAi.Repo

  def record_login(user_id, logged_in_at \\ DateTime.utc_now(:second))

  def record_login(user_id, %DateTime{} = logged_in_at) when is_binary(user_id) do
    case Ecto.Adapters.SQL.query(
           Repo,
           "SELECT refresh_retention_on_login($1::uuid, $2::timestamptz)",
           [Ecto.UUID.dump!(user_id), logged_in_at]
         ) do
      {:ok, %{rows: [[count]]}} -> {:ok, count}
      {:error, reason} -> {:error, reason}
    end
  end

  def record_login(_user_id, _logged_in_at), do: {:error, :invalid_login_activity}
end
