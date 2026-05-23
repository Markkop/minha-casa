defmodule MinhaCasaAi.Channel.ReplyFormatter do
  alias MinhaCasaAi.ListingShortLinks

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

    cards =
      Enum.map(saved, fn item ->
        data = Map.get(item, :listing_data) || Map.get(item, "listing_data") || %{}

        format_listing_card(data,
          listing_id: item[:listing_id] || item["listing_id"],
          collection_id: item[:collection_id] || item["collection_id"]
        )
      end)

    """
    Salvei #{length(saved)} imóvel(is) em "#{name}":

    #{Enum.join(cards, "\n\n")}

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
      |> Enum.map(&format_listing_card/1)
      |> Enum.join("\n\n")

    extra =
      if count > 3 do
        "\n\n… e mais #{count - 3} imóvel(is)."
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
      cards =
        Enum.map(listings, fn l ->
          data = l.data || %{}

          format_listing_card(data,
            listing_id: l.id,
            collection_id: l.collection_id
          )
        end)

      "Imóveis em \"#{collection_name}\":\n\n#{Enum.join(cards, "\n\n")}"
    end
  end

  def format_listing_card(data, opts \\ []) when is_map(data) do
    data = normalize_data(data)
    listing_id = Keyword.get(opts, :listing_id)
    collection_id = Keyword.get(opts, :collection_id)

    [
      header_line(data),
      metrics_line(data),
      address_line(data),
      url_line(listing_id, collection_id)
    ]
    |> Enum.reject(&is_nil/1)
    |> Enum.reject(&(&1 == ""))
    |> Enum.join("\n")
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

  defp header_line(data) do
    starred = if truthy?(data["starred"]), do: "★ ", else: ""

    parts =
      [
        tipo_label(data["tipoImovel"]),
        header_area(data),
        header_price(data)
      ]
      |> Enum.reject(&is_nil/1)

    case parts do
      [] -> nil
      _ -> starred <> Enum.join(parts, " | ")
    end
  end

  defp metrics_line(data) do
    parts =
      [
        metric_area(data),
        metric_count("🛏️", data["quartos"]),
        metric_count("🚿", data["banheiros"]),
        metric_count("🚗", data["garagem"]),
        metric_flag("🏊", data["piscina"]),
        metric_flag("🏋️", data["academia"]),
        metric_flag("🛎️", data["porteiro24h"]),
        metric_flag("🌅", data["vistaLivre"]),
        metric_flag("♨️", data["piscinaTermica"])
      ]
      |> Enum.reject(&is_nil/1)

    case parts do
      [] -> nil
      _ -> Enum.join(parts, " | ")
    end
  end

  defp address_line(data) do
    street = present_string(data["endereco"])

    location =
      [data["bairro"], data["cidade"]]
      |> Enum.map(&present_string/1)
      |> Enum.reject(&is_nil/1)
      |> case do
        [] -> nil
        parts -> Enum.join(parts, ", ")
      end

    cond do
      street && location -> "#{street} — #{location}"
      street -> street
      location -> location
      true -> nil
    end
  end

  defp url_line(listing_id, collection_id)
       when is_binary(listing_id) and is_binary(collection_id) do
    case ListingShortLinks.short_url(collection_id, listing_id) do
      nil -> nil
      url -> url
    end
  end

  defp url_line(_, _), do: nil

  defp tipo_label("casa"), do: "Casa"
  defp tipo_label("apartamento"), do: "Apto"
  defp tipo_label(_), do: nil

  defp header_area(data) do
    case primary_m2(data) do
      nil -> nil
      m2 -> "#{format_number(m2)} m²"
    end
  end

  defp header_price(data) do
    preco = numeric_value(data["preco"])

    if is_nil(preco) or preco <= 0 do
      nil
    else
      preco_m2 = numeric_value(data["precoM2"]) || price_per_m2(preco, data)

      if preco_m2 && preco_m2 > 0 do
        "R$ #{format_price(preco)} (R$ #{format_price(preco_m2)}/m²)"
      else
        "R$ #{format_price(preco)}"
      end
    end
  end

  defp metric_area(data) do
    privado = numeric_value(data["m2Privado"])
    total = numeric_value(data["m2Totais"])

    cond do
      privado && total && privado != total ->
        "📐 #{format_number(privado)}/#{format_number(total)} m²"

      privado ->
        "📐 #{format_number(privado)} m²"

      total ->
        "📐 #{format_number(total)} m²"

      true ->
        nil
    end
  end

  defp metric_count(_emoji, nil), do: nil
  defp metric_count(_emoji, ""), do: nil

  defp metric_count(emoji, value) do
    case numeric_value(value) do
      n when is_number(n) and n > 0 -> "#{emoji} #{format_number(n)}"
      _ -> nil
    end
  end

  defp metric_flag(emoji, value) do
    if truthy?(value), do: emoji, else: nil
  end

  defp primary_m2(data) do
    numeric_value(data["m2Privado"]) || numeric_value(data["m2Totais"])
  end

  defp price_per_m2(preco, data) do
    case primary_m2(data) do
      m2 when is_number(m2) and m2 > 0 -> preco / m2
      _ -> nil
    end
  end

  defp normalize_data(data) when is_map(data) do
    Map.new(data, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {k, v}
    end)
  end

  defp truthy?(value) when value in [true, "true", 1, "1"], do: true
  defp truthy?(_), do: false

  defp present_string(value) when is_binary(value) do
    trimmed = String.trim(value)
    if trimmed == "", do: nil, else: trimmed
  end

  defp present_string(_), do: nil

  defp numeric_value(value) when is_integer(value), do: value * 1.0
  defp numeric_value(value) when is_float(value), do: value

  defp numeric_value(value) when is_binary(value) do
    case Float.parse(String.trim(value)) do
      {n, _} -> n
      :error -> nil
    end
  end

  defp numeric_value(_), do: nil

  defp format_number(n) when is_float(n) and n == trunc(n), do: format_number(trunc(n))

  defp format_number(n) when is_integer(n) do
    n
    |> Integer.to_string()
    |> String.reverse()
    |> String.graphemes()
    |> Enum.chunk_every(3)
    |> Enum.join(".")
    |> String.reverse()
  end

  defp format_number(n) when is_float(n) do
    n
    |> Float.round(1)
    |> to_string()
    |> String.replace(".", ",")
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
