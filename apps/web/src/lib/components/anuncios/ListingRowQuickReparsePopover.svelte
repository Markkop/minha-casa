<script lang="ts">
  import { Loader2, RefreshCw } from "@lucide/svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import AnchoredPopover from "$lib/components/ui/AnchoredPopover.svelte";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import type { ListingRowInteractions } from "$lib/components/anuncios/listing-row-interactions.svelte";

  let {
    interactions,
    actionMutedClass,
    actionIconClass,
    inputClass,
    onClose
  }: {
    interactions: ListingRowInteractions;
    actionMutedClass: string;
    actionIconClass: string;
    inputClass: string;
    onClose: () => void;
  } = $props();
</script>

<AnchoredPopover
  bind:open={interactions.quickReparsePopoverOpen}
  align="auto"
  panelClass="w-64 p-3"
  {onClose}
>
  {#snippet trigger()}
    <FloatingTooltip
      label="Reparse rápido com IA"
      side="bottom"
      disabled={interactions.quickReparsePopoverOpen}
    >
      <button
        type="button"
        class={actionMutedClass}
        onclick={() => interactions.openQuickReparsePopover()}
      >
        <RefreshCw class={actionIconClass} />
      </button>
    </FloatingTooltip>
  {/snippet}
  <div class="space-y-3">
    <p class="text-sm font-medium text-app-muted">Cole o texto do anúncio</p>
    <Input
      bind:value={interactions.quickReparseInput}
      placeholder="Cole aqui o texto completo..."
      disabled={interactions.quickReparseLoading}
      class={inputClass}
      oninput={() => (interactions.quickReparseError = null)}
      onkeydown={(event: KeyboardEvent) => {
        if (
          event.key === "Enter" &&
          interactions.quickReparseInput.trim() &&
          !interactions.quickReparseLoading
        ) {
          void interactions.runQuickReparse();
        }
      }}
    />
    {#if interactions.quickReparseError}
      <p class="text-xs text-destructive">{interactions.quickReparseError}</p>
    {/if}
    {#if interactions.quickReparseLoading}
      <p class="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 class="h-3 w-3 animate-spin" />
        Processando...
      </p>
    {/if}
    <div class="flex gap-2">
      <button
        type="button"
        onclick={onClose}
        disabled={interactions.quickReparseLoading}
        class="flex-1 rounded border border-app-border bg-app-surface-muted px-3 py-1.5 text-sm text-app-fg transition-colors hover:border-app-action hover:text-app-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        Cancelar
      </button>
      <button
        type="button"
        onclick={() => void interactions.runQuickReparse()}
        disabled={!interactions.quickReparseInput.trim() || interactions.quickReparseLoading}
        class="flex-1 rounded bg-app-action px-3 py-1.5 text-sm text-app-action-foreground transition-colors hover:bg-app-action-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {interactions.quickReparseLoading ? "Processando..." : "Processar"}
      </button>
    </div>
  </div>
</AnchoredPopover>
