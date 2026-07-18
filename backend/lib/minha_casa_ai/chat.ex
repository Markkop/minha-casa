defmodule MinhaCasaAi.Chat do
  import Ecto.Query

  alias MinhaCasaAi.Chat.{Conversation, Message}
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workflows
  alias MinhaCasaAi.Workspaces

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

      input =
        attrs
        |> normalize_message_input()
        |> attach_conversation_to_reply(conversation_id)

      {:ok, run} =
        Workflows.create_ingestion(%{
          input: input,
          user_id: Map.get(attrs, :user_id),
          org_id: Map.get(attrs, :org_id),
          workspace_id:
            Map.get(attrs, :workspace_id) ||
              Workspaces.workspace_id_for(Map.get(attrs, :user_id), Map.get(attrs, :org_id))
        })

      %{message: message, workflow: run, conversation_id: conversation_id}
    end)
  end

  def append_message(conversation_id, role, content, opts \\ []) do
    metadata = Keyword.get(opts, :metadata, %{})

    %Message{}
    |> Message.changeset(%{
      conversation_id: conversation_id,
      role: role,
      content: content,
      attachments: Keyword.get(opts, :attachments, []),
      metadata: metadata
    })
    |> Repo.insert()
  end

  def get_conversation(id), do: Repo.get(Conversation, id)

  def ensure_channel_conversation!(channel, user_id, metadata) when is_map(metadata) do
    wa_id = Map.get(metadata, "wa_id")
    chat_id = Map.get(metadata, "chat_id")

    existing =
      cond do
        channel == "whatsapp" and is_binary(wa_id) ->
          find_channel_conversation("whatsapp", "wa_id", wa_id, user_id)

        channel == "telegram" and is_binary(chat_id) ->
          find_channel_conversation("telegram", "chat_id", chat_id, user_id)

        true ->
          nil
      end

    existing ||
      create_conversation!(%{channel: channel, user_id: user_id, metadata: metadata})
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
      workspace_id:
        Map.get(attrs, :workspace_id) ||
          Workspaces.workspace_id_for(Map.get(attrs, :user_id), Map.get(attrs, :org_id)),
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

  defp attach_conversation_to_reply(input, conversation_id) when is_map(input) do
    reply = Map.get(input, "_reply", %{})
    Map.put(input, "_reply", Map.put(reply, "conversation_id", conversation_id))
  end

  defp attach_conversation_to_reply(input, _), do: input
end
