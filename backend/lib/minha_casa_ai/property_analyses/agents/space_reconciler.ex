defmodule MinhaCasaAi.PropertyAnalyses.Agents.SpaceReconciler do
  @moduledoc """
  Post-cluster agent: reconciles provisional photo spaces with listing metadata.
  Runs before risk X-ray so a single risk pass uses final display spaces.
  """

  alias MinhaCasaAi.Integrations.PropertyLlm
  alias MinhaCasaAi.PropertyAnalyses.{ListingFacts, SpaceSlug}

  @system_prompt """
  Você é o Reconciliador de Ambientes: após inventário fotográfico e agrupamento provisório,
  compare o que as fotos mostram com o anúncio e produza a lista FINAL de ambientes para análise de riscos.

  Você recebe:
  - Dados do anúncio (quartos, suítes, banheiros, etc.) — contexto, não verdade absoluta
  - Espaços provisórios com fotos e inventário factual detalhado por ambiente
  - Contexto local opcional

  TAREFAS:
  1. Decida quais espaços provisórios são o MESMO lugar físico (fundir) ou ambientes distintos (manter separados).
     Use piso, paredes, teto, esquadrias, louças (banheiros) e layoutAnchors/móveis visíveis — duas salas ou
     quartos com acabamento parecido mas móveis ou aberturas diferentes devem permanecer separados (sala-1 vs sala-2).
  2. Compare anúncio vs evidência fotográfica com julgamento FLEXÍVEL:
     - Ex.: anúncio diz 4 quartos, fotos mostram 3 quartos + 2 escritórios → explique em reflections/missing/extra
     - NÃO force regra fixa "suíte = quarto" nem "suíte = banheiro": interprete pelo inventário
       (suíte pode ser dormitório com banheiro integrado, ou banheiro de quarto, etc.)
  3. Emita displaySpaces: SOMENTE ambientes com imageIndices não vazios E inventário útil nas fotos.
     Nunca inclua cartão vazio (sem fotos ou sem descrição factual).
  4. Pode renomear labels, reassignar imageIndices entre spaceIds, fundir ou dividir spaceIds.
  5. spaceActions documenta fusões/divisões/ocultações para auditoria (opcional).
  6. NÃO liste riscos nem custos — apenas mapeamento e reconciliação.

  matchStatus:
  - "match" — coerente
  - "partial_mismatch" — diferença explicável
  - "insufficient_photos" — poucas fotos para concluir

  Responda APENAS JSON em português:
  {
    "displaySpaces": [
      {
        "spaceId": "quarto-1",
        "label": "Quarto 1",
        "scene": "quarto",
        "imageIndices": [0, 3],
        "listingRole": "dormitorio",
        "visible": true
      }
    ],
    "reconciliation": {
      "listingSummary": "...",
      "detectedSummary": "...",
      "matchStatus": "match | partial_mismatch | insufficient_photos",
      "reflections": ["..."],
      "missing": [{ "type": "quarto", "label": "Quarto 4", "note": "..." }],
      "extra": [{ "type": "escritorio", "label": "...", "note": "..." }],
      "photoCoverage": "..."
    },
    "spaceActions": [
      { "action": "merge | split | reassign_photos | hide", "fromSpaceId": "...", "toSpaceIds": ["..."], "imageIndices": [1, 2], "note": "..." }
    ]
  }
  """

  def reconcile(inventory, listing_data, space_audit, location_context \\ %{}) do
    spaces = Map.get(space_audit, "spaces") || []

    if spaces == [] do
      {:ok, empty_result(Map.get(space_audit, "reason") || "no_spaces")}
    else
      space_contexts = build_space_contexts(inventory, spaces)
      listing_facts = ListingFacts.from_listing_data(listing_data)

      payload =
        Jason.encode!(%{
          "listingFacts" => listing_facts,
          "provisionalSpaces" => space_contexts,
          "locationContext" => location_summary(location_context)
        })

      case PropertyLlm.chat_json(@system_prompt, payload, temperature: 0.3, max_tokens: 3_200) do
        {:ok, map} -> {:ok, normalize_result(map, space_contexts)}
        {:error, reason} -> {:error, reason}
      end
    end
  end

  def build_space_contexts(inventory, spaces) do
    images_by_index =
      (Map.get(inventory, "images") || [])
      |> Enum.filter(&analyzable?/1)
      |> Map.new(fn img -> {Map.get(img, "index"), img} end)

    Enum.map(spaces, fn space ->
      indices = Map.get(space, "imageIndices") || []

      inventory_lines =
        indices
        |> Enum.map(&Map.get(images_by_index, &1))
        |> Enum.reject(&is_nil/1)
        |> Enum.flat_map(&inventory_lines_from_image/1)
        |> Enum.uniq()
        |> Enum.take(40)

      %{
        "spaceId" => Map.get(space, "spaceId"),
        "label" => Map.get(space, "label"),
        "scene" => Map.get(space, "scene"),
        "listingRole" => Map.get(space, "listingRole"),
        "imageIndices" => indices,
        "inventorySummary" => inventory_lines,
        "photoCount" => length(indices)
      }
    end)
  end

  defp analyzable?(img) when is_map(img) do
    is_nil(Map.get(img, "error")) and is_map(Map.get(img, "observations"))
  end

  defp analyzable?(_), do: false

  defp inventory_lines_from_image(img) do
    obs = Map.get(img, "observations", %{})

    [
      Map.get(obs, "scene"),
      Map.get(obs, "spaceHint"),
      Map.get(obs, "structure"),
      Map.get(obs, "floor"),
      Map.get(obs, "walls"),
      Map.get(obs, "ceiling"),
      Map.get(obs, "baseboard"),
      Map.get(obs, "openings"),
      Map.get(obs, "wetArea"),
      Map.get(obs, "wetAreaFixtures"),
      Map.get(obs, "layoutAnchors"),
      Map.get(obs, "distinctivenessNotes")
    ]
    |> Enum.filter(&(is_binary(&1) and String.trim(&1) != ""))
    |> Kernel.++(Map.get(obs, "materialsSpotted", []))
  end

  defp location_summary(ctx) when is_map(ctx) do
    Map.get(ctx, "summary") || Map.get(ctx, "formattedAddress")
  end

  defp location_summary(_), do: nil

  defp normalize_result(map, space_contexts) do
    valid_indices =
      space_contexts
      |> Enum.flat_map(&Map.get(&1, "imageIndices", []))
      |> MapSet.new()

    display_spaces =
      (Map.get(map, "displaySpaces") || Map.get(map, "spaces") || [])
      |> Enum.filter(&is_map/1)
      |> Enum.map(&normalize_display_space(&1, valid_indices))
      |> Enum.reject(fn s -> (Map.get(s, "imageIndices") || []) == [] end)
      |> Enum.uniq_by(&Map.get(&1, "spaceId"))

    reconciliation = normalize_reconciliation(Map.get(map, "reconciliation") || %{})
    space_actions = normalize_space_actions(Map.get(map, "spaceActions") || [])

    %{
      "displaySpaces" => display_spaces,
      "spaces" => display_spaces,
      "reconciliation" => reconciliation,
      "spaceActions" => space_actions,
      "provisional" => false
    }
  end

  defp normalize_display_space(space, valid_indices) do
    space_id =
      (Map.get(space, "spaceId") || "indefinido")
      |> SpaceSlug.slug()

    indices =
      (Map.get(space, "imageIndices") || [])
      |> Enum.filter(&is_integer/1)
      |> Enum.filter(&MapSet.member?(valid_indices, &1))
      |> Enum.uniq()

    scene =
      (Map.get(space, "scene") || "indefinido")
      |> to_string()
      |> String.downcase()
      |> String.trim()

    label =
      case Map.get(space, "label") do
        s when is_binary(s) and s != "" -> String.trim(s)
        _ -> titleize_label(space_id)
      end

    visible = Map.get(space, "visible") != false and indices != []

    %{
      "spaceId" => space_id,
      "label" => label,
      "scene" => scene,
      "imageIndices" => indices,
      "listingRole" => normalize_listing_role(Map.get(space, "listingRole")),
      "visible" => visible
    }
  end

  defp normalize_listing_role(role) when is_binary(role) do
    role |> String.downcase() |> String.trim()
  end

  defp normalize_listing_role(_), do: "indefinido"

  defp normalize_reconciliation(rec) do
    %{
      "listingSummary" => string_or_nil(Map.get(rec, "listingSummary")),
      "detectedSummary" => string_or_nil(Map.get(rec, "detectedSummary")),
      "matchStatus" => normalize_match_status(Map.get(rec, "matchStatus")),
      "reflections" => string_list(Map.get(rec, "reflections"), 10),
      "missing" => normalize_gaps(Map.get(rec, "missing")),
      "extra" => normalize_gaps(Map.get(rec, "extra")),
      "photoCoverage" => string_or_nil(Map.get(rec, "photoCoverage"))
    }
  end

  defp normalize_match_status("match"), do: "match"
  defp normalize_match_status("insufficient_photos"), do: "insufficient_photos"
  defp normalize_match_status("pending"), do: "pending"
  defp normalize_match_status(_), do: "partial_mismatch"

  defp normalize_gaps(list) when is_list(list) do
    list
    |> Enum.filter(&is_map/1)
    |> Enum.take(8)
    |> Enum.map(fn item ->
      %{
        "type" => string_or_nil(Map.get(item, "type")) || "ambiente",
        "label" => string_or_nil(Map.get(item, "label")) || "Ambiente",
        "note" => string_or_nil(Map.get(item, "note"))
      }
    end)
  end

  defp normalize_gaps(_), do: []

  defp normalize_space_actions(list) when is_list(list) do
    list
    |> Enum.filter(&is_map/1)
    |> Enum.take(12)
    |> Enum.map(fn action ->
      %{
        "action" => string_or_nil(Map.get(action, "action")) || "reassign_photos",
        "fromSpaceId" => slug_or_nil(Map.get(action, "fromSpaceId")),
        "toSpaceIds" =>
          (Map.get(action, "toSpaceIds") || [])
          |> Enum.map(&slug_or_nil/1)
          |> Enum.reject(&is_nil/1),
        "imageIndices" =>
          (Map.get(action, "imageIndices") || []) |> Enum.filter(&is_integer/1),
        "note" => string_or_nil(Map.get(action, "note"))
      }
    end)
  end

  defp normalize_space_actions(_), do: []

  defp empty_result(reason) do
    %{
      "displaySpaces" => [],
      "spaces" => [],
      "reconciliation" => %{
        "matchStatus" => "insufficient_photos",
        "reflections" => [],
        "missing" => [],
        "extra" => [],
        "reason" => reason
      },
      "spaceActions" => [],
      "provisional" => false
    }
  end

  defp slug_or_nil(id) when is_binary(id) do
    s = SpaceSlug.slug(id)
    if s == "indefinido", do: nil, else: s
  end

  defp slug_or_nil(_), do: nil

  defp string_or_nil(v) when is_binary(v) do
    t = String.trim(v)
    if t == "", do: nil, else: t
  end

  defp string_or_nil(_), do: nil

  defp string_list(list, max) when is_list(list) do
    list
    |> Enum.map(&to_string/1)
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> Enum.take(max)
  end

  defp string_list(_, _), do: []

  defp titleize_label(id) do
    id
    |> String.replace("-", " ")
    |> String.split(" ", trim: true)
    |> Enum.map_join(" ", &String.capitalize/1)
  end
end
