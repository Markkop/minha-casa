defmodule MinhaCasaAi.Audit do
  @moduledoc "Transactional audit log for platform and workspace mutations."

  import Ecto.Query

  alias MinhaCasaAi.Audit.AuditEvent
  alias MinhaCasaAi.Repo

  def record!(attrs) do
    attrs = Map.put_new(attrs, :occurred_at, DateTime.utc_now(:second))

    %AuditEvent{}
    |> AuditEvent.changeset(attrs)
    |> Repo.insert!()
  end

  def list(opts \\ []) do
    limit = opts |> Keyword.get(:limit, 100) |> min(250) |> max(1)

    AuditEvent
    |> order_by([e], desc: e.occurred_at)
    |> limit(^limit)
    |> maybe_actor(Keyword.get(opts, :actor_user_id))
    |> maybe_workspace(Keyword.get(opts, :workspace_id))
    |> Repo.all()
  end

  defp maybe_actor(query, nil), do: query
  defp maybe_actor(query, value), do: where(query, [e], e.actor_user_id == ^value)
  defp maybe_workspace(query, nil), do: query
  defp maybe_workspace(query, value), do: where(query, [e], e.workspace_id == ^value)
end
