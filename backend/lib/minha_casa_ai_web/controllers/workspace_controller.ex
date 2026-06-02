defmodule MinhaCasaAiWeb.WorkspaceController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Workspace.{DecisionData, Profile}
  alias MinhaCasaAiWeb.WorkspaceJSON

  def contacts_index(conn, _params) do
    with {:ok, profile} <- profile(conn) do
      json(conn, %{contacts: WorkspaceJSON.contacts(DecisionData.list_contacts(profile))})
    end
  end

  def contacts_create(conn, params) do
    with {:ok, profile} <- profile(conn) do
      case DecisionData.create_contact(profile, params) do
        {:ok, contact} -> conn |> put_status(:created) |> json(%{contact: WorkspaceJSON.contact(contact)})
        {:error, changeset} -> changeset_error(conn, changeset)
      end
    end
  end

  def contacts_update(conn, %{"id" => id} = params) do
    with {:ok, profile} <- profile(conn) do
      case DecisionData.update_contact(id, profile, params) do
        {:ok, contact} -> json(conn, %{contact: WorkspaceJSON.contact(contact)})
        {:error, :not_found} -> not_found(conn, "Contact")
        {:error, changeset} -> changeset_error(conn, changeset)
      end
    end
  end

  def contacts_delete(conn, %{"id" => id}) do
    with {:ok, profile} <- profile(conn) do
      case DecisionData.delete_contact(id, profile) do
        {:ok, _} -> json(conn, %{success: true})
        {:error, :not_found} -> not_found(conn, "Contact")
      end
    end
  end

  def regions_index(conn, _params) do
    with {:ok, profile} <- profile(conn) do
      json(conn, %{regions: WorkspaceJSON.regions(DecisionData.list_regions(profile))})
    end
  end

  def regions_create(conn, params) do
    with {:ok, profile} <- profile(conn) do
      case DecisionData.create_region(profile, params) do
        {:ok, region} -> conn |> put_status(:created) |> json(%{region: WorkspaceJSON.region(region)})
        {:error, changeset} -> changeset_error(conn, changeset)
      end
    end
  end

  def regions_update(conn, %{"id" => id} = params) do
    with {:ok, profile} <- profile(conn) do
      case DecisionData.update_region(id, profile, params) do
        {:ok, region} -> json(conn, %{region: WorkspaceJSON.region(region)})
        {:error, :not_found} -> not_found(conn, "Region")
        {:error, changeset} -> changeset_error(conn, changeset)
      end
    end
  end

  def regions_delete(conn, %{"id" => id}) do
    with {:ok, profile} <- profile(conn) do
      case DecisionData.delete_region(id, profile) do
        {:ok, _} -> json(conn, %{success: true})
        {:error, :not_found} -> not_found(conn, "Region")
      end
    end
  end

  def condominiums_index(conn, _params) do
    with {:ok, profile} <- profile(conn) do
      json(conn, %{condominiums: WorkspaceJSON.condominiums(DecisionData.list_condominiums(profile))})
    end
  end

  def condominiums_create(conn, params) do
    with {:ok, profile} <- profile(conn) do
      case DecisionData.create_condominium(profile, params) do
        {:ok, condominium} ->
          conn |> put_status(:created) |> json(%{condominium: WorkspaceJSON.condominium(condominium)})

        {:error, changeset} ->
          changeset_error(conn, changeset)
      end
    end
  end

  def condominiums_update(conn, %{"id" => id} = params) do
    with {:ok, profile} <- profile(conn) do
      case DecisionData.update_condominium(id, profile, params) do
        {:ok, condominium} -> json(conn, %{condominium: WorkspaceJSON.condominium(condominium)})
        {:error, :not_found} -> not_found(conn, "Condominium")
        {:error, changeset} -> changeset_error(conn, changeset)
      end
    end
  end

  def condominiums_delete(conn, %{"id" => id}) do
    with {:ok, profile} <- profile(conn) do
      case DecisionData.delete_condominium(id, profile) do
        {:ok, _} -> json(conn, %{success: true})
        {:error, :not_found} -> not_found(conn, "Condominium")
      end
    end
  end

  def comparison_notes_index(conn, _params) do
    with {:ok, profile} <- profile(conn) do
      json(conn, %{notes: WorkspaceJSON.comparison_notes(DecisionData.list_comparison_notes(profile))})
    end
  end

  def comparison_notes_upsert(conn, params) do
    with {:ok, profile} <- profile(conn) do
      case DecisionData.upsert_comparison_note(profile, params) do
        {:ok, note} -> json(conn, %{note: WorkspaceJSON.comparison_note(note)})
        {:error, :listing_required} -> conn |> put_status(:bad_request) |> json(%{error: "Listing ID is required"})
        {:error, :not_found} -> not_found(conn, "Listing")
        {:error, changeset} -> changeset_error(conn, changeset)
      end
    end
  end

  defp profile(conn) do
    case Profile.profile_from_headers(conn.assigns[:current_user_id], conn.assigns[:current_org_id]) do
      {:error, :missing_profile} ->
        conn |> put_status(:unauthorized) |> json(%{error: "Unauthorized"}) |> halt()
        {:error, :halted}

      profile ->
        {:ok, profile}
    end
  end

  defp changeset_error(conn, %Ecto.Changeset{} = changeset) do
    conn |> put_status(:bad_request) |> json(%{error: first_changeset_error(changeset)})
  end

  defp not_found(conn, name), do: conn |> put_status(:not_found) |> json(%{error: name})

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
end
