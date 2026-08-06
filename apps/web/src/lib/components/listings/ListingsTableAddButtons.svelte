<script lang="ts">
  import { ClipboardPaste } from "@lucide/svelte";
  import PageToolbarIconButton from "$lib/components/page-toolbar/PageToolbarIconButton.svelte";
  import ClipboardEmptyDialog from "$lib/components/listings/ClipboardEmptyDialog.svelte";
  import type { createListingsTablePendingAdd } from "$lib/components/listings/listings-table-pending-add.svelte";
  import { cn } from "$lib/utils";

  type PendingAddState = ReturnType<typeof createListingsTablePendingAdd>;

  let {
    pendingAdd,
    large = false
  }: {
    pendingAdd: PendingAddState;
    large?: boolean;
  } = $props();

  /** Reserved for future clipboard-hint UX; not triggered by anything yet. */
  const shouldPulse = false;
  let clipboardDialogOpen = $state(false);
  let clipboardDialogVariant = $state<"empty" | "denied">("empty");
  let isReadingClipboard = $state(false);

  async function handlePasteFromClipboard() {
    if (isReadingClipboard || pendingAdd.isSubmittingAdd) return;
    isReadingClipboard = true;
    try {
      const result = await pendingAdd.addFromClipboard();
      if (result === "empty") {
        clipboardDialogVariant = "empty";
        clipboardDialogOpen = true;
      } else if (result === "denied") {
        clipboardDialogVariant = "denied";
        clipboardDialogOpen = true;
      } else if (result === "submitted") {
        clipboardDialogOpen = false;
      }
    } finally {
      isReadingClipboard = false;
    }
  }
</script>

<div class="flex shrink-0 flex-col items-start gap-0.5">
  <PageToolbarIconButton
    variant="secondary"
    onclick={() => void handlePasteFromClipboard()}
    disabled={pendingAdd.isSubmittingAdd || isReadingClipboard}
    aria-label="Adicionar da área de transferência"
    title="Adicionar da área de transferência"
    class={cn(large ? "h-9 w-9" : undefined, shouldPulse && "animate-clipboard-glow")}
  >
    <ClipboardPaste />
  </PageToolbarIconButton>

  {#if pendingAdd.clipboardAddError}
    <p class="max-w-48 text-[10px] leading-tight text-destructive">{pendingAdd.clipboardAddError}</p>
  {/if}
</div>

<ClipboardEmptyDialog
  isOpen={clipboardDialogOpen}
  variant={clipboardDialogVariant}
  busy={isReadingClipboard || pendingAdd.isSubmittingAdd}
  error={pendingAdd.clipboardAddError}
  failureKind={pendingAdd.clipboardFailureKind}
  onClose={() => (clipboardDialogOpen = false)}
  onRetry={handlePasteFromClipboard}
/>
