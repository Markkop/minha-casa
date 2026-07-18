<script lang="ts">
  import { Grid3X3 } from "@lucide/svelte";
  import { MATRIX_AXES, MATRIX_METRICS, PORTALS, portalLabels } from "./constants";
  import { formatMatrixValue, heatColor } from "./matrix";
  import { formatNumber, money } from "./formatters";
  import type { ExplorarState } from "./use-explorar-state.svelte";

  let { state }: { state: ExplorarState } = $props();
</script>

<section class="rounded-md border border-app-border bg-app-surface p-4">
  <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
    <div>
      <div class="flex items-center gap-2">
        <Grid3X3 class="h-4 w-4 text-app-muted" />
        <h2 class="text-sm font-semibold">Matriz de mercado</h2>
      </div>
      <p class="mt-1 text-sm text-app-muted">Cruza resultados por atributo e destaca diferencas de valor.</p>
    </div>
    <div class="grid gap-2 sm:grid-cols-4">
      <label class="text-xs text-app-muted">
        Linhas
        <select class="mt-1 h-9 w-full rounded-md border border-app-border bg-white px-2 text-sm text-app-fg" bind:value={state.rowAxis}>
          {#each MATRIX_AXES as axis (axis.value)}
            <option value={axis.value}>{axis.label}</option>
          {/each}
        </select>
      </label>
      <label class="text-xs text-app-muted">
        Colunas
        <select class="mt-1 h-9 w-full rounded-md border border-app-border bg-white px-2 text-sm text-app-fg" bind:value={state.colAxis}>
          {#each MATRIX_AXES as axis (axis.value)}
            <option value={axis.value}>{axis.label}</option>
          {/each}
        </select>
      </label>
      <label class="text-xs text-app-muted">
        Metrica
        <select class="mt-1 h-9 w-full rounded-md border border-app-border bg-white px-2 text-sm text-app-fg" bind:value={state.matrixMetric}>
          {#each MATRIX_METRICS as metric (metric.value)}
            <option value={metric.value}>{metric.label}</option>
          {/each}
        </select>
      </label>
      <label class="text-xs text-app-muted">
        Portal
        <select class="mt-1 h-9 w-full rounded-md border border-app-border bg-white px-2 text-sm text-app-fg" bind:value={state.matrixPortalFilter}>
          <option value="all">Todos</option>
          {#each PORTALS as portal (portal)}
            <option value={portal}>{portalLabels[portal]}</option>
          {/each}
        </select>
      </label>
    </div>
  </div>

  {#if state.matrix.rows.length === 0 || state.matrix.cols.length === 0}
    <div class="mt-4 rounded-md border border-dashed border-app-border p-5 text-sm text-app-muted">Execute uma busca para preencher a matriz.</div>
  {:else}
    <div class="mt-4 overflow-auto">
      <table class="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th class="border border-app-border bg-app-surface-muted px-2 py-2 text-left text-xs text-app-muted"></th>
            {#each state.matrix.cols as col (col)}
              <th class="border border-app-border bg-app-surface-muted px-2 py-2 text-center text-xs font-medium">{col}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each state.matrix.rows as row (row)}
            <tr>
              <th class="border border-app-border bg-app-surface-muted px-2 py-2 text-left text-xs font-medium">{row}</th>
              {#each state.matrix.cols as col (col)}
                {@const cell = state.matrix.cells.find((item) => item.row === row && item.col === col)}
                <td class="border border-app-border px-2 py-2 text-center text-xs" style={`background-color: ${heatColor(cell?.value ?? null, state.matrixRange)}`}>
                  <button type="button" class="w-full rounded px-1 py-1 hover:bg-white/60" onclick={() => cell && (state.selectedMatrixCell = cell)}>
                    <div class="font-semibold">{formatMatrixValue(state.matrixMetric, cell?.value ?? null)}</div>
                    <div class="text-[10px] text-app-muted">n={cell?.count ?? 0}</div>
                  </button>
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if state.selectedMatrixCell}
    <div class="mt-4 rounded-md border border-app-border bg-white p-3">
      <div class="mb-2 flex items-center justify-between gap-3">
        <p class="text-sm font-medium">{state.selectedMatrixCell.listings.length} anuncios em {state.selectedMatrixCell.row} x {state.selectedMatrixCell.col}</p>
        <button type="button" class="text-xs text-app-muted underline" onclick={() => (state.selectedMatrixCell = null)}>Fechar</button>
      </div>
      <ul class="max-h-52 space-y-2 overflow-auto text-xs">
        {#each state.selectedMatrixCell.listings as listing (listing.id)}
          <li class="flex items-start justify-between gap-2 border-b border-app-border pb-2 last:border-b-0">
            <div>
              <p class="font-medium">{listing.title ?? "Sem título"}</p>
              <p class="text-app-muted">{portalLabels[listing.portal]} · {listing.neighborhood ?? "-"} · {formatNumber(listing.pricePerM2)} R$/m2 · {money(listing.price)}</p>
            </div>
            <a class="shrink-0 underline" href={listing.sourceUrl} target="_blank" rel="noreferrer">Ver</a>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</section>
