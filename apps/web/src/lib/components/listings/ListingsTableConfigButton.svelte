<script lang="ts">
  import { Settings, X } from "@lucide/svelte";
  import PageToolbarIconButton from "$lib/components/page-toolbar/PageToolbarIconButton.svelte";
  import ToolbarAnchoredPopover from "$lib/components/listings/ToolbarAnchoredPopover.svelte";
  import Switch from "$lib/components/ui/Switch.svelte";
  import type { ClipboardAutoDetectState } from "$lib/listings/clipboard-auto-detect.svelte";

  let {
    clipboardAutoDetect
  }: {
    clipboardAutoDetect: ClipboardAutoDetectState;
  } = $props();

  let configOpen = $state(false);
</script>

<div class="relative shrink-0">
  <ToolbarAnchoredPopover bind:open={configOpen} align="end" panelClass="w-72 p-3">
    {#snippet trigger()}
      <PageToolbarIconButton
        variant="secondary"
        aria-label="Configurações da lista"
        title="Configurações da lista"
        tooltipDisabled={configOpen}
        onclick={() => (configOpen = !configOpen)}
      >
        <Settings />
      </PageToolbarIconButton>
    {/snippet}

    <div class="space-y-3">
      <p class="text-xs font-medium text-app-fg">Configurações</p>
      <label class="flex cursor-pointer items-start justify-between gap-3">
        <span class="text-xs leading-snug text-app-muted">
          Detectar automaticamente após o primeiro uso
        </span>
        <Switch
          checked={clipboardAutoDetect.enabled}
          aria-label="Detectar área de transferência automaticamente após o primeiro uso"
          onCheckedChange={(checked) => clipboardAutoDetect.setEnabled(checked)}
        />
      </label>
    </div>
  </ToolbarAnchoredPopover>

  {#if clipboardAutoDetect.coachMarkVisible}
    <div
      class="absolute right-0 top-full z-[1400] mt-2 w-64 rounded-lg border border-app-border bg-app-surface p-3 shadow-lg"
      role="status"
    >
      <div class="flex items-start gap-2">
        <p class="flex-1 text-xs leading-relaxed text-app-fg">
          Detecção automática desativada. Você pode reativá-la aqui.
        </p>
        <button
          type="button"
          class="shrink-0 rounded p-0.5 text-app-muted transition-colors hover:bg-app-surface-muted hover:text-app-fg"
          aria-label="Fechar dica"
          onclick={() => clipboardAutoDetect.dismissCoachMark()}
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  {/if}
</div>
