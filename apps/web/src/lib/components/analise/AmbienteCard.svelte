<script lang="ts">
  import { Loader2, RefreshCw } from "@lucide/svelte";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import RoomCardPhoto from "$lib/components/analise/RoomCardPhoto.svelte";
  import { formatBrl, truncateError } from "$lib/components/analise/format-brl";
  import { themeForCategoria } from "$lib/components/analise/room-scene-theme";
  import { buildAmbienteRotulo } from "$lib/property-analysis/ambiente-categories";
  import type { AmbienteCard as AmbienteCardType, InventoryItem } from "$lib/property-analysis/types";
  import { cn } from "$lib/utils";

  let {
    card,
    imageUrls,
    onRefreshXray
  }: {
    card: AmbienteCardType;
    imageUrls: string[];
    onRefreshXray?: () => void;
  } = $props();

  const theme = $derived(themeForCategoria(card.categoria));
  const rotulo = $derived(buildAmbienteRotulo(card));
  const pontos = $derived(card.pontosAtencao ?? []);
  const xrayStatus = $derived(card.xrayStatus ?? "waiting");
  const instalacoesMoveis = $derived([...(card.instalacoes ?? []), ...(card.moveis ?? [])]);
  const canRefreshXray = $derived(Boolean(onRefreshXray) && xrayStatus !== "pending");
</script>

<WorkspacePanel class={cn("overflow-hidden border p-0", theme.ring)}>
  <div class={cn("border-b px-3 py-2", theme.header)}>
    <div class="flex items-center justify-between gap-2">
      <h4 class="text-sm font-semibold text-app-fg">{rotulo}</h4>
      <div class="flex items-center gap-1">
        {#if canRefreshXray && onRefreshXray}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="size-7 text-app-muted hover:text-app-fg"
            ariaLabel="Reexecutar x-ray deste ambiente"
            onclick={onRefreshXray}
          >
            <RefreshCw class="size-3.5" />
          </Button>
        {/if}
        {#if xrayStatus === "pending"}
          <span class="inline-flex items-center gap-1 text-[10px] text-app-muted">
            <Loader2 class="size-3 animate-spin" />
            X-ray…
          </span>
        {:else if xrayStatus === "done"}
          <span class="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
            X-ray pronto
          </span>
        {:else if xrayStatus === "failed"}
          <span class="text-[10px] font-medium text-destructive">X-ray falhou</span>
        {/if}
      </div>
    </div>
  </div>

  <RoomCardPhoto {imageUrls} imageIndices={card.imageIndices} class="rounded-none border-0" />

  <div class="space-y-2 px-3 pb-3">
    {#if (card.estrutura ?? []).length > 0}
      <div class="border-t border-app-border pt-2">
        <p class="text-xs font-medium text-app-fg">Estrutura</p>
        <div class="mt-1.5 flex flex-wrap gap-1.5">
          {#each card.estrutura ?? [] as item, i (`estrutura-${item.tipo}-${i}`)}
            {@render inventoryBadge(item)}
          {/each}
        </div>
      </div>
    {/if}

    {#if instalacoesMoveis.length > 0}
      <div class="border-t border-app-border pt-2">
        <p class="text-xs font-medium text-app-fg">Instalações / Móveis</p>
        <div class="mt-1.5 flex flex-wrap gap-1.5">
          {#each instalacoesMoveis as item, i (`inst-${item.tipo}-${i}`)}
            {@render inventoryBadge(item)}
          {/each}
        </div>
      </div>
    {/if}

    <div class="border-t border-app-border pt-2">
      <p class="text-xs font-medium text-app-fg">Pontos de Atenção</p>

      {#if xrayStatus === "waiting"}
        <p class="mt-2 text-xs text-app-muted">Aguardando análise do ambiente…</p>
      {:else if xrayStatus === "pending"}
        <ul class="mt-2 space-y-2">
          {#each [1, 2, 3] as i (i)}
            <li
              class="h-14 animate-pulse rounded-md border border-app-border bg-app-surface-muted/50"
            ></li>
          {/each}
        </ul>
      {:else if xrayStatus === "failed"}
        <div class="mt-2 space-y-2">
          {#if card.xrayError}
            <p class="text-xs text-destructive" title={card.xrayError}>
              {truncateError(card.xrayError, 200)}
            </p>
          {/if}
        </div>
      {:else if xrayStatus === "done" && pontos.length > 0}
        <ul class="mt-2 space-y-3">
          {#each pontos as ponto (ponto.id)}
            <li class="rounded-md border border-app-border bg-app-surface-muted/50 p-2">
              <p class="text-xs font-medium text-app-fg">{ponto.titulo}</p>
              <p class="mt-0.5 text-xs text-app-muted">{ponto.descricao}</p>
              <p class="mt-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                {formatBrl(ponto.custoMinBrl)} – {formatBrl(ponto.custoMaxBrl)}
                {#if ponto.detalhes}
                  <span class="ml-1 font-normal text-app-muted">· {ponto.detalhes}</span>
                {/if}
              </p>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</WorkspacePanel>

{#snippet inventoryBadge(item: InventoryItem)}
  <span
    title={item.detalhe}
    class="inline-flex max-w-full items-center rounded-full border border-app-border bg-app-surface-muted/60 px-2 py-0.5 text-[11px] leading-snug text-app-fg"
  >
    <span class="font-medium">{item.tipo}</span>
    {#if item.material}
      <span class="text-app-muted"> · {item.material}</span>
    {/if}
  </span>
{/snippet}
