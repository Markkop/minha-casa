defmodule MinhaCasaAi.Chat do
  alias MinhaCasaAi.Chat.{Conversation, Message}
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workflows

  def create_message(attrs) do
    Repo.transaction(fn ->
      conversation_id = Map.get(attrs, :conversation_id) || create_conversation!(attrs).id

      message =
        %Message{}
        |> Message.changeset(%{
          conversation_id: conversation_id,
          role: "user",
          content: Map.get(attrs, :content),
          attachments: Map.get(attrs, :attachments, []),
          metadata: %{"channel" => Map.get(attrs, :channel, "web")}
        })
        |> Repo.insert!()

      run =
        Workflows.create_ingestion(%{
          input: normalize_message_input(attrs),
          user_id: Map.get(attrs, :user_id),
          org_id: Map.get(attrs, :org_id)
        })

      %{message: message, workflow: run}
    end)
  end

  defp create_conversation!(attrs) do
    %Conversation{}
    |> Conversation.changeset(%{
      channel: Map.get(attrs, :channel, "web"),
      user_id: Map.get(attrs, :user_id),
      org_id: Map.get(attrs, :org_id)
    })
    |> Repo.insert!()
  end

  defp normalize_message_input(%{content: content}) when is_binary(content) do
    %{"kind" => "text", "rawText" => content}
  end

  defp normalize_message_input(_attrs), do: %{"kind" => "text", "rawText" => ""}
end
