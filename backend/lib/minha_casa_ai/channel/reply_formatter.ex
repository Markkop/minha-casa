defmodule MinhaCasaAi.Channel.ReplyFormatter do
  alias MinhaCasaAi.Ingestion.Complete

  def ingestion_result(%{pending_type: "multi_import", multi_count: count, collection: collection} = result) do
    name = collection_name(collection)

    numbered =
      result
      |> Map.get(:multi_previews, [])
      |> Enum.map(fn {listing, n} ->
        title = Map.get(listing, "titulo") || "Sem título"
        "#{n}. #{title}"
      end)
      |> Enum.join("\n")

    """
    Encontrei #{count} anúncio(s):

    #{numbered}

    Responda com os números (ex.: 1,3), "todos", ou use os botões.
    Coleção: "#{name}"
    """
    |> String.trim()
  end

  def ingestion_result(%{pending_type: "duplicate_resolution", duplicates: [first | _], collection: collection}) do
    title = Map.get(first.listing_data, "titulo") || "Imóvel"
    name = collection_name(collection)
    candidate = hd(first.candidates)
    reason = duplicate_reason_label(candidate[:reason] || candidate["reason"])

    """
    Possível duplicado em "#{name}": #{title}

    Motivo: #{reason}

    Responda:
    1 — Salvar mesmo assim
    2 — Ignorar
    3 — Ver no site
    """
    |> String.trim()
  end

  def ingestion_result(%{saved: saved, collection: collection}) when saved != [] do
    name = collection_name(collection)

  lines =
      Enum.map(saved, fn item ->
        line = "• #{item.title}"
        if item.url, do: "#{line}\n  #{item.url}", else: line
      end)

    """
    Salvei #{length(saved)} imóvel(is) em "#{name}":

    #{Enum.join(lines, "\n\n")}

    Para ajustar um campo, responda por exemplo: editar preço 1900000
    Digite "ajuda" para ver comandos.
    """
    |> String.trim()
  end

  def ingestion_result(_), do: workflow_summary(%{"listings" => []})

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
    """
    |> String.trim()
  end

  def workflow_summary(_),
    do:
      "Não consegui extrair dados de anúncio desta mensagem. Tente enviar mais detalhes, um link ou uma imagem mais legível."

  def help_text do
    """
    Comandos disponíveis:
    • Envie link, texto, imagem ou PDF de anúncio para importar
    • coleções — listar suas coleções
    • meus imóveis — últimos imóveis salvos
    • favoritos — imóveis favoritos
    • editar preço 1500000 — ajustar último imóvel salvo
    • cancelar — cancelar ação pendente
    • ajuda — esta mensagem
    """
    |> String.trim()
  end

  def list_collections(collections) do
    if collections == [] do
      "Você ainda não tem coleções."
    else
      lines =
        Enum.map(collections, fn c ->
          default = if c.is_default, do: " (padrão)", else: ""
          "• #{c.name}#{default}"
        end)

      "Suas coleções:\n\n#{Enum.join(lines, "\n")}"
    end
  end

  def list_listings(listings, collection_name) do
    if listings == [] do
      "Nenhum imóvel em \"#{collection_name}\"."
    else
      lines =
        Enum.map(listings, fn l ->
          data = l.data || %{}
          title = Map.get(data, "titulo") || "Sem título"
          starred = if data["starred"], do: " ★", else: ""
          "• #{title}#{starred}"
        end)

      "Imóveis em \"#{collection_name}\":\n\n#{Enum.join(lines, "\n")}"
    end
  end

  def tool_message(text) when is_binary(text), do: text

  def error(:empty_text), do: "Envie um texto, link, imagem ou PDF com o anúncio."
  def error(:unsupported_audio), do: "Áudio ainda não é suportado. Envie texto, link, imagem ou PDF."

  def error(:unsupported_document),
    do: "Esse tipo de arquivo não é suportado. Envie PDF, imagem, texto ou link."

  def error(:unsupported_message_type), do: "Esse tipo de mensagem não é suportado ainda."
  def error(:pending_expired), do: "Esta ação expirou. Envie o anúncio novamente."
  def error(:invalid_pending_reply), do: "Não entendi. Responda 1, 2 ou 3, ou digite cancelar."
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

  defp collection_name(%{name: name}) when is_binary(name), do: name
  defp collection_name(_), do: "sua coleção"

  defp duplicate_reason_label("same_url"), do: "mesmo link"
  defp duplicate_reason_label("same_address_price_area"), do: "mesmo endereço, preço e área"
  defp duplicate_reason_label("same_address_price"), do: "mesmo endereço e preço"
  defp duplicate_reason_label("same_address"), do: "mesmo endereço"
  defp duplicate_reason_label(_), do: "similaridade alta"

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
