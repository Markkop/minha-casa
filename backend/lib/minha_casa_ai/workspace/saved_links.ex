defmodule MinhaCasaAi.Workspace.SavedLinks do
  @moduledoc """
  CRUD for workspace saved links (same `saved_links` table as Drizzle).
  """

  import Ecto.Query

  alias MinhaCasaAi.Integrations.SavedLinkMetadata
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspace.{Profile, SavedLink}

  def list_links(profile) do
    SavedLink
    |> Profile.scope_query(profile)
    |> order_by([l], desc: l.updated_at)
    |> Repo.all()
  end

  def get_link!(id, profile) do
    case get_link(id, profile) do
      nil -> {:error, :not_found}
      link -> {:ok, link}
    end
  end

  def get_link(id, profile) do
    SavedLink
    |> Profile.scope_query(profile)
    |> where([l], l.id == ^id)
    |> Repo.one()
  end

  def create_link(profile, attrs) do
    %SavedLink{}
    |> SavedLink.changeset(Map.merge(Profile.profile_values(profile), attrs))
    |> Repo.insert()
  end

  def update_link(id, profile, attrs) do
    with {:ok, link} <- get_link!(id, profile) do
      link
      |> SavedLink.changeset(attrs)
      |> Repo.update()
    end
  end

  def delete_link(id, profile) do
    with {:ok, link} <- get_link!(id, profile) do
      Repo.delete(link)
    end
  end

  def enrich_link(id, profile) do
    with {:ok, link} <- get_link!(id, profile),
         metadata <- SavedLinkMetadata.resolve(link.url) do
      update_link(id, profile, %{
        title: metadata.title,
        description: metadata.description
      })
    end
  end

  def fallback_title_from_url(url) when is_binary(url) do
    SavedLinkMetadata.fallback_title_from_url(url)
  end
end
