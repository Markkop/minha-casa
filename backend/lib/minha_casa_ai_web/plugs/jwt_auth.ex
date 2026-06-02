defmodule MinhaCasaAiWeb.Plugs.JwtAuth do
  @moduledoc """
  Authenticates browser API requests with Better Auth JWT bearer tokens.
  """

  import Plug.Conn
  import Phoenix.Controller

  alias MinhaCasaAi.Auth.JWKS
  alias MinhaCasaAi.Organizations

  def init(opts), do: opts

  def call(conn, _opts) do
    with ["Bearer " <> token] <- get_req_header(conn, "authorization"),
         {:ok, claims} <- JWKS.verify_token(token),
         user_id when is_binary(user_id) <- claims["sub"] || claims["id"],
         {:ok, org_id} <- verified_org_id(conn, user_id) do
      conn
      |> assign(:current_user_id, user_id)
      |> assign(:current_org_id, org_id)
      |> assign(:current_user_is_admin, claims["isAdmin"] == true)
      |> assign(:current_auth_claims, claims)
    else
      {:error, :forbidden_org} ->
        conn
        |> put_status(:forbidden)
        |> json(%{error: "You are not a member of this organization"})
        |> halt()

      _ ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: "Invalid or missing authentication token"})
        |> halt()
    end
  end

  defp verified_org_id(conn, user_id) do
    org_id =
      conn
      |> get_req_header("x-organization-id")
      |> List.first()
      |> blank_to_nil()

    cond do
      is_nil(org_id) ->
        {:ok, nil}

      Organizations.member?(user_id, org_id) ->
        {:ok, org_id}

      true ->
        {:error, :forbidden_org}
    end
  end

  defp blank_to_nil(nil), do: nil

  defp blank_to_nil(value) when is_binary(value) do
    value = String.trim(value)
    if value == "", do: nil, else: value
  end
end
