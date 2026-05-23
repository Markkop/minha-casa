defmodule MinhaCasaAi.Chat do
  import Ecto.Query

  alias MinhaCasaAi.Chat.{Conversation, Message}
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workflows

  def create_message(attrs) do
    Repo.transaction(fn ->
      conversation_id =
        Map.get(attrs, :conversation_id) || find_or_create_conversation!(attrs).id

      channel = Map.get(attrs, :channel, "web")
      metadata = build_message_metadata(attrs, channel)

      message =
        %Message{}
        |> Message.changeset(%{
          conversation_id: conversation_id,
          role: "user",
          content: Map.get(attrs, :content),
          attachments: Map.get(attrs, :attachments, []),
          metadata: metadata
        })
        |> Repo.insert!()

      {:ok, run} =
        Workflows.create_ingestion(%{
          input: normalize_message_input(attrs),
          user_id: Map.get(attrs, :user_id),
          org_id: Map.get(attrs, :org_id)
        })

      %{message: message, workflow: run}
    end)
  end

  defp find_or_create_conversation!(attrs) do
    channel = Map.get(attrs, :channel, "web")
    metadata = Map.get(attrs, :metadata, %{})
    wa_id = Map.get(metadata, "wa_id") || Map.get(metadata, :wa_id)
    chat_id = Map.get(metadata, "chat_id") || Map.get(metadata, :chat_id)

    cond do
      channel == "whatsapp" and is_binary(wa_id) ->
        case find_channel_conversation("whatsapp", "wa_id", wa_id, Map.get(attrs, :user_id)) do
          nil -> create_conversation!(attrs)
          conversation -> conversation
        end

      channel == "telegram" and is_binary(chat_id) ->
        case find_channel_conversation("telegram", "chat_id", chat_id, Map.get(attrs, :user_id)) do
          nil -> create_conversation!(attrs)
          conversation -> conversation
        end

      true ->
        create_conversation!(attrs)
    end
  end

  defp find_channel_conversation(channel, metadata_key, metadata_value, user_id) do
    query =
      from(c in Conversation,
        where:
          c.channel == ^channel and
            fragment("(?->>?) = ?", c.metadata, ^metadata_key, ^metadata_value),
        limit: 1
      )

    query =
      if user_id do
        from(c in query, where: c.user_id == ^user_id)
      else
        query
      end

    Repo.one(query)
  end

  defp create_conversation!(attrs) do
    channel = Map.get(attrs, :channel, "web")
    metadata = Map.get(attrs, :metadata, %{})
    wa_id = Map.get(metadata, "wa_id") || Map.get(metadata, :wa_id)
    chat_id = Map.get(metadata, "chat_id") || Map.get(metadata, :chat_id)

    metadata =
      metadata
      |> then(fn m -> if wa_id, do: Map.put(m, "wa_id", wa_id), else: m end)
      |> then(fn m -> if chat_id, do: Map.put(m, "chat_id", chat_id), else: m end)

    %Conversation{}
    |> Conversation.changeset(%{
      channel: channel,
      user_id: Map.get(attrs, :user_id),
      org_id: Map.get(attrs, :org_id),
      metadata: metadata
    })
    |> Repo.insert!()
  end

  defp build_message_metadata(attrs, channel) do
    base = %{"channel" => channel}
    extra = Map.get(attrs, :metadata, %{})

    Map.merge(base, extra, fn _k, _a, b -> b end)
  end

  defp normalize_message_input(attrs) do
    metadata = Map.get(attrs, :metadata, %{})

    case Map.get(metadata, "parser_input") do
      input when is_map(input) ->
        input

      _ ->
        fallback_message_input(attrs)
    end
  end

  defp fallback_message_input(%{content: content}) when is_binary(content) do
    %{"kind" => "text", "rawText" => content}
  end

  defp fallback_message_input(_attrs), do: %{"kind" => "text", "rawText" => ""}
end
