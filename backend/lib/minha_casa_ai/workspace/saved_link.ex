defmodule MinhaCasaAi.Workspace.SavedLink do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "saved_links" do
    field :user_id, :binary_id
    field :org_id, :binary_id
    field :title, :string
    field :url, :string
    field :description, :string

    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime_usec)
  end

  def changeset(link, attrs) do
    link
    |> cast(attrs, [:user_id, :org_id, :title, :url, :description])
    |> validate_required([:title, :url])
    |> validate_owner()
    |> validate_url()
  end

  defp validate_owner(changeset) do
    user_id = get_field(changeset, :user_id)
    org_id = get_field(changeset, :org_id)

    cond do
      is_binary(user_id) and is_nil(org_id) ->
        changeset

      is_nil(user_id) and is_binary(org_id) ->
        changeset

      true ->
        add_error(changeset, :base, "invalid owner: require user_id or org_id")
    end
  end

  defp validate_url(changeset) do
    url = get_field(changeset, :url)

    case url do
      url when is_binary(url) ->
        uri = URI.parse(String.trim(url))

        if uri.scheme in ["http", "https"] and is_binary(uri.host) and uri.host != "" do
          changeset
        else
          add_error(changeset, :url, "must be a valid URL")
        end

      _ ->
        changeset
    end
  end
end
