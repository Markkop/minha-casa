defmodule MinhaCasaAiWeb.SavedLinkController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Workspace.{Profile, SavedLinks}
  alias MinhaCasaAiWeb.SavedLinkJSON

  def index(conn, _params) do
    case profile(conn) do
      {:ok, profile} ->
        links = SavedLinks.list_links(profile)
        json(conn, %{links: SavedLinkJSON.links(links)})

      {:error, status, message} ->
        error(conn, status, message)
    end
  end

  def create(conn, params) do
    case profile(conn) do
      {:ok, profile} ->
        case parse_create(params) do
          {:ok, attrs} ->
            case SavedLinks.create_link(profile, attrs) do
              {:ok, link} ->
                conn
                |> put_status(:created)
                |> json(%{link: SavedLinkJSON.link(link)})

              {:error, %Ecto.Changeset{} = changeset} ->
                error(conn, :bad_request, first_changeset_error(changeset))
            end

          {:error, message} ->
            error(conn, :bad_request, message)
        end

      {:error, status, message} ->
        error(conn, status, message)
    end
  end

  def show(conn, %{"id" => id}) do
    case profile(conn) do
      {:ok, profile} ->
        case SavedLinks.get_link!(id, profile) do
          {:ok, link} -> json(conn, %{link: SavedLinkJSON.link(link)})
          {:error, :not_found} -> error(conn, :not_found, "Saved link")
        end

      {:error, status, message} ->
        error(conn, status, message)
    end
  end

  def update(conn, %{"id" => id} = params) do
    case profile(conn) do
      {:ok, profile} ->
        case parse_update(params) do
          {:ok, attrs} ->
            case SavedLinks.update_link(id, profile, attrs) do
              {:ok, link} -> json(conn, %{link: SavedLinkJSON.link(link)})
              {:error, :not_found} -> error(conn, :not_found, "Saved link")
              {:error, %Ecto.Changeset{} = changeset} -> error(conn, :bad_request, first_changeset_error(changeset))
            end

          {:error, message} ->
            error(conn, :bad_request, message)
        end

      {:error, status, message} ->
        error(conn, status, message)
    end
  end

  def delete(conn, %{"id" => id}) do
    case profile(conn) do
      {:ok, profile} ->
        case SavedLinks.delete_link(id, profile) do
          {:ok, _link} -> json(conn, %{success: true})
          {:error, :not_found} -> error(conn, :not_found, "Saved link")
        end

      {:error, status, message} ->
        error(conn, status, message)
    end
  end

  def enrich(conn, %{"id" => id}) do
    case profile(conn) do
      {:ok, profile} ->
        case SavedLinks.enrich_link(id, profile) do
          {:ok, link} -> json(conn, %{link: SavedLinkJSON.link(link)})
          {:error, :not_found} -> error(conn, :not_found, "Saved link")
          {:error, %Ecto.Changeset{} = changeset} -> error(conn, :bad_request, first_changeset_error(changeset))
        end

      {:error, status, message} ->
        error(conn, status, message)
    end
  end

  defp profile(conn) do
    case Profile.profile_from_headers(
           conn.assigns[:current_user_id],
           conn.assigns[:current_org_id]
         ) do
      {:error, :missing_profile} -> {:error, :unauthorized, "Unauthorized"}
      profile -> {:ok, profile}
    end
  end

  defp parse_create(params) do
    url = string_param(params, "url")

    cond do
      is_nil(url) or url == "" ->
        {:error, "URL is required"}

      true ->
        title = string_param(params, "title") || ""
        description = optional_string_param(params, "description")

        resolved_title =
          if String.trim(title) != "", do: String.trim(title), else: SavedLinks.fallback_title_from_url(url)

        desc = if String.trim(title) != "", do: description, else: nil

        {:ok, %{title: resolved_title, url: String.trim(url), description: desc}}
    end
  end

  defp parse_update(params) do
    attrs =
      %{}
      |> maybe_put_string(params, "title", :title, &validate_title/1)
      |> maybe_put_string(params, "url", :url, &validate_url/1)
      |> maybe_put_optional_description(params)

    cond do
      Map.get(attrs, :_error) -> {:error, Map.get(attrs, :_error)}
      attrs == %{} -> {:error, "No fields to update"}
      true -> {:ok, Map.drop(attrs, [:_error])}
    end
  end

  defp maybe_put_string(attrs, params, param_key, attr_key, validator) do
    if Map.has_key?(params, param_key) do
      case validator.(Map.get(params, param_key)) do
        {:ok, value} -> Map.put(attrs, attr_key, value)
        {:error, message} -> Map.put(attrs, :_error, message)
      end
    else
      attrs
    end
  end

  defp maybe_put_optional_description(attrs, params) do
    if Map.has_key?(params, "description"),
      do: Map.put(attrs, :description, optional_string_param(params, "description")),
      else: attrs
  end

  defp validate_title(value) when is_binary(value) do
    trimmed = String.trim(value)
    if trimmed == "", do: {:error, "Title is required"}, else: {:ok, trimmed}
  end

  defp validate_title(_), do: {:error, "Title is required"}

  defp validate_url(value) when is_binary(value) do
    trimmed = String.trim(value)

    cond do
      trimmed == "" -> {:error, "URL is required"}
      valid_url?(trimmed) -> {:ok, trimmed}
      true -> {:error, "URL must be valid"}
    end
  end

  defp validate_url(_), do: {:error, "URL is required"}

  defp valid_url?(url) do
    case URI.parse(url) do
      %URI{scheme: s, host: h} when s in ["http", "https"] and is_binary(h) and h != "" -> true
      _ -> false
    end
  end

  defp string_param(params, key) do
    case Map.get(params, key) do
      v when is_binary(v) -> v
      _ -> nil
    end
  end

  defp optional_string_param(params, key) do
    case string_param(params, key) do
      nil -> nil
      "" -> nil
      v -> String.trim(v)
    end
  end

  defp first_changeset_error(%Ecto.Changeset{} = changeset) do
    changeset
    |> Ecto.Changeset.traverse_errors(fn {msg, _} -> msg end)
    |> Enum.map(fn {field, msgs} -> "#{field} #{Enum.join(msgs, ", ")}" end)
    |> List.first()
    |> case do
      nil -> "Invalid data"
      msg -> msg
    end
  end

  defp error(conn, :unauthorized, message),
    do: conn |> put_status(:unauthorized) |> json(%{error: message})

  defp error(conn, :not_found, message),
    do: conn |> put_status(:not_found) |> json(%{error: message})

  defp error(conn, :bad_request, message),
    do: conn |> put_status(:bad_request) |> json(%{error: message})
end
