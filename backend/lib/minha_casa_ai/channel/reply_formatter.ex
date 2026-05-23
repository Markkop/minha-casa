defmodule MinhaCasaAi.Channel.ReplyFormatter do
  def workflow_summary(%{"listings" => listings}) when is_list(listings) and listings != [] do
    count = length(listings)

    previews =
      listings
      |> Enum.take(3)
      |> Enum.map(&listing_line/1)
      |> Enum.join("\n")

    extra =
      if count > 3 do
        "\n… e mais #{count - 3} imóvel(is)."
      else
        ""
      end

    """
    Encontrei #{count} anúncio(s):

    #{previews}#{extra}

    Acesse o Minha Casa para revisar e salvar na sua coleção.
    """
    |> String.trim()
  end

  def workflow_summary(_), do: "Não consegui extrair dados de anúncio desta mensagem. Tente enviar mais detalhes, um link ou uma imagem mais legível."

  def error(:empty_text), do: "Envie um texto, link, imagem ou PDF com o anúncio."
  def error(:unsupported_audio), do: "Áudio ainda não é suportado. Envie texto, link, imagem ou PDF."
  def error(:unsupported_document), do: "Esse tipo de arquivo não é suportado. Envie PDF, imagem, texto ou link."
  def error(:unsupported_message_type), do: "Esse tipo de mensagem não é suportado ainda."
  def error(_), do: "Não foi possível processar sua mensagem. Tente novamente."

  defp listing_line(listing) when is_map(listing) do
    title = Map.get(listing, "titulo") || Map.get(listing, :titulo) || "Sem título"
    price = Map.get(listing, "preco") || Map.get(listing, :preco)
    city = Map.get(listing, "cidade") || Map.get(listing, :cidade)

    parts =
      [
        "• #{title}",
        price && "R$ #{format_price(price)}",
        city
      ]
      |> Enum.reject(&is_nil/1)

    Enum.join(parts, " — ")
  end

  defp format_price(price) when is_number(price) do
    price
    |> trunc()
    |> Integer.to_string()
    |> String.reverse()
    |> String.graphemes()
    |> Enum.chunk_every(3)
    |> Enum.join(".")
    |> String.reverse()
  end

  defp format_price(price) when is_binary(price), do: price
  defp format_price(_), do: "—"
end
