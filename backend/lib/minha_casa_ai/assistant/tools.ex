defmodule MinhaCasaAi.Assistant.Tools do
  @moduledoc """
  Account operations for the channel assistant.
  """

  alias MinhaCasaAi.Channel.ReplyFormatter
  alias MinhaCasaAi.Chat.Pending
  alias MinhaCasaAi.Listings

  def run(_user_id, :help, _ctx), do: {:ok, ReplyFormatter.help_text()}

  def run(_user_id, :cancel, ctx) do
    if conversation_id = ctx[:conversation_id] do
      Pending.clear!(conversation_id)
    end

    {:ok, "Ação cancelada."}
  end

  def run(user_id, :list_collections, _ctx) do
    collections = Listings.list_collections(user_id, nil)
    {:ok, ReplyFormatter.list_collections(collections)}
  end

  def run(user_id, :list_listings, _ctx) do
    with %{} = collection <- Listings.ensure_default_collection!(user_id, nil) do
      listings = Listings.list_listings(collection.id, limit: 5)
      {:ok, ReplyFormatter.list_listings(listings, collection.name)}
    end
  end

  def run(user_id, :list_favorites, _ctx) do
    with %{} = collection <- Listings.ensure_default_collection!(user_id, nil) do
      listings = Listings.list_listings(collection.id, limit: 20, starred_only: true)
      {:ok, ReplyFormatter.list_listings(listings, collection.name)}
    end
  end

  def run(user_id, :toggle_star, ctx) do
    conversation_id = ctx[:conversation_id]
    metadata = if conversation_id, do: get_metadata(conversation_id), else: %{}
    listing_id = Map.get(metadata, "last_listing_id")

    if is_nil(listing_id) do
      {:ok, "Nenhum imóvel recente para favoritar. Envie um anúncio primeiro."}
    else
      with %{} = collection <- Listings.ensure_default_collection!(user_id, nil),
           {:ok, listing} <- Listings.get_listing(collection.id, listing_id, user_id: user_id),
           starred = !(listing.data["starred"] == true),
           {:ok, _} <- Listings.toggle_starred(collection.id, listing_id, starred, user_id: user_id) do
        label = if starred, do: "adicionado aos", else: "removido dos"
        {:ok, "Imóvel #{label} favoritos."}
      else
        _ -> {:ok, "Não encontrei o imóvel para favoritar."}
      end
    end
  end

  def run(user_id, {:edit_field, field, value, _inbound}, ctx) do
    conversation_id = ctx[:conversation_id]
    metadata = if conversation_id, do: get_metadata(conversation_id), else: %{}
    listing_id = Map.get(metadata, "last_listing_id")

    if is_nil(listing_id) do
      {:ok, "Envie um anúncio antes de editar campos."}
    else
      with %{} = collection <- Listings.ensure_default_collection!(user_id, nil),
           {:ok, _} <-
             Listings.update_listing(
               collection.id,
               listing_id,
               %{field => parse_field_value(field, value)},
               user_id: user_id
             ) do
        {:ok, "Atualizei #{field_label(field)} para #{value}."}
      else
        _ -> {:ok, "Não consegui atualizar o imóvel."}
      end
    end
  end

  def run(_user_id, _command, _ctx), do: {:ok, ReplyFormatter.help_text()}

  defp get_metadata(conversation_id) do
    case MinhaCasaAi.Chat.get_conversation(conversation_id) do
      nil -> %{}
      conv -> conv.metadata || %{}
    end
  end

  defp parse_field_value("preco", value) do
    cleaned = Regex.replace(~r/[^\d]/, value, "")

    case Integer.parse(cleaned) do
      {int, _} -> int
      _ -> value
    end
  end

  defp parse_field_value(_field, value), do: value

  defp field_label("preco"), do: "preço"
  defp field_label("titulo"), do: "título"
  defp field_label("endereco"), do: "endereço"
  defp field_label(field), do: field
end
