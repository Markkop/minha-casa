defmodule MinhaCasaAi.Assistant.Intent do
  @moduledoc """
  Deterministic intent classification for channel messages.
  """

  @help ~r/^(ajuda|help|\/help|\/start)\s*$/iu
  @cancel ~r/^(cancelar|cancel)\s*$/iu
  @collections ~r/^(cole[cç][oõ]es|minhas cole[cç][oõ]es)\s*$/iu
  @listings ~r/^(meus im[oó]veis|[uú]ltimos im[oó]veis)\s*$/iu
  @favorites ~r/^(favoritos|favoritos)\s*$/iu
  @star ~r/^(favoritar|estrela|star)\b/iu
  @edit ~r/^(editar|mudar|alterar)\s+(pre[cç]o|titulo|t[ií]tulo|endereco|endere[cç]o)\s+(.+)$/iu

  def classify(%{type: "callback"}), do: {:callback, :pending}

  def classify(%{type: type} = inbound) when type in ["photo", "document"] do
    {:ingest, inbound}
  end

  def classify(%{text: text} = inbound) when is_binary(text) do
    text = String.trim(text)

    cond do
      text == "" -> :unknown
      Regex.match?(@help, text) -> {:command, :help}
      Regex.match?(@cancel, text) -> {:command, :cancel}
      Regex.match?(@collections, text) -> {:command, :list_collections}
      Regex.match?(@listings, text) -> {:command, :list_listings}
      Regex.match?(@favorites, text) -> {:command, :list_favorites}
      Regex.match?(@star, text) -> {:command, :toggle_star}
      Regex.match?(@edit, text) -> parse_edit(text, inbound)
      ingest_content?(text) -> {:ingest, Map.put(inbound, :text, text)}
      natural_language?(text) -> {:llm, text}
      true -> :unknown
    end
  end

  def classify(%{message: message} = inbound) when is_map(message) do
    text =
      case message do
        %{"text" => %{"body" => body}} when is_binary(body) -> body
        %{"text" => body} when is_binary(body) -> body
        _ -> nil
      end

    if text do
      classify(Map.put(inbound, :text, text))
    else
      {:ingest, inbound}
    end
  end

  def classify(_), do: :unknown

  defp parse_edit(text, inbound) do
    case Regex.run(@edit, text) do
      [_, field, value] ->
        {:command, {:edit_field, normalize_field(field), String.trim(value), inbound}}

      _ ->
        :unknown
    end
  end

  defp normalize_field("preco"), do: "price"
  defp normalize_field("preço"), do: "price"
  defp normalize_field("titulo"), do: "title"
  defp normalize_field("título"), do: "title"
  defp normalize_field("endereco"), do: "address"
  defp normalize_field("endereço"), do: "address"
  defp normalize_field(field), do: field

  defp ingest_content?(text) do
    String.starts_with?(text, "http://") or String.starts_with?(text, "https://") or
      String.length(text) > 80
  end

  defp natural_language?(text) do
    String.length(text) > 12 and not String.starts_with?(text, "/")
  end
end
