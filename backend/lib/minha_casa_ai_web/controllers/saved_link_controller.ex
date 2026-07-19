defmodule MinhaCasaAiWeb.SavedLinkController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Workspace.{Profile, SavedLinks}
  alias MinhaCasaAiWeb.{PublicError, SavedLinkJSON}

  def index(conn, _params) do
    case profile(conn) do
      {:ok, profile} ->
        links = SavedLinks.list_links(profile)
        json(conn, %{links: SavedLinkJSON.links(links)})

      {:error, status, reason} ->
        PublicError.json_error(conn, status, reason)
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
                PublicError.json_error(conn, :bad_request, changeset)
            end

          {:error, reason} ->
            PublicError.json_error(conn, :bad_request, reason)
        end

      {:error, status, reason} ->
        PublicError.json_error(conn, status, reason)
    end
  end

  def show(conn, %{"id" => id}) do
    case profile(conn) do
      {:ok, profile} ->
        case SavedLinks.get_link!(id, profile) do
          {:ok, link} -> json(conn, %{link: SavedLinkJSON.link(link)})
          {:error, :not_found} -> PublicError.json_error(conn, :not_found, :not_found, context: :link)
        end

      {:error, status, reason} ->
        PublicError.json_error(conn, status, reason)
    end
  end

  def update(conn, %{"id" => id} = params) do
    case profile(conn) do
      {:ok, profile} ->
        case parse_update(params) do
          {:ok, attrs} ->
            case SavedLinks.update_link(id, profile, attrs) do
              {:ok, link} ->
                json(conn, %{link: SavedLinkJSON.link(link)})

              {:error, :not_found} ->
                PublicError.json_error(conn, :not_found, :not_found, context: :link)

              {:error, %Ecto.Changeset{} = changeset} ->
                PublicError.json_error(conn, :bad_request, changeset)
            end

          {:error, reason} ->
            PublicError.json_error(conn, :bad_request, reason)
        end

      {:error, status, reason} ->
        PublicError.json_error(conn, status, reason)
    end
  end

  def delete(conn, %{"id" => id}) do
    case profile(conn) do
      {:ok, profile} ->
        case SavedLinks.delete_link(id, profile) do
          {:ok, _link} -> json(conn, %{success: true})
          {:error, :not_found} -> PublicError.json_error(conn, :not_found, :not_found, context: :link)
        end

      {:error, status, reason} ->
        PublicError.json_error(conn, status, reason)
    end
  end

  def enrich(conn, %{"id" => id}) do
    case profile(conn) do
      {:ok, profile} ->
        case SavedLinks.enrich_link(id, profile) do
          {:ok, link} ->
            json(conn, %{link: SavedLinkJSON.link(link)})

          {:error, :not_found} ->
            PublicError.json_error(conn, :not_found, :not_found, context: :link)

          {:error, %Ecto.Changeset{} = changeset} ->
            PublicError.json_error(conn, :bad_request, changeset)
        end

      {:error, status, reason} ->
        PublicError.json_error(conn, status, reason)
    end
  end

  defp profile(conn) do
    case Profile.profile_from_headers(
           conn.assigns[:current_user_id],
           conn.assigns[:current_org_id],
           conn.assigns[:current_workspace_id]
         ) do
      {:error, :missing_profile} -> {:error, :unauthorized, :unauthorized}
      profile -> {:ok, profile}
    end
  end

  defp parse_create(params) do
    url = string_param(params, "url")

    cond do
      is_nil(url) or url == "" ->
        {:error, :invalid_url}

      true ->
        title = string_param(params, "title") || ""
        description = optional_string_param(params, "description")

        resolved_title =
          if String.trim(title) != "",
            do: String.trim(title),
            else: SavedLinks.fallback_title_from_url(url)

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
      attrs == %{} -> {:error, "Informe ao menos um campo para atualizar."}
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
    if trimmed == "", do: {:error, "Informe o título."}, else: {:ok, trimmed}
  end

  defp validate_title(_), do: {:error, "Informe o título."}

  defp validate_url(value) when is_binary(value) do
    trimmed = String.trim(value)

    cond do
      trimmed == "" -> {:error, :invalid_url}
      valid_url?(trimmed) -> {:ok, trimmed}
      true -> {:error, :invalid_url}
    end
  end

  defp validate_url(_), do: {:error, :invalid_url}

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
end
