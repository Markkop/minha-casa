defmodule MinhaCasaAiWeb.WorkspaceController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Workspace.{DecisionData, ListingFeatures, Profile}
  alias MinhaCasaAiWeb.{PublicError, WorkspaceJSON}

  def contacts_index(conn, _params) do
    with {:ok, profile} <- profile(conn) do
      json(conn, %{contacts: WorkspaceJSON.contacts(DecisionData.list_contacts(profile))})
    end
  end

  def contacts_create(conn, params) do
    with {:ok, profile} <- profile(conn) do
      case DecisionData.create_contact(profile, params) do
        {:ok, contact} ->
          conn |> put_status(:created) |> json(%{contact: WorkspaceJSON.contact(contact)})

        {:error, changeset} ->
          changeset_error(conn, changeset)
      end
    end
  end

  def contacts_update(conn, %{"id" => id} = params) do
    with {:ok, profile} <- profile(conn) do
      case DecisionData.update_contact(id, profile, params) do
        {:ok, contact} -> json(conn, %{contact: WorkspaceJSON.contact(contact)})
        {:error, :not_found} -> not_found(conn, "Contato não encontrado.")
        {:error, changeset} -> changeset_error(conn, changeset)
      end
    end
  end

  def contacts_delete(conn, %{"id" => id}) do
    with {:ok, profile} <- profile(conn) do
      case DecisionData.delete_contact(id, profile) do
        {:ok, _} -> json(conn, %{success: true})
        {:error, :not_found} -> not_found(conn, "Contato não encontrado.")
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
        {:ok, region} ->
          conn |> put_status(:created) |> json(%{region: WorkspaceJSON.region(region)})

        {:error, changeset} ->
          changeset_error(conn, changeset)
      end
    end
  end

  def regions_update(conn, %{"id" => id} = params) do
    with {:ok, profile} <- profile(conn) do
      case DecisionData.update_region(id, profile, params) do
        {:ok, region} -> json(conn, %{region: WorkspaceJSON.region(region)})
        {:error, :not_found} -> not_found(conn, "Região não encontrada.")
        {:error, changeset} -> changeset_error(conn, changeset)
      end
    end
  end

  def regions_delete(conn, %{"id" => id}) do
    with {:ok, profile} <- profile(conn) do
      case DecisionData.delete_region(id, profile) do
        {:ok, _} -> json(conn, %{success: true})
        {:error, :not_found} -> not_found(conn, "Região não encontrada.")
      end
    end
  end

  def condominiums_index(conn, _params) do
    with {:ok, profile} <- profile(conn) do
      json(conn, %{
        condominiums: WorkspaceJSON.condominiums(DecisionData.list_condominiums(profile))
      })
    end
  end

  def condominiums_create(conn, params) do
    with {:ok, profile} <- profile(conn) do
      case DecisionData.create_condominium(profile, params) do
        {:ok, condominium} ->
          conn
          |> put_status(:created)
          |> json(%{condominium: WorkspaceJSON.condominium(condominium)})

        {:error, changeset} ->
          changeset_error(conn, changeset)
      end
    end
  end

  def condominiums_update(conn, %{"id" => id} = params) do
    with {:ok, profile} <- profile(conn) do
      case DecisionData.update_condominium(id, profile, params) do
        {:ok, condominium} -> json(conn, %{condominium: WorkspaceJSON.condominium(condominium)})
        {:error, :not_found} -> not_found(conn, "Condomínio não encontrado.")
        {:error, changeset} -> changeset_error(conn, changeset)
      end
    end
  end

  def condominiums_delete(conn, %{"id" => id}) do
    with {:ok, profile} <- profile(conn) do
      case DecisionData.delete_condominium(id, profile) do
        {:ok, _} -> json(conn, %{success: true})
        {:error, :not_found} -> not_found(conn, "Condomínio não encontrado.")
      end
    end
  end

  def listing_features_index(conn, _params) do
    with {:ok, profile} <- profile(conn) do
      json(conn, %{
        features: WorkspaceJSON.listing_features(ListingFeatures.list_catalog(profile))
      })
    end
  end

  def listing_features_update(conn, params) do
    with {:ok, profile} <- profile(conn) do
      features = Map.get(params, "features", [])

      case ListingFeatures.replace_catalog(profile, features) do
        {:ok, catalog} ->
          json(conn, %{features: WorkspaceJSON.listing_features(catalog)})

        {:error, :duplicate_keys} ->
          PublicError.json_error(conn, :bad_request, "Há características duplicadas.")

        {:error, reason} ->
          PublicError.json_error(conn, :bad_request, reason)
      end
    end
  end

  def comparison_notes_index(conn, _params) do
    with {:ok, profile} <- profile(conn) do
      json(conn, %{
        notes: WorkspaceJSON.comparison_notes(DecisionData.list_comparison_notes(profile))
      })
    end
  end

  def comparison_notes_upsert(conn, params) do
    with {:ok, profile} <- profile(conn) do
      case DecisionData.upsert_comparison_note(profile, params) do
        {:ok, note} ->
          json(conn, %{note: WorkspaceJSON.comparison_note(note)})

        {:error, :listing_required} ->
          PublicError.json_error(conn, :bad_request, "Informe o imóvel.")

        {:error, :not_found} ->
          PublicError.json_error(conn, :not_found, :listing_not_found)

        {:error, changeset} ->
          changeset_error(conn, changeset)
      end
    end
  end

  defp profile(conn) do
    case profile_with_access(conn) do
      {:error, :missing_profile} ->
        PublicError.json_error(conn, :unauthorized, :unauthorized) |> halt()
        {:error, :halted}

      profile ->
        {:ok, profile}
    end
  end

  defp profile_with_access(%{assigns: %{current_workspace_access: "external"}} = conn) do
    %{
      user_id: conn.assigns.current_user_id,
      org_id: conn.assigns[:current_org_id],
      workspace_id: conn.assigns.current_workspace_id,
      access: "external"
    }
  end

  defp profile_with_access(conn) do
    Profile.profile_from_headers(
      conn.assigns[:current_user_id],
      conn.assigns[:current_org_id],
      conn.assigns[:current_workspace_id]
    )
  end

  defp changeset_error(conn, %Ecto.Changeset{} = changeset) do
    PublicError.json_error(conn, :bad_request, changeset)
  end

  defp not_found(conn, message), do: PublicError.json_error(conn, :not_found, message)
end
