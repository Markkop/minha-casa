<script lang="ts">
  import { Check, RefreshCw } from "@lucide/svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import ModalCloseButton from "$lib/components/anuncios/ModalCloseButton.svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import type { ListingData } from "$lib/workspace/client";
  import { cn } from "$lib/utils";

  export type FieldChange = {
    field: keyof Imovel & keyof ListingData;
    label: string;
    currentValue: string | number | boolean | null | undefined;
    newValue: string | number | boolean | null | undefined;
    selected: boolean;
  };

  let {
    isOpen,
    onClose,
    changes: initialChanges,
    onApplyChanges
  } = $props<{
    isOpen: boolean;
    onClose: () => void;
    changes: FieldChange[];
    onApplyChanges: (changes: Partial<Imovel>) => void | Promise<void>;
  }>();

  let changes = $state<FieldChange[]>([]);

  $effect(() => {
    changes = initialChanges.map((change: FieldChange) => ({ ...change }));
  });

  function formatValue(value: FieldChange["currentValue"]) {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (typeof value === "number" && value >= 10000) {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
    }
    return String(value);
  }

  const selectedCount = $derived(changes.filter((c) => c.selected).length);
</script>

{#if isOpen}
  <div class="fixed inset-0 z-[1100] flex items-center justify-center">
    <button type="button" class="absolute inset-0 bg-app-fg/80 backdrop-blur-sm" aria-label="Fechar" onclick={onClose}></button>
    <Card class="relative z-10 mx-4 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden border-app-border bg-app-surface">
      <div class="flex items-center justify-between border-b border-app-border px-4 py-3">
        <h2 class="flex items-center gap-2 text-lg font-semibold">
          <RefreshCw class="h-5 w-5 text-app-accent" />
          Comparar Alterações
        </h2>
        <ModalCloseButton onclick={onClose} />
      </div>
      <div class="flex-1 space-y-4 overflow-y-auto p-4">
        <p class="text-sm text-app-muted">{changes.length} alteração(ões) detectada(s)</p>
        <div class="max-h-[300px] space-y-2 overflow-y-auto">
          {#each changes as change, index}
            <button
              type="button"
              onclick={() => (changes[index] = { ...change, selected: !change.selected })}
              class={cn(
                "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all",
                change.selected ? "border-app-action/30 bg-app-action/10" : "border-app-border bg-app-surface-muted"
              )}
            >
              <span class={cn("mt-0.5 flex h-5 w-5 items-center justify-center rounded border", change.selected ? "border-app-action bg-app-action text-white" : "border-app-border")}>
                {#if change.selected}<Check class="h-3 w-3" />{/if}
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-medium">{change.label}</span>
                <span class="mt-1 grid gap-2 text-xs text-app-muted sm:grid-cols-[1fr_auto_1fr]">
                  <span class="truncate line-through">{formatValue(change.currentValue)}</span>
                  <span>→</span>
                  <span class="truncate font-medium text-app-fg">{formatValue(change.newValue)}</span>
                </span>
              </span>
            </button>
          {/each}
        </div>
      </div>
      <div class="flex gap-3 border-t border-app-border p-4">
        <button type="button" class="flex-1 rounded-lg border border-app-border py-2.5" onclick={onClose}>Cancelar</button>
        <button
          type="button"
          class="flex-1 rounded-lg bg-app-action py-2.5 font-medium text-app-action-foreground disabled:opacity-50"
          disabled={selectedCount === 0}
          onclick={() => {
            const updates = Object.fromEntries(
              changes.filter((c) => c.selected).map((c) => [c.field, c.newValue])
            ) as Partial<Imovel>;
            void onApplyChanges(updates);
          }}
        >
          Aplicar ({selectedCount})
        </button>
      </div>
    </Card>
  </div>
{/if}
