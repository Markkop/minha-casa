<script lang="ts">
  import { ChevronDown } from "@lucide/svelte";
  import type { Property } from "$lib/listings/types";
  import FloodRiskPasteCard from "$lib/floodrisk/FloodRiskPasteCard.svelte";
  import FloodRiskPromptCard from "$lib/floodrisk/FloodRiskPromptCard.svelte";
  import type { ParseResult } from "$lib/floodrisk/flood-risk-parser";
  import type { FloodRiskGlobals } from "$lib/floodrisk/flood-risk-scenario";
  import { cn } from "$lib/utils";

  let {
    selectedListing,
    isLoadingListings = false,
    pastedText = $bindable(""),
    parseResult,
    appliedGlobals,
    scenarioCount = 0,
    open = $bindable(true)
  }: {
    selectedListing: Property | null;
    isLoadingListings?: boolean;
    pastedText?: string;
    parseResult: ParseResult | null;
    appliedGlobals: FloodRiskGlobals | null;
    scenarioCount?: number;
    open?: boolean;
  } = $props();

  const summaryHint = $derived.by(() => {
    if (scenarioCount > 0) {
      const status = parseResult?.ok ? "Resposta válida" : "Resposta com erro";
      return `${scenarioCount} cenário${scenarioCount === 1 ? "" : "s"} · ${status}`;
    }
    if (pastedText.trim()) {
      return parseResult?.ok === false ? "Resposta com erro" : "Aguardando leitura";
    }
    if (selectedListing) return "Imóvel selecionado · cole a resposta";
    return "Selecione um imóvel no breadcrumb";
  });
</script>

<details
  bind:open
  class="shrink-0 rounded-lg border border-app-border bg-app-surface shadow-sm"
>
  <summary
    class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden"
  >
    <div class="min-w-0">
      <span class="text-sm font-semibold text-app-fg">Entrada da IA</span>
      <span class="mt-0.5 block truncate text-xs text-app-muted">{summaryHint}</span>
    </div>
    <ChevronDown
      class={cn("size-4 shrink-0 text-app-muted transition-transform", open && "rotate-180")}
    />
  </summary>

  <div class="grid gap-3 border-t border-app-border p-3 md:grid-cols-2">
    <FloodRiskPromptCard {selectedListing} {isLoadingListings} />
    <FloodRiskPasteCard
      bind:pastedText
      {parseResult}
      {appliedGlobals}
      {scenarioCount}
    />
  </div>
</details>
