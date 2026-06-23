<script lang="ts">
  import { Check, ChevronDown, ChevronRight, Copy } from "@lucide/svelte";
  import type { Snippet } from "svelte";

  let {
    title,
    empty = false,
    emptyMessage = "Nenhum cenário visível para exibir o gráfico.",
    copyText,
    copyLabel,
    copyDisabled = false,
    children
  }: {
    title: string;
    empty?: boolean;
    emptyMessage?: string;
    copyText?: string;
    copyLabel?: string;
    copyDisabled?: boolean;
    children: Snippet;
  } = $props();

  let expanded = $state(true);
  let copyState = $state<"idle" | "copied" | "error">("idle");
  let copyStateTimer: ReturnType<typeof setTimeout> | null = null;

  const resolvedCopyLabel = $derived(copyLabel ?? `Copiar detalhamento de ${title}`);
  const copyButtonDisabled = $derived(copyDisabled || !copyText);

  function resetCopyStateSoon() {
    if (copyStateTimer) clearTimeout(copyStateTimer);
    copyStateTimer = setTimeout(() => {
      copyState = "idle";
      copyStateTimer = null;
    }, 1800);
  }

  async function copyBreakdown() {
    if (copyButtonDisabled || !copyText) return;

    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(copyText);
      copyState = "copied";
    } catch {
      copyState = "error";
    } finally {
      resetCopyStateSoon();
    }
  }
</script>

{#if empty}
  <p class="px-2 py-6 text-sm text-app-muted sm:px-3">
    {emptyMessage}
  </p>
{:else}
  <header
    class="flex items-center justify-between gap-2 border-b border-app-border px-2 py-2 sm:px-3"
  >
    <button
      type="button"
      class="min-w-0 flex-1 text-left"
      aria-expanded={expanded}
      onclick={() => (expanded = !expanded)}
    >
      <h3 class="text-sm font-medium text-app-fg">{title}</h3>
    </button>

    <div class="flex shrink-0 items-center gap-1">
      {#if copyText !== undefined}
        <button
          type="button"
          class="inline-flex size-7 items-center justify-center rounded text-app-muted transition hover:bg-app-surface-muted/60 hover:text-app-fg disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={resolvedCopyLabel}
          title={copyState === "copied"
            ? "Copiado"
            : copyState === "error"
              ? "Não foi possível copiar"
              : resolvedCopyLabel}
          disabled={copyButtonDisabled}
          onclick={copyBreakdown}
        >
          {#if copyState === "copied"}
            <Check class="size-4 text-green" aria-hidden="true" />
          {:else}
            <Copy class="size-4" aria-hidden="true" />
          {/if}
        </button>
      {/if}

      <button
        type="button"
        class="inline-flex size-7 items-center justify-center rounded text-app-muted transition hover:bg-app-surface-muted/60 hover:text-app-fg"
        aria-label={expanded ? `Recolher ${title}` : `Expandir ${title}`}
        aria-expanded={expanded}
        title={expanded ? "Recolher" : "Expandir"}
        onclick={() => (expanded = !expanded)}
      >
        {#if expanded}
          <ChevronDown class="size-4" aria-hidden="true" />
        {:else}
          <ChevronRight class="size-4" aria-hidden="true" />
        {/if}
      </button>
    </div>

    <span class="sr-only" aria-live="polite">
      {#if copyState === "copied"}
        Detalhamento copiado.
      {:else if copyState === "error"}
        Não foi possível copiar o detalhamento.
      {/if}
    </span>
  </header>

  {#if expanded}
    <div class="px-2 py-3 sm:px-3">
      {@render children()}
    </div>
  {/if}
{/if}
