<script lang="ts">
  import { ExternalLink } from "@lucide/svelte";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import { portalLabels } from "./constants";
  import { formatNumber, money } from "./formatters";
  import type { ExplorarState } from "./use-explorar-state.svelte";

  let { state }: { state: ExplorarState } = $props();
</script>

<section class="grid gap-4 xl:grid-cols-2">
  <article class="rounded-md border border-app-border bg-app-surface p-4">
    <h2 class="mb-3 text-sm font-semibold">Portais</h2>
    <div class="grid gap-2">
      {#each state.portalStats as stat (stat.portal)}
        <div class="flex items-center justify-between rounded-md border border-app-border bg-white px-3 py-2 text-sm">
          <span>{portalLabels[stat.portal] ?? stat.portal}</span>
          <span class="text-app-muted">{stat.count} cards · {formatNumber(stat.medianM2)} R$/m2</span>
        </div>
      {/each}
    </div>
  </article>

  <article class="rounded-md border border-app-border bg-app-surface p-4">
    <h2 class="mb-3 text-sm font-semibold">Bairros</h2>
    {#if state.bairroStats.length === 0}
      <p class="text-sm text-app-muted">Sem cards para agrupar.</p>
    {:else}
      <div class="grid gap-2">
        {#each state.bairroStats as stat (stat.neighborhood)}
          <div class="flex items-center justify-between rounded-md border border-app-border bg-white px-3 py-2 text-sm">
            <span>{stat.neighborhood}</span>
            <span class="text-app-muted">{stat.count} · {formatNumber(stat.medianM2)} R$/m2 · min {money(stat.minPrice)}</span>
          </div>
        {/each}
      </div>
    {/if}
  </article>
</section>

<section class="rounded-md border border-app-border bg-app-surface">
  <div class="flex items-center justify-between border-b border-app-border p-4">
    <h2 class="text-sm font-semibold">Imóveis ({state.cards.length})</h2>
  </div>
  {#if state.cards.length === 0}
    <div class="p-5 text-sm text-app-muted">Nenhum resultado carregado ainda.</div>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full min-w-[900px] border-collapse text-sm">
        <thead class="bg-app-surface-muted text-left text-xs uppercase text-app-muted">
          <tr>
            <th class="px-3 py-2 font-medium">Anuncio</th>
            <th class="px-3 py-2 font-medium">Portal</th>
            <th class="px-3 py-2 font-medium">Local</th>
            <th class="px-3 py-2 font-medium">Preco</th>
            <th class="px-3 py-2 font-medium">R$/m2</th>
            <th class="px-3 py-2 font-medium">Info</th>
            <th class="px-3 py-2 text-right font-medium">Link</th>
          </tr>
        </thead>
        <tbody>
          {#each state.cards as card (card.id)}
            <tr class="border-t border-app-border">
              <td class="px-3 py-3 font-medium text-app-fg">{card.title ?? "Sem título"}</td>
              <td class="px-3 py-3 text-app-muted">{portalLabels[card.portal] ?? card.portal}</td>
              <td class="px-3 py-3 text-app-muted">{[card.neighborhood, card.city, card.uf].filter(Boolean).join(", ")}</td>
              <td class="px-3 py-3">{money(card.price)}</td>
              <td class="px-3 py-3">{formatNumber(card.pricePerM2)}</td>
              <td class="px-3 py-3 text-app-muted">{card.bedrooms ?? "-"} q · {card.bathrooms ?? "-"} b · {card.areaPrivada ?? card.areaTotal ?? "-"} m2</td>
              <td class="px-3 py-3 text-right">
                <FloatingTooltip label="Abrir" side="bottom">
                  <a class="inline-flex h-9 w-9 items-center justify-center rounded-md text-app-muted hover:bg-app-surface-muted hover:text-app-fg" href={card.sourceUrl} target="_blank" rel="noreferrer">
                    <ExternalLink class="h-4 w-4" />
                  </a>
                </FloatingTooltip>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
