defmodule MinhaCasaAiWeb.SavedLinkJSON do
  @moduledoc false

  alias MinhaCasaAi.Workspace.SavedLink

  def link(%SavedLink{} = link) do
    %{
      id: link.id,
      userId: link.user_id,
      orgId: link.org_id,
      title: link.title,
      url: link.url,
      description: link.description,
      createdAt: datetime_to_iso(link.created_at),
      updatedAt: datetime_to_iso(link.updated_at)
    }
  end

  def links(links) when is_list(links), do: Enum.map(links, &link/1)

  defp datetime_to_iso(nil), do: nil

  defp datetime_to_iso(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp datetime_to_iso(%NaiveDateTime{} = ndt), do: NaiveDateTime.to_iso8601(ndt) <> "Z"
end
