defmodule MinhaCasaAiWeb.ChatController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Chat

  def create(conn, params) do
    attrs = %{
      conversation_id: params["conversationId"],
      content: params["content"],
      attachments: params["attachments"] || [],
      channel: "web",
      user_id: conn.assigns[:current_user_id],
      org_id: conn.assigns[:current_org_id],
      workspace_id: conn.assigns[:current_workspace_id]
    }

    case Chat.create_message(attrs) do
      {:ok, %{message: message, workflow: {:ok, workflow}}} ->
        conn
        |> put_status(:accepted)
        |> json(%{
          message: %{id: message.id, conversationId: message.conversation_id},
          workflow: %{id: workflow.id, status: workflow.status}
        })

      {:ok, %{message: message, workflow: workflow}} ->
        conn
        |> put_status(:accepted)
        |> json(%{
          message: %{id: message.id, conversationId: message.conversation_id},
          workflow: %{id: workflow.id, status: workflow.status}
        })

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: inspect(reason)})
    end
  end
end
