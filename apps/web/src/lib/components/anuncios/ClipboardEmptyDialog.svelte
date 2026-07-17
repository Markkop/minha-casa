<script lang="ts">
  import {
    ClipboardPaste,
    ClipboardX,
    Info,
    RefreshCw,
    ShieldAlert,
    SlidersHorizontal,
    ToggleRight
  } from "@lucide/svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import ModalCloseButton from "$lib/components/anuncios/ModalCloseButton.svelte";
  import {
    clipboardRestoreInstructions,
    type ClipboardReadFailureKind,
    type ClipboardRestoreStepIcon
  } from "$lib/anuncios/clipboard-errors";

  const stepIcons: Record<ClipboardRestoreStepIcon, typeof SlidersHorizontal> = {
    sliders: SlidersHorizontal,
    info: Info,
    "clipboard-off": ClipboardX,
    toggle: ToggleRight,
    reload: RefreshCw,
    paste: ClipboardPaste
  };

  let {
    isOpen,
    variant = "empty",
    busy = false,
    error = null,
    failureKind = null,
    onClose,
    onRetry
  } = $props<{
    isOpen: boolean;
    variant?: "empty" | "denied";
    busy?: boolean;
    error?: string | null;
    failureKind?: ClipboardReadFailureKind | null;
    onClose: () => void;
    onRetry: () => void | Promise<void>;
  }>();

  const title = $derived(
    variant === "denied"
      ? "Acesso à área de transferência bloqueado"
      : "Copie um anúncio primeiro"
  );

  const description = $derived(
    variant === "denied"
      ? ""
      : "Copie o link ou o conteúdo do anúncio e volte aqui para colar."
  );

  const instructions = $derived(
    failureKind ? clipboardRestoreInstructions(failureKind) : []
  );

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== "Escape" || busy) return;
    event.preventDefault();
    onClose();
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-[1500] flex items-center justify-center p-4">
    <button
      type="button"
      class="absolute inset-0 bg-app-fg/70 backdrop-blur-sm"
      aria-label="Fechar instruções para colar"
      disabled={busy}
      onclick={onClose}
    ></button>

    <Card
      class="relative z-10 w-full max-w-md overflow-hidden border-app-border bg-app-surface shadow-xl"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clipboard-dialog-title"
        tabindex="-1"
        onkeydown={handleKeyDown}
      >
        <header class="flex items-start justify-between gap-3 border-b border-app-border px-4 py-4">
          <div class="flex min-w-0 items-center gap-2">
            {#if variant === "denied"}
              <ShieldAlert class="h-5 w-5 shrink-0 text-destructive" />
            {:else}
              <ClipboardPaste class="h-5 w-5 shrink-0 text-app-action-foreground" />
            {/if}
            <div class="min-w-0">
              <h2 id="clipboard-dialog-title" class="text-base font-semibold text-app-fg">
                {title}
              </h2>
              {#if description}
                <p class="mt-1 text-sm leading-relaxed text-app-muted">
                  {description}
                </p>
              {/if}
            </div>
          </div>
          <ModalCloseButton onclick={onClose} class={busy ? "pointer-events-none opacity-50" : ""} />
        </header>

        <div class="space-y-4 px-4 py-4">
          {#if error && variant !== "denied"}
            <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          {/if}

          {#if variant === "denied" && instructions.length > 0}
            <ol class="space-y-3 text-sm leading-relaxed text-app-fg">
              {#each instructions as step, index (index)}
                <li class="flex items-start gap-3">
                  <span
                    class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-surface-muted text-xs font-semibold text-app-muted"
                  >
                    {index + 1}
                  </span>
                  <span class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 pt-1">
                    {#each step.segments as segment, segmentIndex (segmentIndex)}
                      {#if segment.type === "text"}
                        <span>{segment.value}</span>
                      {:else}
                        {@const StepIcon = stepIcons[segment.icon]}
                        <StepIcon
                          class="inline-block h-4 w-4 shrink-0 align-middle text-app-muted"
                          aria-hidden="true"
                        />
                      {/if}
                    {/each}
                  </span>
                </li>
              {/each}
            </ol>
          {/if}

          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="rounded-lg border border-app-border bg-app-surface px-4 py-2.5 text-sm font-medium text-app-fg transition-colors hover:bg-app-surface-muted disabled:opacity-50"
              disabled={busy}
              onclick={onClose}
            >
              Entendi
            </button>
            <button
              type="button"
              class="flex items-center justify-center gap-2 rounded-lg bg-app-action px-4 py-2.5 text-sm font-medium text-app-action-foreground transition-colors hover:bg-app-action-hover disabled:opacity-50"
              disabled={busy}
              onclick={() => void onRetry()}
            >
              <RefreshCw class={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              {busy ? "Tentando..." : "Tentar de novo"}
            </button>
          </div>
        </div>
      </div>
    </Card>
  </div>
{/if}
