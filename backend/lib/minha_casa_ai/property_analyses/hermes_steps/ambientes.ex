defmodule MinhaCasaAi.PropertyAnalyses.HermesSteps.Ambientes do
  @behaviour MinhaCasaAi.PropertyAnalyses.HermesSteps.Behaviour

  alias MinhaCasaAi.PropertyAnalyses.HermesSteps.Step
  alias MinhaCasaAi.PropertyAnalyses.InventoryVocab

  @categories [
    "sala",
    "cozinha",
    "quarto",
    "banheiro",
    "areaServico",
    "varanda",
    "areaExterna",
    "garagem",
    "fachada",
    "areaComum",
    "circulacao",
    "escritorio",
    "closet",
    "deposito",
    "vista"
  ]

  @multi_categories ~w(sala quarto banheiro varanda areaComum circulacao escritorio)

  @canonical_by_slug %{
    "sala" => "sala",
    "cozinha" => "cozinha",
    "quarto" => "quarto",
    "banheiro" => "banheiro",
    "areaservico" => "areaServico",
    "varanda" => "varanda",
    "areaexterna" => "areaExterna",
    "garagem" => "garagem",
    "fachada" => "fachada",
    "areacomum" => "areaComum",
    "circulacao" => "circulacao",
    "escritorio" => "escritorio",
    "closet" => "closet",
    "deposito" => "deposito",
    "vista" => "vista"
  }

  @category_aliases %{
    "areaservico" => "areaServico",
    "area de servico" => "areaServico",
    "areaexterna" => "areaExterna",
    "area externa" => "areaExterna",
    "areacomum" => "areaComum",
    "area comum" => "areaComum",
    "living" => "sala",
    "estar" => "sala",
    "dormitorio" => "quarto",
    "suite" => "quarto",
    "lavabo" => "banheiro",
    "lavanderia" => "areaServico",
    "sacada" => "varanda",
    "terraco" => "varanda",
    "homeoffice" => "escritorio",
    "home office" => "escritorio",
    "despensa" => "deposito"
  }

  @impl true
  def key, do: "ambientes"

  @impl true
  def prompt(bundle, _address, _opts) do
    input_path = Map.get(bundle, :input_path)
    images_dir = Path.join(Map.get(bundle, :root), "images")
    facts = Step.facts_text(bundle) || "n/d"
    catalog = Map.get(bundle, :catalog_count, 0)
    max_cards = min(catalog, 14)

    """
    Analise TODAS as fotos do imóvel e classifique cada ambiente físico distinto.

    Leia #{input_path} e as imagens em #{images_dir}.
    Use os índices de imagem exatamente como em input.json.

    Dados do anúncio: #{facts}

    IMPORTANTE: NÃO gere pontos de atenção neste passo — outro agente (x-ray) fará isso depois.
    Produza apenas reconhecimento de ambiente, inventário estrutural e de móveis.

    Categorias permitidas (campo categoria, use EXATAMENTE uma destas strings):
    #{Enum.join(@categories, ", ")}

    Definições:
    - sala: estar, TV, jantar integrada, living, ambientes sociais internos.
    - cozinha: fechada, americana, ilha, copa integrada.
    - quarto: dormitório, suíte (suíte é atributo, não categoria separada).
    - banheiro: social, suíte, lavabo.
    - areaServico: lavanderia, tanque, máquina, varal técnico.
    - varanda: sacada, terraço privativo, churrasqueira na varanda.
    - areaExterna: jardim, quintal, piscina privativa, deck, churrasqueira externa.
    - garagem: vaga, box, estacionamento coberto/descoberto.
    - fachada: frente, portão, vista externa do edifício.
    - areaComum: hall do prédio, portaria, salão de festas, academia do condomínio, piscina/quadra do condomínio.
    - circulacao: corredor, escada, mezanino, passagens internas.
    - escritorio: home office, estudo, biblioteca.
    - closet, deposito, vista: conforme uso usual.

    Regras de separação (obrigatório — só para agrupar fotos em cards, NÃO vai no inventário):
    - Separe ambientes distintos pelo PISO e pelas PAREDES: cor do piso, cor das paredes, material do piso,
      sentido das tábuas/rejunte, móveis FIXOS (cama, pia, bancada) e layout.
    - Use cor de piso e parede apenas para decidir se duas fotos são o mesmo ambiente; não descreva cor no inventário.
    - Se a mesma cama/piso/cabeceira aparece em duas fotos, é o MESMO quarto — uma única card.
    - Múltiplos cards só para: #{Enum.join(@multi_categories, ", ")}.
    - Demais categorias: no máximo UM card (ex.: uma Cozinha, uma Garagem).
    - Máximo #{max_cards} cards no total.
    - Categorize pelo menos 90% das fotos; só use semCategoria para fotos realmente ambíguas.
    - Se não couber em nenhuma categoria, coloque os índices em semCategoria — NÃO invente categoria.

    Para cada card:
    - id: slug estável (ex.: quarto-1, cozinha)
    - categoria: uma das permitidas
    - ordinal: número quando múltiplo permitido
    - rotulo: "Quarto 1" ou "Cozinha" (número só quando múltiplo)
    - imageIndices: índices das fotos deste ambiente
    - resumo: 1 frase interna (opcional)
    - estrutura: itens estruturais visíveis (array de {tipo, material?, detalhe?})
    - instalacoes: instalações fixas visíveis (array de {tipo, material?, detalhe?})
    - moveis: mobiliário visível (array de {tipo, material?, detalhe?})

    #{InventoryVocab.prompt_block()}

  #{Step.pt_rules()}

    Formato JSON minificado em uma linha:
    {"resumoGeral":"...","cards":[...],"semCategoria":{"imageIndices":[]}}
    """
  end

  @impl true
  def normalize(raw, bundle) do
    if Map.get(raw, "skipped") == true do
      %{
        "resumoGeral" => "",
        "cards" => [],
        "skipped" => true,
        "reason" => Step.ensure_string(Map.get(raw, "reason"), "skipped")
      }
    else
      catalog = Map.get(bundle, :catalog_count, 0)

      {cards, sem_extra} =
        raw
        |> Map.get("cards", [])
        |> Step.ensure_list()
        |> Enum.filter(&is_map/1)
        |> Enum.reduce({[], []}, fn card, {acc_cards, acc_sem} ->
          case normalize_card(card, catalog) do
            {:ok, normalized} ->
              {[normalized | acc_cards], acc_sem}

            {:sem_categoria, indices} ->
              {acc_cards, acc_sem ++ indices}
          end
        end)

      cards =
        cards
        |> Enum.reverse()
        |> assign_ordinals()
        |> Enum.map(&Map.put(&1, "xrayStatus", "waiting"))

      sem_from_raw =
        case Map.get(raw, "semCategoria") do
          %{"imageIndices" => indices} -> clamp_indices(indices, catalog)
          _ -> []
        end

      sem_indices = Enum.uniq(sem_from_raw ++ sem_extra)

      result = %{
        "resumoGeral" => Step.ensure_string(Map.get(raw, "resumoGeral")),
        "cards" => cards
      }

      if sem_indices != [] do
        Map.put(result, "semCategoria", %{"imageIndices" => sem_indices})
      else
        result
      end
    end
  end

  defp normalize_card(card, catalog) do
    case normalize_categoria(Map.get(card, "categoria")) do
      {:ok, categoria} ->
        id = Step.ensure_string(Map.get(card, "id"), slug_fallback(categoria, card))
        indices = clamp_indices(Map.get(card, "imageIndices"), catalog)

        if indices == [] do
          {:sem_categoria, []}
        else
          {:ok,
           %{
             "id" => id,
             "categoria" => categoria,
             "ordinal" => Step.int_or_nil(Map.get(card, "ordinal")),
             "rotulo" => Step.ensure_string(Map.get(card, "rotulo")),
             "imageIndices" => indices,
             "resumo" => Step.string_or_nil(Map.get(card, "resumo")),
             "estrutura" => normalize_items(Map.get(card, "estrutura")),
             "instalacoes" => normalize_items(Map.get(card, "instalacoes")),
             "moveis" => normalize_items(Map.get(card, "moveis")),
             "pontosAtencao" => []
           }
           |> Enum.reject(fn {_k, v} -> is_nil(v) end)
           |> Map.new()}
        end

      :unknown ->
        indices = clamp_indices(Map.get(card, "imageIndices"), catalog)
        {:sem_categoria, indices}
    end
  end

  defp normalize_categoria(cat) when cat in @categories, do: {:ok, cat}

  defp normalize_categoria(cat) when is_binary(cat) do
    key =
      cat
      |> String.trim()
      |> String.downcase()
      |> strip_accents()
      |> String.replace(~r/[^a-z0-9]/, "")

    cond do
      Map.has_key?(@canonical_by_slug, key) ->
        {:ok, Map.get(@canonical_by_slug, key)}

      Map.has_key?(@category_aliases, key) ->
        {:ok, Map.get(@category_aliases, key)}

      true ->
        :unknown
    end
  end

  defp normalize_categoria(_), do: :unknown

  defp strip_accents(str) do
    str
    |> String.normalize(:nfd)
    |> String.to_charlist()
    |> Enum.reject(fn
      c when c >= 0x0300 and c <= 0x036F -> true
      _ -> false
    end)
    |> List.to_string()
  end

  defp normalize_items(items) do
    Step.ensure_list(items)
    |> Enum.filter(&is_map/1)
    |> Enum.map(fn item ->
      tipo =
        case Map.get(item, "tipo") || Map.get(item, "rotulo") do
          t when is_binary(t) -> Step.ensure_string(t, "item")
          _ -> "item"
        end

      %{
        "tipo" => tipo,
        "material" => Step.string_or_nil(Map.get(item, "material")),
        "detalhe" => Step.string_or_nil(Map.get(item, "detalhe"))
      }
      |> Enum.reject(fn {_k, v} -> is_nil(v) end)
      |> Map.new()
    end)
  end

  defp assign_ordinals(cards) do
    cards
    |> Enum.group_by(&Map.get(&1, "categoria"))
    |> Enum.flat_map(fn {categoria, group} ->
      if categoria in @multi_categories and length(group) > 1 do
        group
        |> Enum.sort_by(&length(Map.get(&1, "imageIndices", [])))
        |> Enum.reverse()
        |> Enum.with_index(1)
        |> Enum.map(fn {card, ord} ->
          base_label = category_label(categoria)

          card
          |> Map.put("ordinal", ord)
          |> Map.put("rotulo", "#{base_label} #{ord}")
          |> Map.put("id", Map.get(card, "id") || "#{categoria}-#{ord}")
        end)
      else
        Enum.map(group, fn card ->
          base = category_label(categoria)

          card
          |> Map.delete("ordinal")
          |> Map.update("rotulo", base, fn r ->
            if Step.string_or_nil(r), do: r, else: base
          end)
        end)
      end
    end)
  end

  defp category_label("areaServico"), do: "Área de serviço"
  defp category_label("areaExterna"), do: "Área externa"
  defp category_label("areaComum"), do: "Área comum"
  defp category_label("escritorio"), do: "Escritório"
  defp category_label("deposito"), do: "Depósito"
  defp category_label("sala"), do: "Sala"
  defp category_label("cozinha"), do: "Cozinha"
  defp category_label("quarto"), do: "Quarto"
  defp category_label("banheiro"), do: "Banheiro"
  defp category_label("varanda"), do: "Varanda"
  defp category_label("garagem"), do: "Garagem"
  defp category_label("fachada"), do: "Fachada"
  defp category_label("circulacao"), do: "Circulação"
  defp category_label("closet"), do: "Closet"
  defp category_label("vista"), do: "Vista"
  defp category_label(_), do: "Ambiente"

  defp clamp_indices(indices, catalog) when is_list(indices) do
    indices
    |> Enum.map(&Step.int_or_nil/1)
    |> Enum.reject(&is_nil/1)
    |> Enum.uniq()
    |> Enum.filter(fn idx -> catalog == 0 or (idx >= 0 and idx < catalog) end)
  end

  defp clamp_indices(_, _), do: []

  defp slug_fallback(categoria, card) do
    ord = Step.int_or_nil(Map.get(card, "ordinal"))
    if ord, do: "#{categoria}-#{ord}", else: categoria
  end
end
