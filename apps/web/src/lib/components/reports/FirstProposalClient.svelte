<script lang="ts">
  import { AlertTriangle, Check, Copy, FileText } from "@lucide/svelte";
  import { page } from "$app/state";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import WorkspaceRightSidebarContent from "$lib/components/layout/WorkspaceRightSidebarContent.svelte";
  import FirstProposalSettings from "$lib/components/reports/FirstProposalSettings.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import WorkspaceListingQuerySync from "$lib/components/workspace/WorkspaceListingQuerySync.svelte";
  import WorkspaceLoadingState from "$lib/components/workspace/WorkspaceLoadingState.svelte";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import { formatPricePerM2 } from "$lib/comparacao/comparison-helpers";
  import { sortSelectableListings } from "$lib/listings/listing-selector";
  import { createReportPreviewSegments } from "$lib/reports/preview";
  import {
    calculateProposalTarget,
    createDefaultReportConfig,
    formatCurrency,
    formatExactCurrency,
    generateFirstProposalReport,
    getReportEligibility,
    isValidReportProperty,
    suggestComparablesByProposalPrice,
    type ReportConfig
  } from "$lib/reports";

  const ctx = getCollectionsContext();

  let config = $state<ReportConfig>(createDefaultReportConfig());
  let initializedReferenceId = $state<string | null>(null);
  let copyState = $state<"idle" | "copied" | "error">("idle");

  const selectedListingId = $derived(page.url.searchParams.get("listing"));
  const sortedListings = $derived(sortSelectableListings(ctx.listings));
  const reference = $derived(
    sortedListings.find((listing) => listing.id === selectedListingId) ?? sortedListings[0] ?? null
  );
  const eligibility = $derived(reference ? getReportEligibility(reference) : null);
  const validReference = $derived(reference && isValidReportProperty(reference) ? reference : null);
  const currentResult = $derived(
    reference ? generateFirstProposalReport({ reference, listings: ctx.listings, config }) : null
  );
  const currentReport = $derived(currentResult?.ok ? currentResult.report : null);

  $effect(() => {
    const referenceId = reference?.id ?? null;
    if (referenceId === initializedReferenceId) return;

    initializedReferenceId = referenceId;

    if (!reference || !isValidReportProperty(reference)) {
      config = createDefaultReportConfig();
      return;
    }

    const nextConfig = createDefaultReportConfig();
    const target = calculateProposalTarget(
      reference,
      nextConfig.marginPercent,
      nextConfig.proposalOverride
    );
    const suggestedIds = suggestComparablesByProposalPrice(reference, ctx.listings, target, 4).map(
      (candidate) => candidate.listing.id
    );
    config = createDefaultReportConfig(suggestedIds);
  });

  function handleConfigChange(next: ReportConfig) {
    config = next;
  }

  async function copyReport() {
    if (!currentReport?.text.trim()) return;
    try {
      await navigator.clipboard.writeText(currentReport.text);
      copyState = "copied";
      window.setTimeout(() => {
        if (copyState === "copied") copyState = "idle";
      }, 2000);
    } catch {
      copyState = "error";
    }
  }

  function eligibilityMessage(reason: string): string {
    if (reason === "not-house") return "Este relatório está disponível somente para casas.";
    if (reason === "strikethrough") return "O imóvel de referência está riscado na coleção.";
    if (reason === "missing-price") return "Informe o preço pedido do imóvel.";
    if (reason === "missing-land-area") return "Informe a área do terreno.";
    if (reason === "missing-construction-area") return "Informe a área construída.";
    return "Os dados do imóvel estão incompletos.";
  }

  function formatPercent(value: number): string {
    return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value)}%`;
  }
</script>

<WorkspaceListingQuerySync />

{#if validReference}
  <WorkspaceRightSidebarContent title="Configurar proposta">
    <FirstProposalSettings
      reference={validReference}
      listings={ctx.listings}
      {config}
      getListingTitle={ctx.getPropertyListDisplayTitle}
      onChange={handleConfigChange}
    />
  </WorkspaceRightSidebarContent>
{/if}

{#if ctx.isLoadingListings}
  <WorkspaceLoadingState />
{:else}
  <main class="mx-auto w-full max-w-[1680px] space-y-2 p-2 text-app-fg sm:space-y-3 sm:p-3">
    <WorkspacePanel class="overflow-hidden">
      <div class="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="inline-flex size-8 items-center justify-center rounded-md bg-app-action/10 text-app-action">
              <FileText class="size-4" />
            </span>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wide text-app-muted">Relatórios</p>
              <h1 class="text-lg font-semibold">Primeira Proposta</h1>
            </div>
          </div>
          <p class="mt-1 max-w-2xl text-sm leading-relaxed text-app-muted">
            Carta objetiva baseada nos preços anunciados e nas características dos imóveis selecionados.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" disabled={!currentReport} onclick={() => void copyReport()}>
            {#if copyState === "copied"}<Check class="size-4" />{:else}<Copy class="size-4" />{/if}
            {copyState === "copied" ? "Copiado" : copyState === "error" ? "Falha ao copiar" : "Copiar texto"}
          </Button>
        </div>
      </div>
    </WorkspacePanel>

    {#if !ctx.activeCollection}
      <WorkspacePanel class="p-6 text-center">
        <p class="text-sm text-app-muted">Crie ou selecione uma coleção para começar.</p>
      </WorkspacePanel>
    {:else if ctx.listings.length === 0}
      <WorkspacePanel class="p-6 text-center">
        <p class="text-sm text-app-muted">Adicione imóveis à coleção para criar uma proposta.</p>
      </WorkspacePanel>
    {:else if !reference}
      <WorkspacePanel class="p-6 text-center">
        <p class="text-sm text-app-muted">Selecione o imóvel de referência na barra superior.</p>
      </WorkspacePanel>
    {:else if !validReference}
      <WorkspacePanel class="p-5">
        <div class="flex items-start gap-3">
          <AlertTriangle class="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <h2 class="text-sm font-semibold">Não é possível gerar este relatório</h2>
            <ul class="mt-2 space-y-1 text-sm text-app-muted">
              {#each eligibility?.reasons ?? [] as reason (reason)}
                <li>• {eligibilityMessage(reason)}</li>
              {/each}
            </ul>
          </div>
        </div>
      </WorkspacePanel>
    {:else}
      <div class="proposal-split">
        <div class="proposal-split__left min-w-0 space-y-2">
          <WorkspacePanel class="overflow-hidden">
            <div class="space-y-3 p-3">
              <div class="min-w-0">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-app-muted">Imóvel de referência</p>
                <h2 class="mt-1 truncate text-base font-semibold">{ctx.getPropertyListDisplayTitle(validReference)}</h2>
                <p class="mt-1 truncate text-sm text-app-muted">{validReference.address}</p>
                <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-app-muted">
                  <span>{validReference.totalAreaM2} m² de terreno</span>
                  <span>{validReference.privateAreaM2} m² construídos</span>
                  <span>{validReference.bedrooms ?? "—"} quartos</span>
                  <span>{validReference.parkingSpots ?? "—"} vagas</span>
                </div>
              </div>
              <div class="rounded-md border border-app-border bg-app-bg p-3">
                <p class="text-[11px] font-medium text-app-muted">Preço pedido</p>
                <p class="mt-1 text-lg font-semibold">{formatExactCurrency(validReference.price)}</p>
                <p class="mt-1 text-xs text-app-muted">
                  {formatPricePerM2(validReference.price / validReference.privateAreaM2)} construído
                </p>
              </div>
            </div>
          </WorkspacePanel>

          {#if currentReport}
            <div class="proposal-split__cards">
              <WorkspacePanel class="p-3">
                <p class="text-[11px] font-medium text-app-muted">Faixa pelo R$/m²</p>
                <p class="mt-1 text-sm font-semibold">
                  {formatCurrency(currentReport.calculation.equivalentRange.min)}–{formatCurrency(currentReport.calculation.equivalentRange.max)}
                </p>
              </WorkspacePanel>
              <WorkspacePanel class="p-3">
                <p class="text-[11px] font-medium text-app-muted">Preço pelo R$/m²</p>
                <p class="mt-1 text-sm font-semibold">{formatCurrency(currentReport.calculation.centralValue)}</p>
              </WorkspacePanel>
              <WorkspacePanel class="p-3">
                <p class="text-[11px] font-medium text-app-muted">Proposta calculada</p>
                <p class="mt-1 text-sm font-semibold">{formatCurrency(currentReport.calculation.calculatedProposal)}</p>
                <p class="mt-0.5 text-[10px] text-app-muted">Margem {formatPercent(currentReport.calculation.marginPercent)}</p>
              </WorkspacePanel>
              <WorkspacePanel class="p-3">
                <p class="text-[11px] font-medium text-app-muted">Proposta usada na carta</p>
                <p class="mt-1 text-sm font-semibold">{formatCurrency(currentReport.calculation.proposalUsed)}</p>
                {#if currentReport.calculation.proposalOverride !== null}
                  <p class="mt-0.5 text-[10px] text-app-muted">Valor manual</p>
                {/if}
              </WorkspacePanel>
            </div>
          {:else if currentResult && !currentResult.ok}
            <WorkspacePanel class="border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <p class="text-sm font-medium text-amber-950 dark:text-amber-100">Complete a configuração</p>
              <ul class="mt-1 space-y-1 text-xs text-amber-900 dark:text-amber-200">
                {#each currentResult.errors as error (error)}<li>• {error}</li>{/each}
              </ul>
            </WorkspacePanel>
          {/if}

        </div>

        <div class="proposal-split__right min-w-0">
          <WorkspacePanel class="overflow-hidden">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-app-border px-4 py-2.5">
              <div>
                <h2 class="text-sm font-semibold">Carta de proposta</h2>
                <p class="mt-0.5 text-xs text-app-muted">Resultado atualizado pelos controles da configuração.</p>
              </div>
            </div>
            {#if currentReport}
              <article class="min-h-[min(78vh,960px)] space-y-5 bg-app-surface px-5 py-5 text-sm leading-7 text-app-fg">
                {#each currentReport.blocks.filter((block) => block.enabled && block.text.trim()) as block (block.id)}
                  <p class="whitespace-pre-wrap break-words">{#each createReportPreviewSegments(block.text) as segment}{#if segment.href}<a
                    href={segment.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-app-action underline decoration-app-action/40 underline-offset-2 hover:decoration-app-action"
                  >{segment.text}</a>{:else}{segment.text}{/if}{/each}</p>
                {/each}
              </article>
            {:else}
              <div class="grid min-h-[min(60vh,720px)] place-items-center p-8 text-center">
                <div class="max-w-sm">
                  <FileText class="mx-auto size-8 text-app-subtle" />
                  <p class="mt-3 text-sm font-medium">Complete a configuração</p>
                  <p class="mt-1 text-xs leading-relaxed text-app-muted">
                    Ao selecionar comparáveis válidos, o texto será montado e atualizado automaticamente.
                  </p>
                </div>
              </div>
            {/if}
          </WorkspacePanel>
        </div>
      </div>

      <p class="px-1 pb-2 text-[11px] leading-relaxed text-app-muted">
        Os cálculos usam preços anunciados da coleção. Não representam preço de venda, avaliação técnica ou valor de mercado.
      </p>
    {/if}
  </main>
{/if}

<style>
  .proposal-split {
    display: grid;
    grid-template-columns: minmax(240px, 0.9fr) minmax(0, 1.35fr);
    align-items: start;
    gap: 0.75rem;
  }

  .proposal-split__right {
    position: sticky;
    top: 0.5rem;
  }

  .proposal-split__cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }

  @media (max-width: 700px) {
    .proposal-split {
      grid-template-columns: 1fr;
    }

    .proposal-split__right {
      position: static;
    }
  }
</style>
