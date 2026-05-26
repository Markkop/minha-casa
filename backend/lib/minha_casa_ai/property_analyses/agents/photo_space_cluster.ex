defmodule MinhaCasaAi.PropertyAnalyses.Agents.PhotoSpaceCluster do
  @moduledoc """
  Pre-risk agent: clusters photos into distinct physical spaces (no listing reconciliation).
  """

  alias MinhaCasaAi.Integrations.PropertyLlm
  alias MinhaCasaAi.PropertyAnalyses.{Limits, ListingFacts, SpaceGuard, SpaceSlug}

  @system_prompt """
  Você é o Agrupador Fotográfico de Ambientes: analisa inventário fotográfico de um imóvel no Brasil
  e relaciona cada foto a um ambiente físico distinto (quarto 1, quarto 2, banheiro A, etc.).

  Você recebe resumos factuais de cada foto (scene, spaceHint, materiais, acabamentos) e listingHints opcionais.
  Agrupe e separe com base nas fotos; listingHints só orientam contagem esperada, sem forçar fusão.

  TAREFAS:
  1. Agrupe fotos que mostram o MESMO ambiente físico (mesmo cômodo visto de ângulos diferentes).
  2. Separe ambientes distintos do mesmo tipo (quarto-1 vs quarto-2, sala-1 vs sala-2, banheiro-1 vs banheiro-2).
     Compare floor, walls, ceiling, baseboard, openings, layoutAnchors, wetAreaFixtures e distinctivenessNotes
     entre fotos — qualquer diferença factual relevante indica cômodos físicos DIFERENTES.
     REGRA DE OURO: só agrupe fotos do MESMO cômodo físico; na dúvida, SEPARE (quarto-1/quarto-2), não funda.
     Para QUARTOS e SUÍTES: NUNCA coloque fotos de quartos diferentes no mesmo spaceId. Numere quarto-1, quarto-2…
     Para BANHEIROS: NUNCA funda dois banheiros em um só. Compare pia, louças, revestimento, janelas e layoutAnchors.
     Para SALAS: NUNCA funda duas salas distintas — pisos/paredes iguais são comuns; use móveis (layoutAnchors) e aberturas.
  3. Atribua spaceId estável em kebab-case ASCII com sufixo numérico quando houver mais de um do mesmo tipo
     (quarto-1, quarto-2, banheiro-1, banheiro-2, sala-1, garagem).
  4. listingHints (quartos/banheiros do anúncio) são pista fraca: se as fotos mostram N ambientes distintos do mesmo tipo,
     reflita N spaceIds mesmo quando o acabamento for parecido — não reduza tudo a um único "quarto" ou "banheiro".
  5. listingRole é apenas pista opcional da foto (dormitorio, suite, banheiro, social, externo, servico, indefinido).
  6. NÃO invente defeitos; apenas mapeamento fotográfico.
  7. Omita ambientes sem nenhuma foto atribuída.

  Responda APENAS JSON válido em português:
  {
    "spaces": [
      {
        "spaceId": "quarto-1",
        "label": "Quarto 1",
        "scene": "quarto",
        "imageIndices": [0, 3],
        "listingRole": "dormitorio"
      }
    ]
  }
  """

  def cluster(inventory, listing_data \\ %{}, location_context \\ %{}) do
    images = Map.get(inventory, "images") || []

    photo_summaries =
      images
      |> Enum.filter(&analyzable?/1)
      |> Enum.map(&photo_summary/1)

    if photo_summaries == [] do
      {:ok, skipped_audit("no_analyzable_photos")}
    else
      listing_facts = ListingFacts.from_listing_data(listing_data)

      payload =
        Jason.encode!(%{
          "photos" => photo_summaries,
          "listingHints" => listing_facts,
          "locationContext" => location_summary(location_context),
          "photoCount" => length(photo_summaries),
          "maxPhotosAnalyzed" => Limits.max_images(),
          "ingestMaxImages" => Limits.ingest_max_images()
        })

      case PropertyLlm.chat_json(@system_prompt, payload, temperature: 0.2, max_tokens: 2_400) do
        {:ok, map} -> {:ok, normalize_cluster(map, photo_summaries, listing_facts)}
        {:error, reason} -> {:error, reason}
      end
    end
  end

  defp analyzable?(img) when is_map(img) do
    is_nil(Map.get(img, "error")) and is_map(Map.get(img, "observations"))
  end

  defp analyzable?(_), do: false

  defp photo_summary(img) do
    obs = Map.get(img, "observations", %{})

    %{
      "index" => Map.get(img, "index"),
      "scene" => Map.get(obs, "scene"),
      "spaceHint" => Map.get(obs, "spaceHint"),
      "distinctivenessNotes" => Map.get(obs, "distinctivenessNotes"),
      "layoutAnchors" => Map.get(obs, "layoutAnchors"),
      "materialsSpotted" => Map.get(obs, "materialsSpotted", []) |> Enum.take(10),
      "floor" => Map.get(obs, "floor"),
      "walls" => Map.get(obs, "walls"),
      "ceiling" => Map.get(obs, "ceiling"),
      "baseboard" => Map.get(obs, "baseboard"),
      "openings" => Map.get(obs, "openings"),
      "wetArea" => Map.get(obs, "wetArea"),
      "wetAreaFixtures" => Map.get(obs, "wetAreaFixtures")
    }
  end

  defp location_summary(ctx) when is_map(ctx) do
    Map.get(ctx, "summary") || Map.get(ctx, "formattedAddress")
  end

  defp location_summary(_), do: nil

  defp normalize_cluster(map, photo_summaries, listing_facts \\ %{}) do
    valid_indices =
      photo_summaries
      |> Enum.map(&Map.get(&1, "index"))
      |> Enum.filter(&is_integer/1)
      |> MapSet.new()

    spaces =
      (Map.get(map, "spaces") || [])
      |> Enum.filter(&is_map/1)
      |> Enum.map(&normalize_space(&1, valid_indices))
      |> Enum.reject(fn s -> (Map.get(s, "imageIndices") || []) == [] end)
      |> SpaceGuard.refine_spaces(photo_summaries, nil, listing_facts)

    %{
      "spaces" => spaces,
      "displaySpaces" => nil,
      "reconciliation" => pending_reconciliation(),
      "provisional" => true
    }
  end

  defp normalize_space(space, valid_indices) do
    space_id =
      (Map.get(space, "spaceId") || Map.get(space, "scene") || "indefinido")
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

    %{
      "spaceId" => space_id,
      "label" => label,
      "scene" => scene,
      "imageIndices" => indices,
      "listingRole" => normalize_listing_role(Map.get(space, "listingRole")),
      "visible" => true
    }
  end

  defp normalize_listing_role(role) when is_binary(role) do
    role |> String.downcase() |> String.trim()
  end

  defp normalize_listing_role(_), do: "indefinido"

  defp pending_reconciliation do
    %{
      "listingSummary" => nil,
      "detectedSummary" => nil,
      "matchStatus" => "pending",
      "reflections" => [],
      "missing" => [],
      "extra" => [],
      "photoCoverage" => nil
    }
  end

  defp skipped_audit(reason) do
    %{
      "spaces" => [],
      "displaySpaces" => [],
      "reconciliation" => %{
        "matchStatus" => "insufficient_photos",
        "reflections" => [],
        "missing" => [],
        "extra" => [],
        "reason" => reason
      },
      "skipped" => true,
      "reason" => reason
    }
  end

  defp titleize_label(id) do
    id
    |> String.replace("-", " ")
    |> String.split(" ", trim: true)
    |> Enum.map_join(" ", &String.capitalize/1)
  end

end
