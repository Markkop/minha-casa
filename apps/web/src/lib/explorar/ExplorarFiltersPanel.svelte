<script lang="ts">
  import { Play, RefreshCw, Search } from "@lucide/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { cn } from "$lib/utils";
  import {
    AMENIDADES,
    ESTAGIOS,
    PORTALS,
    portalLabels,
    QUARTOS_OPTIONS,
    TIPOS_IMOVEL,
    TRANSACOES
  } from "./constants";
  import type { ExplorarState } from "./use-explorar-state.svelte";

  let { state }: { state: ExplorarState } = $props();
</script>

<section class="rounded-md border border-app-border bg-app-surface p-4">
  <div class="mb-4 flex flex-wrap gap-2">
    {#each TRANSACOES as transacao (transacao)}
      <button
        type="button"
        class={cn(
          "rounded-full border px-3 py-1 text-xs transition",
          state.filterSet.transacao === transacao ? "border-app-fg bg-app-fg text-white" : "border-app-border bg-white text-app-muted hover:text-app-fg"
        )}
        onclick={() => (state.filterSet = { ...state.filterSet, transacao })}
      >
        {transacao === "venda" ? "Comprar" : "Alugar"}
      </button>
    {/each}
  </div>

  <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
    <label class="flex flex-col gap-2 text-sm font-medium xl:col-span-2">
      Nome
      <input class="h-10 rounded-md border border-app-border bg-white px-3" bind:value={state.name} />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium">
      Max paginas
      <input class="h-10 rounded-md border border-app-border bg-white px-3" type="number" min="1" max="5" bind:value={state.maxPages} />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium">
      UF
      <input class="h-10 rounded-md border border-app-border bg-white px-3" maxlength="2" bind:value={state.filterSet.uf} />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium">
      Cidade
      <input class="h-10 rounded-md border border-app-border bg-white px-3" bind:value={state.filterSet.city} />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium">
      Bairros
      <input class="h-10 rounded-md border border-app-border bg-white px-3" placeholder="centro, agronomica" bind:value={state.bairrosText} />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium">
      Tipos
      <input class="h-10 rounded-md border border-app-border bg-white px-3" placeholder="apartamento, casa" bind:value={state.tiposText} />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium">
      Quartos
      <input class="h-10 rounded-md border border-app-border bg-white px-3" placeholder="2, 3" bind:value={state.quartosText} />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium">
      Banheiros
      <input class="h-10 rounded-md border border-app-border bg-white px-3" placeholder="1, 2" bind:value={state.banheirosText} />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium">
      Vagas
      <input class="h-10 rounded-md border border-app-border bg-white px-3" placeholder="1, 2" bind:value={state.vagasText} />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium">
      Suites
      <input class="h-10 rounded-md border border-app-border bg-white px-3" placeholder="1, 2" bind:value={state.suitesText} />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium">
      Preco min
      <input class="h-10 rounded-md border border-app-border bg-white px-3" type="number" bind:value={state.filterSet.precoMin} />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium">
      Preco max
      <input class="h-10 rounded-md border border-app-border bg-white px-3" type="number" bind:value={state.filterSet.precoMax} />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium">
      Area min
      <input class="h-10 rounded-md border border-app-border bg-white px-3" type="number" bind:value={state.filterSet.areaMin} />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium">
      Area max
      <input class="h-10 rounded-md border border-app-border bg-white px-3" type="number" bind:value={state.filterSet.areaMax} />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium">
      Condominio max
      <input class="h-10 rounded-md border border-app-border bg-white px-3" type="number" bind:value={state.filterSet.condominioMax} />
    </label>
  </div>

  <div class="mt-5 grid gap-5 lg:grid-cols-2">
    <div>
      <div class="mb-2 text-sm font-medium">Tipo</div>
      <div class="flex flex-wrap gap-2">
        {#each TIPOS_IMOVEL as tipo (tipo)}
          <button
            type="button"
            class={cn(
              "rounded-full border px-3 py-1 text-xs transition",
              state.filterSet.tiposImovel.includes(tipo) ? "border-app-fg bg-app-fg text-white" : "border-app-border bg-white text-app-muted hover:text-app-fg"
            )}
            onclick={() => state.toggleStringList("tiposImovel", tipo)}
          >
            {tipo.replace(/_/g, " ")}
          </button>
        {/each}
      </div>
    </div>

    <div>
      <div class="mb-2 text-sm font-medium">Quartos</div>
      <div class="flex flex-wrap gap-2">
        {#each QUARTOS_OPTIONS as option (option)}
          <button
            type="button"
            class={cn(
              "rounded-full border px-3 py-1 text-xs transition",
              state.filterSet.bedrooms.includes(option) ? "border-app-fg bg-app-fg text-white" : "border-app-border bg-white text-app-muted hover:text-app-fg"
            )}
            onclick={() => state.toggleNumberList("bedrooms", option)}
          >
            {option}+
          </button>
        {/each}
      </div>
    </div>

    <div>
      <div class="mb-2 text-sm font-medium">Amenidades</div>
      <div class="flex flex-wrap gap-2">
        {#each AMENIDADES as amenidade (amenidade)}
          <button
            type="button"
            class={cn(
              "rounded-full border px-3 py-1 text-xs transition",
              state.filterSet.amenidades.includes(amenidade) ? "border-app-fg bg-app-fg text-white" : "border-app-border bg-white text-app-muted hover:text-app-fg"
            )}
            onclick={() => state.toggleStringList("amenidades", amenidade)}
          >
            {amenidade.replace(/_/g, " ")}
          </button>
        {/each}
      </div>
    </div>

    <div>
      <div class="mb-2 text-sm font-medium">Estagio</div>
      <div class="flex flex-wrap gap-2">
        {#each ESTAGIOS as estagio (estagio)}
          <button
            type="button"
            class={cn(
              "rounded-full border px-3 py-1 text-xs transition",
              state.filterSet.estagio.includes(estagio) ? "border-app-fg bg-app-fg text-white" : "border-app-border bg-white text-app-muted hover:text-app-fg"
            )}
            onclick={() => state.toggleStringList("estagio", estagio)}
          >
            {estagio.replace(/_/g, " ")}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <div class="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
    <div>
      <div class="mb-2 text-sm font-medium">Portais</div>
      <div class="flex flex-wrap gap-2">
        {#each PORTALS as portal (portal)}
          <button
            type="button"
            class={[
              "rounded-md border px-3 py-2 text-sm",
              state.enabledPortals.includes(portal)
                ? "border-app-fg bg-app-fg text-white"
                : "border-app-border bg-white text-app-muted hover:bg-app-surface-muted"
            ]}
            onclick={() => state.togglePortal(portal)}
          >
            {portalLabels[portal]}
          </button>
        {/each}
      </div>
    </div>

    <div>
      <div class="mb-2 text-sm font-medium">Preview de URLs ({state.previewUrls.length})</div>
      <div class="max-h-36 space-y-1 overflow-auto rounded-md border border-app-border bg-white p-2 text-xs">
        {#each state.previewUrls as preview (`${preview.portal}-${preview.url}`)}
          <a class="block truncate text-app-muted underline decoration-dotted underline-offset-2 hover:text-app-fg" href={preview.url} target="_blank" rel="noreferrer" title={preview.url}>
            {portalLabels[preview.portal]}: {preview.url}
          </a>
        {:else}
          <p class="text-app-muted">Selecione ao menos um portal.</p>
        {/each}
      </div>
    </div>
  </div>

  <div class="mt-4 flex flex-wrap gap-2">
    <Button onclick={() => void state.saveAndRun(false)} disabled={state.running || state.enabledPortals.length === 0}>
      {#if state.running}
        <RefreshCw class="h-4 w-4 animate-spin" />
      {:else}
        <Search class="h-4 w-4" />
      {/if}
      Buscar
    </Button>
    <Button variant="secondary" onclick={() => void state.saveAndRun(true)} disabled={state.running || !state.searchId}>
      <Play class="h-4 w-4" /> Forcar atualizacao
    </Button>
    <Button variant="ghost" onclick={state.resetFilters}>Resetar filtros</Button>
  </div>
</section>
