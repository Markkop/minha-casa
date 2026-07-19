defmodule MinhaCasaAiWeb.OrganizationInviteController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Organizations
  alias MinhaCasaAiWeb.OrganizationJSON

  def show(conn, %{"token" => token}) do
    case Organizations.get_invite_preview(token) do
      {:ok, preview} ->
        json(conn, %{invite: OrganizationJSON.invite_preview(preview)})

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "Invite not found"})
    end
  end

  def accept(conn, %{"token" => token}) do
    case Organizations.accept_invite(token, current_user_id(conn)) do
      {:ok, :accepted, member, organization} ->
        conn
        |> put_status(:created)
        |> json(%{
          status: "accepted",
          alreadyMember: false,
          member: OrganizationJSON.member(member),
          organization: OrganizationJSON.organization(organization)
        })

      {:ok, :already_member, organization} ->
        json(conn, %{
          status: "already_member",
          alreadyMember: true,
          organization: OrganizationJSON.organization(organization)
        })

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "Invite not found"})

      {:error, :expired} ->
        conn |> put_status(:gone) |> json(%{error: "Invite has expired"})

      {:error, :unavailable} ->
        conn |> put_status(:gone) |> json(%{error: "Invite is no longer available"})

      {:error, :license_limit} ->
        conn
        |> put_status(:conflict)
        |> json(%{error: "Não há licenças disponíveis nesta imobiliária"})

      {:error, :family_membership_exists} ->
        conn |> put_status(:conflict) |> json(%{error: "A user can belong to only one Family"})

      {:error, %Ecto.Changeset{} = changeset} ->
        changeset_error(conn, changeset)
    end
  end

  defp current_user_id(conn), do: conn.assigns[:current_user_id]

  defp changeset_error(conn, %Ecto.Changeset{} = changeset) do
    error =
      changeset
      |> Ecto.Changeset.traverse_errors(fn {msg, _} -> msg end)
      |> Enum.map(fn {field, msgs} -> "#{field} #{Enum.join(msgs, ", ")}" end)
      |> List.first()

    conn |> put_status(:bad_request) |> json(%{error: error || "Invalid data"})
  end
end
