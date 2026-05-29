defmodule MinhaCasaAiWeb.PortalSearchJSON do
  @moduledoc false

  alias MinhaCasaAi.PortalSearches

  def searches(searches) do
    Enum.map(searches, &search/1)
  end

  def search(search) do
    %{
      id: search.id,
      name: search.name,
      filterSet: search.filter_set,
      enabledPortals: search.enabled_portals,
      maxPages: search.max_pages,
      lastRunId: search.last_run_id,
      createdAt: search.inserted_at,
      updatedAt: search.updated_at
    }
  end

  def run(run) do
    %{
      id: run.id,
      portalSearchId: run.portal_search_id,
      status: run.status,
      startedAt: run.started_at,
      finishedAt: run.finished_at,
      error: run.error,
      totals: run.totals,
      traceId: run.trace_id,
      refresh: run.refresh
    }
  end

  def target(target) do
    %{
      id: target.id,
      portal: target.portal,
      bairroSlug: target.bairro_slug,
      page: target.page,
      url: target.url,
      status: target.status,
      cardsCount: target.cards_count,
      cacheHit: target.cache_hit,
      error: target.error
    }
  end

  def card(card) do
    %{
      id: card.id,
      portal: card.portal,
      sourceUrl: card.source_url,
      title: card.title,
      bairro: card.bairro,
      cidade: card.cidade,
      uf: card.uf,
      tipoImovel: card.tipo_imovel,
      quartos: card.quartos,
      banheiros: card.banheiros,
      vagas: card.vagas,
      suites: card.suites,
      areaTotal: card.area_total,
      areaPrivada: card.area_privada,
      preco: card.preco,
      precoCondominio: card.preco_condominio,
      precoM2: card.preco_m2,
      amenidades: card.amenidades,
      thumbnailUrl: card.thumbnail_url,
      postedAt: card.posted_at,
      rank: Map.get(card, :rank),
      cacheOrigin: Map.get(card, :cache_origin)
    }
  end

  def cost_summary(run) do
    PortalSearches.run_cost_summary(run)
  end
end
