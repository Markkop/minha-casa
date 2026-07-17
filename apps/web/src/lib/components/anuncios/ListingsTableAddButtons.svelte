<script lang="ts">
  import { ClipboardPaste, Link } from "@lucide/svelte";
  import { shouldPulseClipboardButton } from "$lib/anuncios/clipboard-auto-detect-policy";
  import PageToolbarIconButton from "$lib/components/page-toolbar/PageToolbarIconButton.svelte";
  import ClipboardEmptyDialog from "$lib/components/anuncios/ClipboardEmptyDialog.svelte";
  import type { createListingsTablePendingAdd } from "$lib/components/anuncios/listings-table-pending-add.svelte";
  import { cn } from "$lib/utils";

  type PendingAddState = ReturnType<typeof createListingsTablePendingAdd>;

  let {
    pendingAdd,
    large = false
  }: {
    pendingAdd: PendingAddState;
    large?: boolean;
  } = $props();

  const clipboardMatch = $derived(pendingAdd.clipboardAutoDetect.match);
  const shouldPulse = $derived(
    shouldPulseClipboardButton({
      hasAnyListings: pendingAdd.hasAnyListings,
      hasMatch: Boolean(clipboardMatch)
    })
  );
  let previewOpen = $state(false);
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
  <div
    class="relative"
    role="group"
    aria-label="Adicionar usando a área de transferência"
    onmouseenter={() => {
      if (clipboardMatch) previewOpen = true;
    }}
    onmouseleave={() => {
      previewOpen = false;
    }}
  >
    <PageToolbarIconButton
      variant="secondary"
      onclick={() => void handlePasteFromClipboard()}
      disabled={pendingAdd.isSubmittingAdd || isReadingClipboard}
      aria-label="Adicionar da área de transferência"
      title="Adicionar da área de transferência"
      tooltipDisabled={Boolean(clipboardMatch && previewOpen)}
      class={cn(
        large ? "h-9 w-9" : undefined,
        shouldPulse && "animate-clipboard-glow"
      )}
    >
      <ClipboardPaste />
    </PageToolbarIconButton>

    {#if clipboardMatch && previewOpen}
      <div
        class="absolute left-0 top-full z-[1400] mt-2 w-72 rounded-lg border border-app-border bg-app-surface p-3 shadow-lg"
        role="tooltip"
      >
        <div class="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-app-muted">
          {#if clipboardMatch.kind === "url"}
            <Link class="h-3 w-3 shrink-0" />
            <span>Link detectado</span>
          {:else}
            <ClipboardPaste class="h-3 w-3 shrink-0" />
            <span>Texto detectado</span>
          {/if}
        </div>
        <p class="line-clamp-3 break-all text-xs leading-relaxed text-app-fg">
          {clipboardMatch.preview}
        </p>
        <p class="mt-2 text-[10px] text-app-muted">Clique para adicionar</p>
      </div>
    {/if}
  </div>

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
