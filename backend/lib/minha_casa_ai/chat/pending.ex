defmodule MinhaCasaAi.Chat.Pending do
  @moduledoc """
  Conversation-level pending actions (duplicate resolution, multi-import, field edit).
  """

  alias MinhaCasaAi.Chat.Conversation
  alias MinhaCasaAi.Repo

  @ttl_minutes 30

  def get(%Conversation{} = conversation) do
    pending = get_in(conversation.metadata || %{}, ["pending"])
    if expired?(pending), do: nil, else: pending
  end

  def get(conversation_id) when is_binary(conversation_id) do
    case Repo.get(Conversation, conversation_id) do
      nil -> nil
      conversation -> get(conversation)
    end
  end

  def set!(conversation_id, pending) when is_map(pending) do
    expires_at =
      DateTime.utc_now()
      |> DateTime.add(@ttl_minutes * 60, :second)
      |> DateTime.truncate(:second)
      |> DateTime.to_iso8601()

    pending = Map.put(pending, "expires_at", expires_at)

    conversation = Repo.get!(Conversation, conversation_id)
    metadata = Map.put(conversation.metadata || %{}, "pending", pending)

    conversation
    |> Conversation.changeset(%{metadata: metadata})
    |> Repo.update!()
  end

  def clear!(conversation_id) do
    conversation = Repo.get!(Conversation, conversation_id)
    metadata = Map.delete(conversation.metadata || %{}, "pending")

    conversation
    |> Conversation.changeset(%{metadata: metadata})
    |> Repo.update!()
  end

  def set_last_listing_id!(conversation_id, listing_id) do
    conversation = Repo.get!(Conversation, conversation_id)
    metadata = Map.put(conversation.metadata || %{}, "last_listing_id", listing_id)

    conversation
    |> Conversation.changeset(%{metadata: metadata})
    |> Repo.update!()
  end

  def active?(conversation_id) do
    case get(conversation_id) do
      nil -> false
      _ -> true
    end
  end

  defp expired?(nil), do: true

  defp expired?(%{"expires_at" => expires_at}) when is_binary(expires_at) do
    case DateTime.from_iso8601(expires_at) do
      {:ok, dt, _} -> DateTime.compare(DateTime.utc_now(), dt) == :gt
      _ -> true
    end
  end

  defp expired?(_), do: false
end
