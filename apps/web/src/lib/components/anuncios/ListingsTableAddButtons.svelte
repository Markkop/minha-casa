<script lang="ts">
  import { ClipboardPaste, Plus, X } from "@lucide/svelte";
  import PageToolbarIconButton from "$lib/components/page-toolbar/PageToolbarIconButton.svelte";
  import type { createListingsTablePendingAdd } from "$lib/components/anuncios/listings-table-pending-add.svelte";

  type PendingAddState = ReturnType<typeof createListingsTablePendingAdd>;

  let {
    pendingAdd,
    large = false
  }: {
    pendingAdd: PendingAddState;
    large?: boolean;
  } = $props();
</script>

<div class="flex shrink-0 flex-col items-start gap-0.5">
  <div class="flex items-center gap-1">
    <PageToolbarIconButton
      variant="secondary"
      onclick={() => void pendingAdd.addFromClipboard()}
      disabled={pendingAdd.isSubmittingAdd}
      aria-label="Adicionar da área de transferência"
      title="Adicionar da área de transferência"
      class={large ? "h-9 w-9" : undefined}
    >
      <ClipboardPaste />
    </PageToolbarIconButton>
    <PageToolbarIconButton
      variant="primary"
      onclick={pendingAdd.toggleAddInput}
      aria-label={pendingAdd.showAddInput ? "Fechar adição de imóvel" : "Adicionar imóvel"}
      title={pendingAdd.showAddInput ? "Fechar adição de imóvel" : "Adicionar imóvel"}
      class={large ? "h-9 w-9" : undefined}
    >
      {#if pendingAdd.showAddInput}<X />{:else}<Plus />{/if}
    </PageToolbarIconButton>
  </div>
  {#if pendingAdd.clipboardAddError}
    <p class="max-w-48 text-[10px] leading-tight text-destructive">{pendingAdd.clipboardAddError}</p>
  {/if}
</div>
