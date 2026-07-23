<script lang="ts">
  import { ArrowDown, ArrowUp, RotateCcw } from "@lucide/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Slider from "$lib/components/ui/Slider.svelte";
  import Switch from "$lib/components/ui/Switch.svelte";
  import type { Property } from "$lib/listings/types";
  import {
    calculateProposalTarget,
    formatExactCurrency,
    getPoolState,
    isValidReportProperty,
    orderComparablesByArgumentStrength,
    suggestComparables,
    suggestComparablesByProposalPrice,
    type ComparableFocus,
    type ComparableSelectionStrategy,
    type ReportBlockId,
    type ReportBlocksConfig,
    type ReportConfig,
    type ValidReportProperty
  } from "$lib/reports";

  let {
    reference,
    listings,
    config,
    getListingTitle,
    onChange
  }: {
    reference: ValidReportProperty;
    listings: Property[];
    config: ReportConfig;
    getListingTitle: (listing: Property) => string;
    onChange: (config: ReportConfig) => void;
  } = $props();

  const selectClass =
    "h-9 w-full rounded-md border border-app-border bg-app-surface px-2.5 text-xs text-app-fg outline-none focus:ring-2 focus:ring-app-action";

  const candidates = $derived(
    listings
      .filter((listing) => listing.id !== reference.id && isValidReportProperty(listing))
      .sort((a, b) => getListingTitle(a).localeCompare(getListingTitle(b), "pt-BR"))
  );

  const selectedListings = $derived(
    config.comparableIds
      .map((id) => candidates.find((candidate) => candidate.id === id))
      .filter((listing): listing is Property => Boolean(listing))
  );

  function patch(partial: Partial<ReportConfig>) {
    onChange({ ...config, ...partial });
  }

  function patchBlock<K extends keyof ReportBlocksConfig>(
    key: K,
    partial: Partial<ReportBlocksConfig[K]>
  ) {
    onChange({
      ...config,
      blocks: {
        ...config.blocks,
        [key]: { ...config.blocks[key], ...partial }
      }
    });
  }

  function blockEnabled(key: keyof ReportBlocksConfig, enabled: boolean) {
    patchBlock(key, { enabled });
  }

  function toggleComparable(id: string, checked: boolean) {
    if (checked && !config.comparableIds.includes(id)) {
      if (config.comparableIds.length >= 4) return;
      patch({ comparableIds: [...config.comparableIds, id] });
      return;
    }
    if (!checked) {
      const focuses = { ...config.blocks.comparables.focuses };
      delete focuses[id];
      onChange({
        ...config,
        comparableIds: config.comparableIds.filter((candidateId) => candidateId !== id),
        blocks: {
          ...config.blocks,
          comparables: { ...config.blocks.comparables, focuses }
        }
      });
    }
  }

  function moveComparable(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= config.comparableIds.length) return;
    const ids = [...config.comparableIds];
    [ids[index], ids[target]] = [ids[target], ids[index]];
    patch({ comparableIds: ids });
  }

  function setComparableFocus(id: string, focus: ComparableFocus) {
    patchBlock("comparables", {
      focuses: { ...config.blocks.comparables.focuses, [id]: focus }
    });
  }

  function applySuggestions() {
    patch({ comparableIds: suggestedComparableIds(config) });
  }

  function suggestedComparableIds(nextConfig: ReportConfig): string[] {
    if (nextConfig.comparableSelectionStrategy === "proposal-price") {
      const target = calculateProposalTarget(
        reference,
        nextConfig.marginPercent,
        nextConfig.proposalOverride
      );
      return suggestComparablesByProposalPrice(reference, listings, target, 4).map(
        (candidate) => candidate.listing.id
      );
    }

    const suggested = suggestComparables(reference, listings, 4).map((candidate) => candidate.listing);
    return orderComparablesByArgumentStrength(reference, suggested).map(
      (comparable) => comparable.listing.id
    );
  }

  function patchSelectionInputs(partial: Partial<ReportConfig>) {
    const nextConfig = { ...config, ...partial };
    onChange({ ...nextConfig, comparableIds: suggestedComparableIds(nextConfig) });
  }

  function applyArgumentOrder() {
    const ordered = orderComparablesByArgumentStrength(reference, selectedListings).map(
      (comparable) => comparable.listing.id
    );
    patch({ comparableIds: ordered });
  }

  function parseOptionalNumber(value: string): number | null {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  function setMarginPercent(value: number) {
    patchSelectionInputs({ marginPercent: Math.round(Math.min(20, Math.max(0, value || 0))) });
  }

  function setProposalOverride(value: string) {
    patchSelectionInputs({ proposalOverride: parseOptionalNumber(value) });
  }

  function setComparableSelectionStrategy(strategy: ComparableSelectionStrategy) {
    patchSelectionInputs({ comparableSelectionStrategy: strategy });
  }

  const proposalTarget = $derived(
    calculateProposalTarget(reference, config.marginPercent, config.proposalOverride)
  );

  const blockLabels: Record<ReportBlockId, string> = {
    greeting: "Saudação",
    context: "Contexto",
    priceSummary: "Resumo de preço",
    comparables: "Comparáveis",
    caveat: "Ressalva",
    renovation: "Reforma e teto",
    proposal: "Proposta",
    closing: "Encerramento"
  };
</script>

{#snippet sectionHeader(id: ReportBlockId, enabled: boolean)}
  <div class="flex items-center justify-between gap-3">
    <div>
      <h3 class="text-xs font-semibold text-app-fg">{blockLabels[id]}</h3>
      <p class="mt-0.5 text-[11px] text-app-muted">
        {enabled ? "Incluído no relatório" : "Não será incluído"}
      </p>
    </div>
    <Switch
      checked={enabled}
      aria-label={`Incluir ${blockLabels[id].toLowerCase()}`}
      onCheckedChange={(checked) => blockEnabled(id as keyof ReportBlocksConfig, checked)}
    />
  </div>
{/snippet}

<div class="divide-y divide-app-border">
  <section class="space-y-3 p-4">
    <div>
      <h3 class="text-xs font-semibold text-app-fg">Cálculo</h3>
      <p class="mt-1 text-[11px] leading-relaxed text-app-muted">
        {config.comparableSelectionStrategy === "proposal-price"
          ? "A proposta aplica o desconto diretamente ao preço pedido."
          : "A proposta considera os valores equivalentes dos comparáveis."}
      </p>
    </div>
    <label class="block">
      <span class="mb-1 block text-[11px] font-medium text-app-muted">Critério para selecionar comparáveis</span>
      <select
        class={selectClass}
        value={config.comparableSelectionStrategy}
        onchange={(event) => setComparableSelectionStrategy(event.currentTarget.value as ComparableSelectionStrategy)}
      >
        <option value="proposal-price">Preço próximo da proposta final</option>
        <option value="physical-similarity">Semelhança física do imóvel</option>
      </select>
    </label>
    {#if config.comparableSelectionStrategy === "proposal-price"}
      <div class="rounded-md border border-app-action/25 bg-app-action/5 px-3 py-2">
        <p class="text-[11px] font-medium text-app-fg">
          Selecionando imóveis próximos de {formatExactCurrency(proposalTarget)}
        </p>
        <p class="mt-0.5 text-[10px] leading-relaxed text-app-muted">
          Os quatro preços anunciados mais próximos são atualizados junto com a proposta.
        </p>
      </div>
    {/if}
    <label class="block">
      <span class="mb-1 block text-[11px] font-medium text-app-muted">
        {config.comparableSelectionStrategy === "proposal-price"
          ? "Desconto sobre o preço pedido"
          : "Margem de negociação"}
      </span>
      <div class="flex items-center gap-3">
        <Slider
          value={config.marginPercent}
          min={0}
          max={20}
          step={1}
          ariaLabel="Margem de negociação"
          onValueChange={setMarginPercent}
        />
        <Input
          type="number"
          min={0}
          max={20}
          step={1}
          value={config.marginPercent}
          class="h-9 w-20 shrink-0"
          oninput={(event) => setMarginPercent(Number(event.currentTarget.value))}
        />
        <span class="text-xs text-app-muted">%</span>
      </div>
    </label>
    <label class="block">
      <span class="mb-1 block text-[11px] font-medium text-app-muted">Proposta manual (opcional)</span>
      <Input
        type="number"
        min={0}
        step={5000}
        placeholder="Usar valor calculado"
        value={config.proposalOverride ?? ""}
        class="h-9"
        oninput={(event) => setProposalOverride(event.currentTarget.value)}
      />
    </label>
  </section>

  <section class="space-y-3 p-4">
    <div class="flex items-center justify-between gap-2">
      <div>
        <h3 class="text-xs font-semibold text-app-fg">Comparáveis</h3>
        <p class="mt-0.5 text-[11px] text-app-muted">Selecione entre 2 e 4 imóveis.</p>
      </div>
      <Button size="sm" variant="ghost" class="h-7 px-2" onclick={applySuggestions}>
        <RotateCcw class="size-3.5" /> Sugerir
      </Button>
    </div>

    {#if selectedListings.length > 1}
      <button
        type="button"
        class="text-[11px] font-medium text-app-fg underline underline-offset-2"
        onclick={applyArgumentOrder}
      >
        Ordenar por força dos argumentos
      </button>
    {/if}

    <div class="space-y-2">
      {#each selectedListings as listing, index (listing.id)}
        <div class="rounded-md border border-app-border bg-app-bg p-2">
          <div class="flex items-start gap-2">
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-medium text-app-fg">{index + 1}. {getListingTitle(listing)}</p>
              <p class="mt-0.5 text-[10px] text-app-muted">
                {formatExactCurrency(listing.price ?? 0)} · Piscina: {getPoolState(listing) === "yes" ? "sim" : getPoolState(listing) === "no" ? "não" : "desconhecida"}
              </p>
            </div>
            <button
              type="button"
              class="rounded p-1 text-app-muted hover:bg-app-surface-muted disabled:opacity-30"
              aria-label="Mover comparável para cima"
              disabled={index === 0}
              onclick={() => moveComparable(index, -1)}
            ><ArrowUp class="size-3.5" /></button>
            <button
              type="button"
              class="rounded p-1 text-app-muted hover:bg-app-surface-muted disabled:opacity-30"
              aria-label="Mover comparável para baixo"
              disabled={index === selectedListings.length - 1}
              onclick={() => moveComparable(index, 1)}
            ><ArrowDown class="size-3.5" /></button>
          </div>
          <select
            class={`${selectClass} mt-2`}
            value={config.blocks.comparables.focuses[listing.id] ?? "automatic"}
            aria-label={`Foco do comparável ${index + 1}`}
            onchange={(event) => setComparableFocus(listing.id, event.currentTarget.value as ComparableFocus)}
          >
            <option value="automatic">Foco automático</option>
            <option value="price">Preço</option>
            <option value="land">Terreno</option>
            <option value="construction">Construção</option>
            <option value="features">Características</option>
          </select>
        </div>
      {/each}
    </div>

    <div class="max-h-56 space-y-1 overflow-y-auto rounded-md border border-app-border p-1.5">
      {#each candidates as listing (listing.id)}
        <label class="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 hover:bg-app-surface-muted">
          <input
            type="checkbox"
            class="mt-0.5 accent-app-action"
            checked={config.comparableIds.includes(listing.id)}
            disabled={!config.comparableIds.includes(listing.id) && config.comparableIds.length >= 4}
            onchange={(event) => toggleComparable(listing.id, event.currentTarget.checked)}
          />
          <span class="min-w-0">
            <span class="block truncate text-[11px] font-medium text-app-fg">{getListingTitle(listing)}</span>
            <span class="block text-[10px] text-app-muted">
              {formatExactCurrency(listing.price ?? 0)} · {listing.totalAreaM2} m² terreno · {listing.privateAreaM2} m² construídos
            </span>
          </span>
        </label>
      {/each}
    </div>
  </section>

  <section class="space-y-3 p-4">
    {@render sectionHeader("greeting", config.blocks.greeting.enabled)}
    {#if config.blocks.greeting.enabled}
      <select
        class={selectClass}
        value={config.blocks.greeting.variant}
        onchange={(event) => patchBlock("greeting", { variant: event.currentTarget.value as "generic" | "named" })}
      >
        <option value="generic">Saudação genérica</option>
        <option value="named">Usar destinatário</option>
      </select>
      {#if config.blocks.greeting.variant === "named"}
        <Input
          value={config.blocks.greeting.recipientName ?? ""}
          placeholder="Nome do destinatário"
          class="h-9"
          oninput={(event) => patchBlock("greeting", { recipientName: event.currentTarget.value })}
        />
      {/if}
    {/if}
  </section>

  <section class="space-y-3 p-4">
    {@render sectionHeader("context", config.blocks.context.enabled)}
    {#if config.blocks.context.enabled}
      <select class={selectClass} value={config.blocks.context.variant} onchange={(event) => patchBlock("context", { variant: event.currentTarget.value as "generic" | "visit" | "conversation" })}>
        <option value="generic">Contexto genérico</option>
        <option value="visit">Depois de uma visita</option>
        <option value="conversation">Depois de uma conversa</option>
      </select>
      <Input value={config.blocks.context.detail ?? ""} placeholder="Detalhe opcional" class="h-9" oninput={(event) => patchBlock("context", { detail: event.currentTarget.value })} />
    {/if}
  </section>

  <section class="space-y-3 p-4">
    {@render sectionHeader("priceSummary", config.blocks.priceSummary.enabled)}
    {#if config.blocks.priceSummary.enabled}
      <select class={selectClass} value={config.blocks.priceSummary.variant} onchange={(event) => patchBlock("priceSummary", { variant: event.currentTarget.value as "combined" | "land" | "construction" | "direct" })}>
        <option value="combined">R$/m² terreno + construção</option>
        <option value="land">Preço por m² de terreno</option>
        <option value="construction">Preço por m² construído</option>
        <option value="direct">Comparação direta de preço</option>
      </select>
    {/if}
  </section>

  <section class="space-y-3 p-4">
    {@render sectionHeader("comparables", config.blocks.comparables.enabled)}
    {#if config.blocks.comparables.enabled}
      <select class={selectClass} value={config.blocks.comparables.presentation} onchange={(event) => patchBlock("comparables", { presentation: event.currentTarget.value as "list" | "table" })}>
        <option value="list">Lista numerada</option>
        <option value="table">Tabela Markdown</option>
      </select>
    {/if}
  </section>

  {#each ["caveat", "proposal", "closing"] as blockId (blockId)}
    <section class="space-y-3 p-4">
      {@render sectionHeader(blockId as ReportBlockId, config.blocks[blockId as "caveat" | "proposal" | "closing"].enabled)}
    </section>
  {/each}

  <section class="space-y-3 p-4">
    {@render sectionHeader("renovation", config.blocks.renovation.enabled)}
    {#if config.blocks.renovation.enabled}
      <Input type="number" min={0} step={5000} placeholder="Valor manual da reforma (opcional)" value={config.blocks.renovation.amount ?? ""} class="h-9" oninput={(event) => patchBlock("renovation", { amount: parseOptionalNumber(event.currentTarget.value) })} />
      <p class="text-[10px] leading-relaxed text-app-muted">Este valor aparece apenas no texto e não reduz a proposta calculada.</p>
    {/if}
  </section>
</div>
