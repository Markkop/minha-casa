defmodule MinhaCasaAiWeb.AddonController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.{Billing, Organizations}
  alias MinhaCasaAiWeb.BillingJSON

  def user_index(conn, _params) do
    addons =
      conn
      |> current_user_id()
      |> Billing.list_current_user_addons()
      |> Enum.map(&BillingJSON.addon_grant/1)

    json(conn, %{addons: addons})
  end

  def update_user(conn, %{"slug" => slug, "enabled" => enabled}) do
    case Billing.update_user_addon_enabled(current_user_id(conn), slug, enabled) do
      {:ok, grant} ->
        json(conn, %{success: true, addon: BillingJSON.addon_grant(%{grant: grant, addon: nil})})

      {:error, :not_found} ->
        not_found(conn, "Addon")

      {:error, :invalid} ->
        bad_request(conn, "enabled field must be a boolean")

      {:error, changeset} ->
        changeset_error(conn, changeset)
    end
  end

  def update_user(conn, _params), do: bad_request(conn, "enabled field must be a boolean")

  def delete_user(conn, %{"slug" => slug}) do
    case Billing.revoke_user_addon(current_user_id(conn), slug) do
      {:ok, grant} ->
        json(conn, %{
          success: true,
          revokedGrant: BillingJSON.addon_grant(%{grant: grant, addon: nil})
        })

      {:error, :not_found} ->
        not_found(conn, "Addon")
    end
  end

  def organization_index(conn, %{"id" => org_id}) do
    with {:ok, _organization} <- Organizations.get_for_user(org_id, current_user_id(conn)) do
      addons =
        org_id
        |> Billing.list_current_organization_addons()
        |> Enum.map(&BillingJSON.addon_grant/1)

      json(conn, %{addons: addons})
    else
      {:error, :not_found} -> not_found(conn, "Organization")
    end
  end

  def update_organization(conn, %{"id" => org_id, "slug" => slug, "enabled" => enabled}) do
    with {:ok, organization} <- Organizations.get_for_user(org_id, current_user_id(conn)),
         true <- Organizations.can_manage_members?(Map.get(organization, :role)) do
      case Billing.update_organization_addon_enabled(org_id, slug, enabled) do
        {:ok, grant} ->
          json(conn, %{success: true, addon: BillingJSON.addon_grant(%{grant: grant, addon: nil})})

        {:error, :not_found} ->
          not_found(conn, "Addon")

        {:error, :invalid} ->
          bad_request(conn, "enabled field must be a boolean")

        {:error, changeset} ->
          changeset_error(conn, changeset)
      end
    else
      {:error, :not_found} -> not_found(conn, "Organization")
      false -> forbidden(conn, "Only owners and admins can toggle organization addons")
    end
  end

  def update_organization(conn, _params), do: bad_request(conn, "enabled field must be a boolean")

  def delete_organization(conn, %{"id" => org_id, "slug" => slug}) do
    with {:ok, organization} <- Organizations.get_for_user(org_id, current_user_id(conn)),
         true <- Organizations.can_manage_members?(Map.get(organization, :role)) do
      case Billing.revoke_organization_addon(org_id, slug) do
        {:ok, grant} ->
          json(conn, %{
            success: true,
            revokedGrant: BillingJSON.addon_grant(%{grant: grant, addon: nil})
          })

        {:error, :not_found} ->
          not_found(conn, "Addon")
      end
    else
      {:error, :not_found} -> not_found(conn, "Organization")
      false -> forbidden(conn, "Only owners and admins can revoke organization addons")
    end
  end

  def access(conn, %{"slug" => slug}) do
    user_id = current_user_id(conn)
    org_id = current_org_id(conn, user_id)

    json(conn, %{
      hasAccess: Billing.has_addon_access?(user_id, slug, org_id),
      organizationId: org_id
    })
  end

  defp current_org_id(conn, user_id) do
    conn
    |> get_req_header("x-organization-id")
    |> List.first()
    |> case do
      org_id when is_binary(org_id) and org_id != "" ->
        if Organizations.member?(user_id, org_id), do: org_id, else: nil

      _ ->
        nil
    end
  end

  defp current_user_id(conn), do: conn.assigns[:current_user_id]

  defp changeset_error(conn, %Ecto.Changeset{} = changeset) do
    error =
      changeset
      |> Ecto.Changeset.traverse_errors(fn {msg, _} -> msg end)
      |> Enum.map(fn {field, msgs} -> "#{field} #{Enum.join(msgs, ", ")}" end)
      |> List.first()

    bad_request(conn, error || "Invalid data")
  end

  defp bad_request(conn, message), do: conn |> put_status(:bad_request) |> json(%{error: message})
  defp forbidden(conn, message), do: conn |> put_status(:forbidden) |> json(%{error: message})

  defp not_found(conn, name),
    do: conn |> put_status(:not_found) |> json(%{error: "#{name} not found"})
end
