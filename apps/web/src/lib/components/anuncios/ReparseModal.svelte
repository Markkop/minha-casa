<script lang="ts">
  import { Check, Loader2, Sparkles } from "@lucide/svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import ModalCloseButton from "$lib/components/anuncios/ModalCloseButton.svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import type { ListingData } from "$lib/workspace/client";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { cn } from "$lib/utils";
  import type { FieldChange } from "$lib/components/anuncios/QuickReparseModal.svelte";

  const FIELD_LABELS: Record<string, string> = {
    titulo: "Título",
    endereco: "Endereço",
    m2Totais: "m² Totais",
    m2Privado: "m² Privado",
    quartos: "Quartos",
    suites: "Suítes",
    banheiros: "Banheiros",
    garagem: "Garagem",
    preco: "Preço",
    piscina: "Piscina",
    porteiro24h: "Porteiro 24h",
    academia: "Academia",
    vistaLivre: "Vista Livre",
    piscinaTermica: "Piscina Térmica"
  };

  const COMPARABLE_FIELDS = [
    "titulo",
    "endereco",
    "m2Totais",
    "m2Privado",
    "quartos",
    "suites",
    "banheiros",
    "garagem",
    "preco",
    "piscina",
    "porteiro24h",
    "academia",
    "vistaLivre",
    "piscinaTermica"
  ] as const satisfies readonly (keyof Imovel & keyof ListingData)[];

  let {
    isOpen,
    onClose,
    currentData,
    onApplyChanges,
    hasApiKey: _hasApiKey = true
  } = $props<{
    isOpen: boolean;
    onClose: () => void;
    currentData: Partial<Imovel>;
    onApplyChanges: (changes: Partial<Imovel>) => void;
    hasApiKey?: boolean;
  }>();

  const ctx = getCollectionsContext();

  let rawText = $state("");
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let changes = $state<FieldChange[]>([]);
  let phase = $state<"input" | "review">("input");

  $effect(() => {
    if (!isOpen) return;
    rawText = "";
    error = null;
    changes = [];
    phase = "input";
  });

  function formatValue(value: FieldChange["currentValue"]) {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (typeof value === "number" && value >= 10000) {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0
      }).format(value);
    }
    return String(value);
  }

  function valuesAreDifferent(
    current: FieldChange["currentValue"],
    newVal: FieldChange["currentValue"]
  ) {
    if ((current === null || current === undefined) && (newVal === null || newVal === undefined)) {
      return false;
    }
    return current !== newVal;
  }

  async function handleParse() {
    if (!rawText.trim()) {
      error = "Cole o texto do anúncio para processar";
      return;
    }
    isLoading = true;
    error = null;
    try {
      const parsedList = await ctx.parseListingInput({ kind: "text", rawText });
      const parsed = parsedList[0];
      if (!parsed) throw new Error("Nenhum imóvel encontrado no conteúdo");

      const detectedChanges: FieldChange[] = [];
      for (const field of COMPARABLE_FIELDS) {
        const currentValue = currentData[field] as FieldChange["currentValue"];
        const newValue = parsed[field] as FieldChange["currentValue"];
        if (valuesAreDifferent(currentValue, newValue)) {
          detectedChanges.push({
            field,
            label: FIELD_LABELS[field] || field,
            currentValue,
            newValue,
            selected: true
          });
        }
      }
      if (detectedChanges.length === 0) {
        error = "Nenhuma alteração detectada. Os dados são idênticos.";
        return;
      }
      changes = detectedChanges;
      phase = "review";
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao processar anúncio";
    } finally {
      isLoading = false;
    }
  }

  function applySelectedChanges() {
    const selected = changes.filter((change) => change.selected);
    if (selected.length === 0) {
      onClose();
      return;
    }
    const updates: Partial<Imovel> = {};
    for (const change of selected) {
      (updates as Record<string, unknown>)[change.field] = change.newValue;
    }
    onApplyChanges(updates);
    onClose();
  }

  const selectedCount = $derived(changes.filter((change) => change.selected).length);
  const allSelected = $derived(selectedCount === changes.length && changes.length > 0);
</script>

{#if isOpen}
  <div class="fixed inset-0 z-[1100] flex items-center justify-center">
    <button type="button" class="absolute inset-0 bg-app-fg/80 backdrop-blur-sm" aria-label="Fechar" onclick={onClose}></button>
    <Card class="relative z-10 mx-4 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden border-app-border bg-app-surface">
      <div class="flex items-center justify-between border-b border-app-border px-4 py-3">
        <h2 class="flex items-center gap-2 text-lg font-semibold">
          <Sparkles class="h-5 w-5 text-app-accent" />
          Reparse com IA
        </h2>
        <ModalCloseButton onclick={onClose} />
      </div>
      <div class="flex-1 space-y-4 overflow-y-auto p-4">
        {#if phase === "input"}
          <div class="space-y-2">
            <label for="reparse-text" class="text-sm text-app-muted">Cole o texto do anúncio atualizado:</label>
            <textarea
              id="reparse-text"
              bind:value={rawText}
              placeholder="Cole aqui o texto completo do anúncio..."
              disabled={isLoading}
              class="min-h-[200px] w-full resize-none rounded-lg border border-app-border bg-input/30 px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            ></textarea>
          </div>
          {#if error}
            <div class="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <p class="text-sm text-destructive">{error}</p>
            </div>
          {/if}
          <button
            type="button"
            onclick={() => void handleParse()}
            disabled={isLoading || !rawText.trim()}
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-app-action px-4 py-3 font-medium text-app-action-foreground hover:bg-app-action-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {#if isLoading}
              <Loader2 class="h-4 w-4 animate-spin" />
              Processando...
            {:else}
              <Sparkles class="h-4 w-4" />
              Extrair Dados
            {/if}
          </button>
          <button
            type="button"
            onclick={onClose}
            class="w-full rounded-lg border border-app-border bg-app-surface-muted px-4 py-2.5 font-medium text-app-fg hover:border-app-action hover:text-app-accent"
          >
            Cancelar
          </button>
        {:else}
          <div class="flex items-center justify-between">
            <p class="text-sm text-app-muted">{changes.length} alteração(ões) detectada(s)</p>
            <div class="flex gap-2 text-xs">
              <button type="button" class="text-app-accent hover:underline" onclick={() => (changes = changes.map((c) => ({ ...c, selected: true })))}>
                Selecionar todos
              </button>
              <span class="text-muted-foreground">|</span>
              <button type="button" class="text-app-accent hover:underline" onclick={() => (changes = changes.map((c) => ({ ...c, selected: false })))}>
                Desmarcar todos
              </button>
            </div>
          </div>
          <div class="max-h-[300px] space-y-2 overflow-y-auto">
            {#each changes as change, index (change.field)}
              <button
                type="button"
                onclick={() => (changes[index] = { ...change, selected: !change.selected })}
                class={cn(
                  "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all",
                  change.selected ? "border-app-action/30 bg-app-action/10" : "border-app-border bg-app-surface-muted"
                )}
              >
                <span class={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border", change.selected ? "border-app-action bg-app-action text-white" : "border-app-border")}>
                  {#if change.selected}<Check class="h-3 w-3" />{/if}
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block text-sm font-medium">{change.label}</span>
                  <span class="mt-1 flex items-center gap-2 text-xs">
                    <span class="text-muted-foreground line-through">{formatValue(change.currentValue)}</span>
                    <span class="text-muted-foreground">→</span>
                    <span class="font-medium text-app-fg">{formatValue(change.newValue)}</span>
                  </span>
                </span>
              </button>
            {/each}
          </div>
          <div class="flex gap-3 border-t border-app-border pt-4">
            <button type="button" onclick={onClose} class="flex-1 rounded-lg border border-app-border bg-app-surface-muted px-4 py-2.5 font-medium hover:border-app-action hover:text-app-accent">
              Cancelar
            </button>
            <button
              type="button"
              onclick={applySelectedChanges}
              disabled={selectedCount === 0}
              class={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium disabled:cursor-not-allowed disabled:opacity-50",
                allSelected ? "bg-app-action text-app-action-foreground hover:bg-app-action-hover" : "border border-app-border bg-app-surface-muted"
              )}
            >
              {allSelected ? "Aplicar Todos" : `Aplicar (${selectedCount})`}
            </button>
          </div>
        {/if}
      </div>
    </Card>
  </div>
{/if}
