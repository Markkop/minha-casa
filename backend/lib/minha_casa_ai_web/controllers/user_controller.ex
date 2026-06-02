defmodule MinhaCasaAiWeb.UserController do
  use MinhaCasaAiWeb, :controller

  def me(conn, _params) do
    json(conn, %{
      user: %{
        id: conn.assigns.current_user_id,
        isAdmin: conn.assigns[:current_user_is_admin] == true
      }
    })
  end
end
