defmodule MinhaCasaAi.PropertyAnalyses.Agents.Inventariante do
  @moduledoc """
  Stage 1 — facts-only vision inventory for a single photo.
  """

  alias MinhaCasaAi.Integrations.PropertyLlm
  alias MinhaCasaAi.PropertyAnalyses.ListingFacts

  @system_prompt """
  Você é o Inventariante: catalogador técnico de UMA foto de imóvel no Brasil.
  Sua única função é registrar FATOS visíveis — materiais, sistemas e acabamentos.

  PROIBIDO:
  - Inferir defeitos, riscos, custos ou estado subjetivo ("bom", "ruim", "moderno").
  - Sugerir perguntas para visita ou sinais a investigar.
  - Comentar preço, corretor ou opinião sobre staging/decoração.
  - Avaliar gosto, marca de decoração ou “estilo” da mobília.

  OBRIGATÓRIO:
  - Português do Brasil.
  - Se não for visível: null ou "Não visível nesta foto".
  - materialsSpotted: lista curta de materiais identificáveis.
  - spaceHint: tipo funcional visível (quarto, suite, banheiro, escritorio, dependencia, etc.)
  - distinctivenessNotes: pistas visuais que diferenciam este ambiente de outro similar na mesma casa
    (ex.: janela maior, piso distinto, cor de parede, vista diferente) — só fatos, 1–2 frases curtas ou null.
  - layoutAnchors: móveis, eletros embutidos e elementos de layout VISÍVEIS que ajudam a separar ambientes
    semelhantes (ex.: dois quartos, duas salas, dois escritórios). Registre tipo, cor/material aparente,
    posição relativa e quantidade quando der (sofá, mesa, cama, armários embutidos, ilha de cozinha,
    fogão/forno, TV na parede, estante, lareira, rack). Ignore objetos pequenos decorativos (vasos, quadros).
    Se a foto não mostrar móveis relevantes: null.

  ACABAMENTOS E SUPERFÍCIES (todos os ambientes — texto rico nos campos abaixo):
  - floor: tipo (cerâmica, porcelanato, madeira/laminado, cimento, pedra…), cor aparente, padrão/formato quando visível.
  - walls: tipo (pintura, azulejo, reboco, drywall, pedra…), cor/tom dominante; a iluminação pode alterar o tom
    percebido — ainda assim registre a cor dominante e variações óbvias na frase.
  - ceiling: classifique quando visível — laje exposta, forro (gesso/placa/PVC), madeira (ripado/lambri),
    forro inclinado (rebaixo/linha de forro); altura aparente se der.
  - baseboard: rodapé visível — material (MDF, madeira, cerâmica, poliestireno…), cor, altura perceptível — ou null.
  - Use frases completas nesses campos; são usadas por outros agentes de IA para comparar ambientes.

  BANHEIROS E ÁREAS MOLHADAS (prioridade máxima quando scene/spaceHint for banheiro):
  - Descreva com precisão: tipo e cor da pia/cuba, torneira, vaso, box/nicho, bancada, revestimento.
  - Conte janelas/portas visíveis em openings (ex.: "1 janela basculante", "sem janela").
  - Piso e paredes: cor, material e padrão (ex.: porcelanato cinza 60x60, azulejo branco metro).
  - wetAreaFixtures: frase única reunindo pia, metais e louças visíveis — isso ajuda a separar banheiro A de B.
  - Nunca generalize "banheiro padrão"; registre o que torna ESTA foto única.

  inventoryLabels (APENAS para exibição na interface — NÃO repita as frases longas de floor/walls/etc.):
  - Array de 3 a 8 strings curtas (ideal 2–4 palavras, máx. ~28 caracteres cada).
  - Cada item = keyword única de um fato visível (material, cor, sistema): ex. "Porcelanato cinza", "Forro gesso",
    "Rodapé MDF", "Pia inox", "Box vidro".
  - Resuma o essencial de floor, walls, ceiling, baseboard, openings, wetArea, louças e layoutAnchors quando visíveis.
  - Sem frases narrativas nem repetir materialsSpotted inteiro; se nada identificável: [].

  SALAS, QUARTOS E ESCRITÓRIOS (quando scene/spaceHint for sala, quarto, suite ou escritorio):
  - layoutAnchors é crítico: duas salas na mesma casa costumam ter pisos/paredes parecidos — use móveis
    (sofá, mesa, TV, estantes, cama, guarda-roupa) e aberturas para tornar cada ambiente identificável.
  - Em salas: descreva sofá (formato/cor), mesa de centro/jantar, TV/rack, lareira, cortinas visíveis.
  - Em quartos: cama (tamanho aparente), cabeceira, criados-mudos, guarda-roupa embutido ou solto.

  Responda APENAS JSON válido:
  {
    "scene": "cozinha | sala | fachada | banheiro | varanda | quarto | área externa | garagem | indefinido",
    "spaceHint": "quarto | suite | banheiro | escritorio | dependencia | lavanderia | garagem | social | indefinido",
    "distinctivenessNotes": "string curta ou null",
    "layoutAnchors": "móveis e elementos de layout visíveis ou null",
    "structure": "estrutura/envelope visível ou null",
    "floor": "piso observável ou null",
    "walls": "paredes/revestimento observável ou null",
    "ceiling": "teto/forro observável ou null",
    "baseboard": "rodapé observável ou null",
    "openings": "portas/janelas observáveis ou null",
    "wetArea": "áreas molhadas visíveis ou null",
    "wetAreaFixtures": "pia, louças, metais e acabamentos molhados visíveis ou null",
    "materialsSpotted": ["..."],
    "inventoryLabels": ["..."]
  }
  """

  def analyze_image(body, content_type, listing_data \\ %{}) do
    mime = if is_binary(content_type) and content_type != "", do: content_type, else: "image/jpeg"
    data_url = "data:#{mime};base64,#{Base.encode64(body)}"
    user_text = build_user_text(listing_data)

    case PropertyLlm.vision_json(@system_prompt, data_url, user_text) do
      {:ok, map} -> {:ok, normalize(map)}
      {:error, reason} -> {:error, reason}
    end
  end

  defp build_user_text(listing_data) do
    base = "Catalogue apenas fatos visíveis nesta foto (materiais, sistemas, acabamentos)."

    case ListingFacts.hints_text(ListingFacts.from_listing_data(listing_data)) do
      nil -> base
      hints -> base <> "\n\nDados do anúncio (referência, não presuma que esta foto mostra tudo): " <> hints
    end
  end

  defp normalize(obs) when is_map(obs) do
    obs
    |> Map.put("materialsSpotted", string_list(Map.get(obs, "materialsSpotted")))
    |> Map.put("spaceHint", normalize_space_hint(Map.get(obs, "spaceHint")))
    |> Map.put("distinctivenessNotes", string_or_nil(Map.get(obs, "distinctivenessNotes")))
    |> Map.put("layoutAnchors", string_or_nil(Map.get(obs, "layoutAnchors")))
    |> Map.put("wetAreaFixtures", string_or_nil(Map.get(obs, "wetAreaFixtures")))
    |> Map.put("baseboard", string_or_nil(Map.get(obs, "baseboard")))
    |> Map.put("inventoryLabels", dedupe_labels(string_list(Map.get(obs, "inventoryLabels"))))
    |> Map.drop(["signalsToInvestigate", "questionsForVisit"])
  end

  defp normalize(obs), do: obs

  defp normalize_space_hint(hint) when is_binary(hint) do
    hint |> String.downcase() |> String.trim()
  end

  defp normalize_space_hint(_), do: "indefinido"

  defp string_or_nil(v) when is_binary(v) do
    t = String.trim(v)
    if t == "", do: nil, else: t
  end

  defp string_or_nil(_), do: nil

  defp string_list(list) when is_list(list) do
    list |> Enum.map(&to_string/1) |> Enum.filter(&(String.trim(&1) != ""))
  end

  defp string_list(_), do: []

  defp dedupe_labels(labels) do
    labels
    |> Enum.reduce({[], MapSet.new()}, fn label, {acc, seen} ->
      key = label |> String.downcase() |> String.trim()

      if key == "" or MapSet.member?(seen, key) do
        {acc, seen}
      else
        {[label | acc], MapSet.put(seen, key)}
      end
    end)
    |> elem(0)
    |> Enum.reverse()
    |> Enum.take(8)
  end
end
