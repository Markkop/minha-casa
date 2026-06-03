<script lang="ts">
  import { Copy } from "@lucide/svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import { buildFloodRiskPrompt } from "$lib/floodrisk/flood-risk-prompt";
  import { resolveListingDisplayTitle } from "$lib/listing-display-title";

  let {
    selectedListing,
    isLoadingListings = false
  }: {
    selectedListing: Imovel | null;
    isLoadingListings?: boolean;
  } = $props();

  let copied = $state(false);

  const promptText = $derived(buildFloodRiskPrompt(selectedListing));
  const canCopy = $derived(Boolean(selectedListing && promptText));

  async function copyPrompt() {
    if (!canCopy) return;
    await navigator.clipboard.writeText(promptText);
    copied = true;
    window.setTimeout(() => {
      copied = false;
    }, 2000);
  }
</script>

<section class="flex min-h-[220px] flex-col rounded-lg border border-app-border bg-app-surface p-4 shadow-sm">
  <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
    <div>
      <h2 class="text-sm font-semibold text-app-fg">Prompt para IA externa</h2>
      <p class="mt-0.5 text-xs text-app-muted">Copie e cole no ChatGPT, Gemini ou outra IA.</p>
    </div>
    <button
      type="button"
      class="inline-flex h-8 items-center gap-2 rounded-md bg-app-action px-3 text-xs font-semibold text-app-action-foreground disabled:cursor-not-allowed disabled:opacity-40"
      disabled={!canCopy}
      onclick={copyPrompt}
    >
      <Copy class="h-3.5 w-3.5" />
      {copied ? "Copiado" : "Copiar prompt"}
    </button>
  </div>

  {#if isLoadingListings}
    <div
      class="flex flex-1 items-center justify-center rounded-md border border-app-border bg-app-bg p-6 text-center text-sm text-app-muted"
    >
      Carregando imoveis...
    </div>
  {:else if !selectedListing}
    <div
      class="flex flex-1 items-center justify-center rounded-md border border-dashed border-app-border bg-app-bg p-6 text-center text-sm text-app-muted"
    >
      Selecione um imovel no breadcrumb acima para montar o prompt com endereco e coordenadas.
    </div>
  {:else}
    <div class="mb-3 rounded-md border border-app-border bg-app-bg px-3 py-2">
      <p class="truncate text-sm text-app-fg">{resolveListingDisplayTitle(selectedListing)}</p>
    </div>
    <pre
      class="max-h-[280px] flex-1 overflow-auto rounded-md border border-app-border bg-app-bg p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-app-fg"
    >{promptText}</pre>
  {/if}
</section>
