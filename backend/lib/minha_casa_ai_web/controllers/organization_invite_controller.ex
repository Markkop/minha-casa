defmodule MinhaCasaAiWeb.OrganizationInviteController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Organizations
  alias MinhaCasaAiWeb.{OrganizationJSON, PublicError}

  def show(conn, %{"token" => token}) do
    case Organizations.get_invite_preview(token) do
      {:ok, preview} ->
        json(conn, %{invite: OrganizationJSON.invite_preview(preview)})

      {:error, :not_found} ->
        PublicError.json_error(conn, :not_found, :not_found, context: :invite)
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
        PublicError.json_error(conn, :not_found, :not_found, context: :invite)

      {:error, :expired} ->
        PublicError.json_error(conn, :gone, :expired)

      {:error, :unavailable} ->
        PublicError.json_error(conn, :gone, "invite is no longer available")

      {:error, :license_limit} ->
        PublicError.json_error(
          conn,
          :conflict,
          "Não há licenças disponíveis nesta imobiliária",
          code: "license_limit"
        )

      {:error, :family_membership_exists} ->
        PublicError.json_error(conn, :conflict, "a user can belong to only one family")

      {:error, %Ecto.Changeset{} = changeset} ->
        PublicError.json_error(conn, :bad_request, changeset)
    end
  end

  defp current_user_id(conn), do: conn.assigns[:current_user_id]
end
