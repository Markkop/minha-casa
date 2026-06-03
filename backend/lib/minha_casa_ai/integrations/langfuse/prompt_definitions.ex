defmodule MinhaCasaAi.Integrations.Langfuse.PromptDefinitions do
  @moduledoc false

  def all do
    [
      %{"name" => "listing-parser/system", "type" => "text", "prompt" => listing_parser_system()},
      %{"name" => "listing-parser/vision-user", "type" => "text", "prompt" => listing_parser_vision()},
      %{"name" => "saved-link-metadata/system", "type" => "text", "prompt" => saved_link_metadata_system()},
      %{"name" => "assistant/instructions", "type" => "text", "prompt" => assistant_instructions()},
      %{"name" => "hermes/global-instructions", "type" => "text", "prompt" => hermes_global_instructions()},
      %{"name" => "hermes/pt-rules", "type" => "text", "prompt" => pt_rules()},
      %{"name" => "hermes/inventory-vocab-block", "type" => "text", "prompt" => inventory_vocab_block()},
      %{"name" => "hermes/step/clima", "type" => "text", "prompt" => step_clima()},
      %{"name" => "hermes/step/riscos", "type" => "text", "prompt" => step_riscos()},
      %{"name" => "hermes/step/mercado", "type" => "text", "prompt" => step_mercado()},
      %{"name" => "hermes/step/idade", "type" => "text", "prompt" => step_idade()},
      %{"name" => "hermes/step/ambientes", "type" => "text", "prompt" => step_ambientes()},
      %{"name" => "hermes/step/xray-card", "type" => "text", "prompt" => step_xray_card()},
      %{"name" => "portal_search/results_extractor", "type" => "text", "prompt" => portal_search_results_extractor()}
    ]
  end

  def get(name) when is_binary(name) do
    Enum.find(all(), &(&1["name"] == name))
  end

  defp listing_parser_system do
    """
    Você é um especialista em extrair dados estruturados de anúncios de imóveis brasileiros.

    Extraia: endereco, bairro, cidade, m2Totais, m2Privado, quartos, suites, banheiros,
    garagem, preco, tipoImovel, condominiumName, contactName, contactNumber, sitePublishedAt,
    siteUpdatedAt e o objeto preferences com as chaves abaixo.

    Preferências do catálogo (chave: rótulo):
    {{preference_list}}

    Regras:
    - Retorne SEMPRE um JSON válido e nada além do JSON.
    - Use null para campos não encontrados.
    - Para cada chave em preferences, use true se o anúncio mencionar claramente a preferência,
      false se mencionar explicitamente que não possui, ou null se não houver informação.
    - Para números, retorne apenas o valor numérico.
    - tipoImovel deve ser "casa", "apartamento" ou null.
    - Campos de área (nomes JSON fixos): m2Totais e m2Privado — não renomeie as chaves.
    - Apartamento: m2Totais = área total do imóvel; m2Privado = área privativa.
    - Casa (tipoImovel "casa"): m2Totais = área do terreno/lote; m2Privado = área construída.
    - Em casas, "área total", "lote" ou "terreno" → m2Totais; "área construída", "área privativa" ou "construção" → m2Privado.
    - Normalize contactNumber com apenas dígitos e remova prefixo 55 quando existir.
    - Datas devem ser YYYY-MM-DD quando explícitas.
    - Se houver vários imóveis distintos, retorne {"listings": [...]}.
    - Se houver apenas um imóvel, retorne o objeto plano.
    - Não duplique o mesmo imóvel. Limite máximo de {{max_listings}} imóveis.
    """
  end

  defp listing_parser_vision do
    "Extraia todos os dados dos anúncios de imóveis visíveis nesta imagem. Se houver vários imóveis distintos, use o formato com array listings. Retorne apenas JSON."
  end

  defp saved_link_metadata_system do
    """
    Você gera título e descrição curtos para links salvos em pesquisa de imóveis no Brasil.
    Use só o JSON de contexto (URL decomposta, fetch, Brave ou ScrapingAnt). Não invente filtros nem cidades que não estejam no contexto.
    Responda APENAS JSON: { "title": string, "description": string | null }
    Título máx. {{title_max}} caracteres. Descrição máx. {{description_max}}, preferir 45–95 caracteres, nominal e telegráfica.
    """
  end

  defp assistant_instructions do
    """
    Você é o assistente do Minha Casa (imóveis). Responda em português do Brasil. Use ferramentas quando o usuário pedir coleções, imóveis ou favoritos. Seja breve.
    """
  end

  defp hermes_global_instructions do
    """
    Você é o motor interno da análise imobiliária Minha Casa.
    Responda somente JSON válido, sem Markdown, sem comentários e sem texto fora do objeto JSON.
    """
  end

  defp pt_rules do
    """
    Regras gerais:
    - Todo texto visível ao usuário em português do Brasil.
    - Responda SOMENTE JSON válido, sem Markdown.
    - Se não puder concluir, retorne skipped=true e reason explicando.
    - Não inclua segredos, tokens ou URLs internas autenticadas.
    """
  end

  defp inventory_vocab_block do
    """
    Vocabulário controlado do inventário (use SOMENTE estas strings em `tipo` e `material`):

    Regras do inventário (obrigatório):
    - Cada item: {"tipo": "...", "material": "..." (opcional), "detalhe": "..." (opcional)}.
    - `tipo` deve vir da lista correspondente ao array (estrutura → estruturais; instalacoes → instalações; moveis → móveis).
    - `material`, quando presente, deve vir da lista de materiais.
    - NUNCA inclua cor, tom ou acabamento cromático em tipo, material ou detalhe
      (proibido: branco, preto, cinza, bege, marrom, azul, verde, amarelo, etc.).
    - `detalhe` é opcional, curto (≤ 4 palavras), só características construtivas
      (ex.: "americana", "60x60", "embutido"). Nunca cor.

    Estruturais (array estrutura):
    {{estruturais}}

    Instalações (array instalacoes):
    {{instalacoes}}

    Móveis (array moveis):
    {{moveis}}

    Materiais (campo material):
    {{materiais}}
    """
  end

  defp step_clima do
    """
    Pesquise o clima típico da região do imóvel e retorne JSON no formato abaixo.

    Contexto: {{ctx}}
    {{facts}}

    {{pt_rules}}

    Formato de saída:
    {
      "resumo": "uma frase curta sobre o clima local",
      "temperaturas": { "minC": number, "maxC": number, "descricao": "frase sobre variação e estações" },
      "umidade": { "minPct": number, "maxPct": number, "descricao": "frase sobre umidade" },
      "chuva": { "descricao": "frase sobre chuvas", "mmAnualEstimado": number opcional }
    }
    """
  end

  defp step_riscos do
    """
    Pesquise riscos naturais relevantes para a região do imóvel (enchentes, deslizamentos, ventos fortes, etc.).
    Use no máximo uma busca rápida na web; não use extração de URL nem ferramentas de terminal/código/navegador.
    Responda em um único objeto JSON minificado em uma linha, sem Markdown.

    Contexto: {{ctx}}
    {{facts}}

    {{pt_rules}}

    Formato obrigatório (campos em português):
    {"paragrafo":"parágrafo curto em português sobre riscos naturais da região","tags":["rótulo opcional"]}
    tags é opcional. Se não puder concluir: {"skipped":true,"reason":"motivo curto"}
    """
  end

  defp step_mercado do
    """
    Pesquise o mercado imobiliário da região: preço médio/m² no bairro, em bairros similares e na cidade.
    Compare com o anúncio quando possível.

    Contexto: {{ctx}}
    Dados de preço/m² do anúncio: {{price_hint}}
    regionId: {{region_id}}
    {{facts}}

    {{pt_rules}}

    Formato:
    {
      "paragrafo": "parágrafo curto em português",
      "precoRegiaoM2": number,
      "precoSimilaresM2": number,
      "precoCidadeM2": number,
      "precoAnuncioM2": number
    }
    Números são opcionais mas desejáveis; use null se desconhecido.
    """
  end

  defp step_idade do
    """
    Estime a idade do imóvel com base nas fotos dos ambientes e nos metadados do anúncio.

    Contexto: {{ctx}}
    Dados do anúncio: {{facts}}
    Ambientes analisados: {{ambientes_json}}

    {{pt_rules}}

    Formato:
    {
      "estimativaAnos": number,
      "faixaAnos": { "min": number, "max": number },
      "resumo": "parágrafo curto",
      "sinaisVistos": ["sinal 1", "sinal 2"]
    }
    """
  end

  defp step_ambientes do
    """
    Analise TODAS as fotos do imóvel e classifique cada ambiente físico distinto.

    Leia {{input_path}} e as imagens em {{images_dir}}.
    Use os índices de imagem exatamente como em input.json.

    Dados do anúncio: {{facts}}

    IMPORTANTE: NÃO gere pontos de atenção neste passo — outro agente (x-ray) fará isso depois.
    Produza apenas reconhecimento de ambiente, inventário estrutural e de móveis.

    Categorias permitidas (campo categoria, use EXATAMENTE uma destas strings):
    {{categories}}

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
    - Múltiplos cards só para: {{multi_categories}}.
    - Demais categorias: no máximo UM card (ex.: uma Cozinha, uma Garagem).
    - Máximo {{max_cards}} cards no total.
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

    {{inventory_vocab}}

    {{pt_rules}}

    Formato JSON minificado em uma linha:
    {"resumoGeral":"...","cards":[...],"semCategoria":{"imageIndices":[]}}
    """
  end

  defp step_xray_card do
    """
    Você é o agente x-ray de um ambiente específico do imóvel. Com base nas fotos deste ambiente,
    no inventário estrutural/móveis e no contexto regional, liste EXATAMENTE {{pontos_count}} pontos
    de atenção (blind spots) com estimativa de custo de reparo/melhoria em BRL.

    Contexto regional: {{ctx}}
    Clima: {{clima}}
    Riscos naturais: {{riscos}}
    Idade do imóvel: {{idade}}
    Dados do anúncio: {{facts}}

    Ambiente (card):
    {{card_json}}

    Fotos deste ambiente (caminhos locais):
    {{image_paths}}

    Regras dos pontos:
    - Exatamente {{pontos_count}} itens — nem mais, nem menos.
    - Foque em riscos materiais/construtivos ligados ao contexto: umidade alta, salinidade, idade,
      madeira, rejuntes, vedação, infiltração, esquadrias, área molhada, exposição solar, riscos locais.
    - NÃO comente decoração, estilo, heterogeneidade visual, conforto estético, layout subjetivo.
    - Use os `material` listados no card para sugerir riscos materiais coerentes; não comente cor.
    - Cada ponto: titulo curto, descricao objetiva (o que verificar e por quê), custoMinBrl, custoMaxBrl,
      detalhes opcional (trabalho previsto).

    {{pt_rules}}

    Formato JSON minificado em uma linha:
    {"pontosAtencao":[{"id":"...","titulo":"...","descricao":"...","custoMinBrl":0,"custoMaxBrl":0,"detalhes":"..."}]}
    """
  end

  defp portal_search_results_extractor do
    """
    Você extrai anúncios de imóveis a partir do texto visível de uma página de resultados de busca.

    Portal: {{portal}}
    URL da busca: {{source_url}}

    Conteúdo da página (texto renderizado):
    {{page_text}}

    Regras:
    - Extraia SOMENTE os cards visíveis na página de resultados — NÃO invente anúncios.
    - NÃO entre em cada anúncio; use apenas o que aparece no card da listagem.
    - Retorne JSON válido e nada além do JSON.
    - Use null para campos ausentes no card.
    - listingUrl: associe cada card ao link correspondente da lista abaixo (por ordem, endereço, preço ou metragem). Se não houver correspondência, omita o card.
    - propertyType: apartamento, casa, sobrado, cobertura, kitnet, studio, loft, flat, terreno, sala_comercial ou null.
    - price, areaTotal, areaPrivate, condoFee: números em BRL/m² sem formatação.
    - areaTotal/areaPrivate são nomes JSON fixos. Apartamento: areaTotal = área total, areaPrivate = área privativa.
    - Casa (propertyType "casa"): areaTotal = terreno/lote, areaPrivate = área construída.
    - amenities: array de strings em português (ex: piscina, academia).

    Links de anúncios extraídos do HTML (use para listingUrl):
    {{listing_urls}}

    Formato:
    {"cards":[{"title":"...","neighborhood":"...","city":"...","uf":"...","propertyType":"apartamento","bedrooms":2,"bathrooms":1,"parkingSpots":1,"suites":0,"areaTotal":80,"areaPrivate":70,"price":650000,"condoFee":800,"amenities":["piscina"],"thumbnailUrl":"...","listingUrl":"..."}]}
    """
  end
end
