defmodule MinhaCasaAi.PropertyAnalyses.ViewingTips do
  @moduledoc false

  alias MinhaCasaAi.Config

  @system_prompt """
  Você prepara um comprador para visitar um imóvel no Brasil, com foco técnico (estrutura e acabamento).

  Use o catálogo de fotos (photoCatalog) com índice numérico `index` e as observações de cada foto.
  NÃO repita perguntas genéricas se as fotos já trouxeram pistas específicas — aprofunde (ex.: tipo de madeira
  do deck → perguntar tratamento, data da instalação, última manutenção).

  Cada item deve ter:
  - area, question, why, expectedAnswers (1-3 respostas plausíveis), priority (high|medium|low)
  - imageIndices: array com 1 a 3 números inteiros do campo `index` do photoCatalog que melhor ilustram
    o que motivou a pergunta (mesmo cômodo, material ou sinal visível). Se nenhuma foto for relevante, use [].

  Evite julgamentos vagos; motive com base no que foi visto ou no risco técnico.
  Priorize: estrutura/movimentação, umidade/impermeabilização, sistemas de madeira externa, cobertura,
  pisos e revestimentos, esquadrias, instalações em áreas molhadas.

  Responda APENAS JSON em português: { "questions": [ ... ] } com 10 a 18 itens.
  """

  def synthesize(context) when is_map(context) do
    photos = Map.get(context, "photos") || %{}
    valid_indices = valid_photo_indices(photos)

    questions =
      if Config.configured?(:openai) do
        case chat(context) do
          {:ok, %{"questions" => questions}} when is_list(questions) ->
            normalize_questions(questions)

          _ ->
            fallback_questions()
        end
      else
        fallback_questions()
      end

    questions =
      questions
      |> Enum.map(&attach_image_indices(&1, photos, valid_indices))

    %{"questions" => questions}
  end

  defp chat(context) do
    api_key = Config.openai_api_key()
    user = Jason.encode!(enrich_context(context))

    body = %{
      model: "gpt-4o-mini",
      messages: [
        %{role: "system", content: @system_prompt},
        %{role: "user", content: user}
      ],
      temperature: 0.35,
      max_tokens: 3_500,
      response_format: %{type: "json_object"}
    }

    url = "https://api.openai.com/v1/chat/completions"
    headers = [{"content-type", "application/json"}, {"authorization", "Bearer #{api_key}"}]

    case :hackney.post(url, headers, Jason.encode!(body),
           with_body: true,
           recv_timeout: 55_000,
           pool: :default
         ) do
      {:ok, status, _, resp} when status in 200..299 and is_binary(resp) ->
        with {:ok, %{"choices" => [%{"message" => %{"content" => content}} | _]}} <- Jason.decode(resp),
             {:ok, map} <- Jason.decode(content) do
          {:ok, map}
        else
          _ -> {:error, :empty}
        end

      _ ->
        {:error, :openai}
    end
  end

  defp enrich_context(context) do
    photos = Map.get(context, "photos") || %{}
    Map.put(context, "photoCatalog", build_photo_catalog(photos))
  end

  defp build_photo_catalog(%{"images" => images}) when is_list(images) do
    images
    |> Enum.filter(&analyzable_image?/1)
    |> Enum.map(fn img ->
      obs = Map.get(img, "observations") || %{}

      %{
        "index" => Map.get(img, "index"),
        "scene" => Map.get(obs, "scene"),
        "structure" => Map.get(obs, "structure"),
        "floor" => Map.get(obs, "floor"),
        "walls" => Map.get(obs, "walls"),
        "ceiling" => Map.get(obs, "ceiling"),
        "baseboard" => Map.get(obs, "baseboard"),
        "wetArea" => Map.get(obs, "wetArea"),
        "materialsSpotted" => Map.get(obs, "materialsSpotted", []),
        "signalsToInvestigate" => Map.get(obs, "signalsToInvestigate", [])
      }
    end)
  end

  defp build_photo_catalog(_), do: []

  defp analyzable_image?(img) when is_map(img) do
    is_nil(Map.get(img, "error")) and is_map(Map.get(img, "observations"))
  end

  defp analyzable_image?(_), do: false

  defp valid_photo_indices(%{"images" => images}) when is_list(images) do
    images
    |> Enum.filter(&analyzable_image?/1)
    |> Enum.map(&Map.get(&1, "index"))
    |> Enum.filter(&is_integer/1)
    |> MapSet.new()
  end

  defp valid_photo_indices(_), do: MapSet.new()

  defp attach_image_indices(question, photos, valid_indices) do
    indices =
      question
      |> Map.get("imageIndices", [])
      |> normalize_image_indices(valid_indices)

    indices =
      case indices do
        [] -> guess_image_indices(question, Map.get(photos, "images", []), valid_indices)
        _ -> indices
      end

    Map.put(question, "imageIndices", indices)
  end

  defp normalize_image_indices(indices, valid_indices) when is_list(indices) do
    indices
    |> Enum.map(&coerce_index/1)
    |> Enum.filter(&is_integer/1)
    |> Enum.filter(&MapSet.member?(valid_indices, &1))
    |> Enum.uniq()
    |> Enum.take(3)
  end

  defp normalize_image_indices(_, _), do: []

  defp coerce_index(i) when is_integer(i) and i >= 0, do: i

  defp coerce_index(i) when is_float(i) and i >= 0, do: trunc(i)

  defp coerce_index(s) when is_binary(s) do
    case Integer.parse(String.trim(s)) do
      {n, _} when n >= 0 -> n
      _ -> nil
    end
  end

  defp coerce_index(_), do: nil

  defp guess_image_indices(question, images, valid_indices) when is_list(images) do
    text =
      [
        Map.get(question, "question", ""),
        Map.get(question, "why", ""),
        Map.get(question, "area", "")
      ]
      |> Enum.join(" ")
      |> String.downcase()

    images
    |> Enum.filter(&analyzable_image?/1)
    |> Enum.map(fn img ->
      idx = Map.get(img, "index")
      obs = Map.get(img, "observations") || %{}
      {idx, relevance_score(text, obs)}
    end)
    |> Enum.filter(fn {idx, score} -> is_integer(idx) and score > 0 end)
    |> Enum.sort_by(fn {_, score} -> score end, :desc)
    |> Enum.map(fn {idx, _} -> idx end)
    |> Enum.filter(&MapSet.member?(valid_indices, &1))
    |> Enum.uniq()
    |> case do
      [] -> default_image_indices(images, valid_indices)
      picked -> Enum.take(picked, 3)
    end
  end

  defp guess_image_indices(_question, _images, valid_indices) do
    valid_indices |> MapSet.to_list() |> Enum.sort() |> Enum.take(2)
  end

  defp default_image_indices(images, valid_indices) do
    images
    |> Enum.filter(&analyzable_image?/1)
    |> Enum.map(&Map.get(&1, "index"))
    |> Enum.filter(&MapSet.member?(valid_indices, &1))
    |> Enum.uniq()
    |> Enum.take(2)
  end

  defp relevance_score(text, obs) when is_binary(text) and is_map(obs) do
    tokens =
      text
      |> String.replace(~r/[^\p{L}\p{N}\s]/u, " ")
      |> String.split(~r/\s+/, trim: true)
      |> Enum.filter(&(String.length(&1) >= 3))

    corpus =
      [
        Map.get(obs, "scene"),
        Map.get(obs, "structure"),
        Map.get(obs, "floor"),
        Map.get(obs, "walls"),
        Map.get(obs, "ceiling"),
        Map.get(obs, "baseboard"),
        Map.get(obs, "wetArea"),
        Map.get(obs, "openings")
      ]
      |> Enum.flat_map(fn
        s when is_binary(s) -> [String.downcase(s)]
        _ -> []
      end)
      |> Kernel.++(string_list(Map.get(obs, "materialsSpotted")))
      |> Kernel.++(string_list(Map.get(obs, "signalsToInvestigate")))
      |> Enum.join(" ")

    area_bonus =
      case Map.get(obs, "scene") do
        s when is_binary(s) -> scene_area_bonus(text, String.downcase(s))
        _ -> 0
      end

    overlap =
      Enum.count(tokens, fn token ->
        String.contains?(corpus, token) or String.contains?(text, token)
      end)

    overlap * 2 + area_bonus
  end

  defp relevance_score(_, _), do: 0

  defp scene_area_bonus(text, scene) do
    pairs = [
      {"cozinha", ["cozinha", "pia", "armário", "bancada"]},
      {"sala", ["sala", "estar", "living"]},
      {"banheiro", ["banheiro", "box", "chuveiro", "lavabo"]},
      {"varanda", ["varanda", "sacada", "deck", "madeira externa"]},
      {"fachada", ["fachada", "frente", "muro", "telhado", "cobertura"]},
      {"quarto", ["quarto", "dormitório", "suíte"]},
      {"garagem", ["garagem", "vaga"]},
      {"área externa", ["quintal", "jardim", "área externa", "piscina"]}
    ]

    Enum.reduce(pairs, 0, fn {scene_key, keywords}, acc ->
      if scene == scene_key and Enum.any?(keywords, &String.contains?(text, &1)),
        do: acc + 4,
        else: acc
    end)
  end

  defp string_list(list) when is_list(list) do
    list
    |> Enum.map(fn
      s when is_binary(s) -> String.downcase(s)
      _ -> ""
    end)
    |> Enum.filter(&(&1 != ""))
  end

  defp string_list(_), do: []

  defp normalize_questions(questions) do
    questions
    |> Enum.filter(&is_map/1)
    |> Enum.map(fn q ->
      %{
        "area" => safe_string(Map.get(q, "area"), "Geral"),
        "question" => safe_string(Map.get(q, "question"), ""),
        "why" => safe_string(Map.get(q, "why"), ""),
        "expectedAnswers" => normalize_answers(Map.get(q, "expectedAnswers", [])),
        "priority" => normalize_priority(Map.get(q, "priority", "medium")),
        "imageIndices" => Map.get(q, "imageIndices", [])
      }
    end)
    |> Enum.filter(&(Map.get(&1, "question") != ""))
    |> Enum.take(18)
  end

  defp normalize_answers(list) when is_list(list) do
    list |> Enum.map(&safe_string(&1, "")) |> Enum.filter(&(&1 != "")) |> Enum.take(3)
  end

  defp normalize_answers(_), do: []

  defp safe_string(value, default) when is_binary(value) do
    trimmed = String.trim(value)
    if trimmed == "", do: default, else: trimmed
  end

  defp safe_string(value, _default) when is_number(value) or is_atom(value), do: to_string(value)
  defp safe_string(_, default), do: default

  defp normalize_priority(p) when p in ["high", "medium", "low"], do: p
  defp normalize_priority("alta"), do: "high"
  defp normalize_priority("baixa"), do: "low"
  defp normalize_priority(_), do: "medium"

  defp fallback_questions do
    [
      %{
        "area" => "Estrutura",
        "question" => "Há rachaduras diagonais perto de portas e janelas?",
        "why" => "Podem indicar movimentação estrutural.",
        "expectedAnswers" => ["Não há rachaduras visíveis", "Rachaduras finas apenas na pintura"],
        "priority" => "high",
        "imageIndices" => []
      },
      %{
        "area" => "Piso",
        "question" => "O piso está nivelado em todos os cômodos?",
        "why" => "Desníveis podem indicar assentamento ou reforma mal feita.",
        "expectedAnswers" => ["Sim, sem desníveis perceptíveis", "Leve desnível em um cômodo apenas"],
        "priority" => "high",
        "imageIndices" => []
      }
    ]
  end
end
