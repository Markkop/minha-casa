<script lang="ts">
  import { Clipboard, Loader2, Upload, X } from "@lucide/svelte";
  import { cn } from "$lib/utils";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import type { createListingsTablePendingAdd } from "$lib/components/anuncios/listings-table-pending-add.svelte";

  type PendingAddState = ReturnType<typeof createListingsTablePendingAdd>;

  let { pendingAdd }: { pendingAdd: PendingAddState } = $props();
</script>

<div
  class={cn(
    "grid min-w-0 transition-[grid-template-columns,opacity,transform] duration-300 ease-out",
    pendingAdd.showAddInput
      ? "grid-cols-[1fr] translate-x-0 opacity-100"
      : "pointer-events-none grid-cols-[0fr] -translate-x-2 opacity-0"
  )}
  aria-hidden={!pendingAdd.showAddInput}
>
  <div class="min-w-0 overflow-hidden">
    <div class="relative min-w-0">
      <Clipboard class="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-accent" />
      <input
        bind:this={pendingAdd.addInputRef}
        type="text"
        aria-label="Adicionar anúncio por link, texto ou arquivo"
        value={pendingAdd.addFiles.length > 0 ? "" : pendingAdd.addInputValue}
        oninput={(event) => {
          if (pendingAdd.addFiles.length > 0) return;
          pendingAdd.addInputValue = event.currentTarget.value;
        }}
        onpaste={pendingAdd.handleInlinePaste}
        ondrop={pendingAdd.handleInlineDrop}
        ondragover={(event) => event.preventDefault()}
        onkeydown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void pendingAdd.submitInlineAdd();
          }
        }}
        placeholder="Cole link, texto ou arquivo aqui..."
        disabled={!pendingAdd.showAddInput || pendingAdd.isSubmittingAdd}
        readonly={pendingAdd.addFiles.length > 0}
        class="h-7 w-full rounded-md border border-app-border bg-app-surface py-0 pl-7 pr-20 text-xs text-app-fg placeholder:text-app-subtle"
      />
      {#if pendingAdd.addFiles.length > 0}
        <div class="pointer-events-none absolute left-7 right-20 top-1/2 flex -translate-y-1/2 items-center gap-1 overflow-hidden">
          {#each pendingAdd.addFiles as file, index (file.name + file.size + index)}
            <FloatingTooltip label={file.name} side="bottom" wrapperClass="pointer-events-auto inline-flex max-w-[7.5rem]">
              <span
                class="inline-flex max-w-full items-center gap-1 rounded-full border border-app-border bg-app-surface-muted px-1.5 py-0.5 text-[10px] leading-none text-app-fg"
              >
                <span class="truncate">{file.name}</span>
                <button
                  type="button"
                  onclick={() => pendingAdd.removeAddFile(index)}
                  class="shrink-0 rounded-full text-app-muted hover:text-destructive"
                  aria-label="Remover {file.name}"
                >
                  <X class="h-2.5 w-2.5" />
                </button>
              </span>
            </FloatingTooltip>
          {/each}
        </div>
      {/if}
      <input
        bind:this={pendingAdd.addFileInputRef}
        type="file"
        multiple
        class="hidden"
        onchange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          if (files.length > 0) pendingAdd.appendAddFiles(files);
        }}
      />
      <FloatingTooltip label="Selecionar arquivo" side="bottom" wrapperClass="absolute right-[3.85rem] top-1/2 block h-5 w-5 -translate-y-1/2">
        <button
          type="button"
          onclick={() => pendingAdd.addFileInputRef?.click()}
          disabled={!pendingAdd.showAddInput || pendingAdd.isSubmittingAdd}
          class="flex h-full w-full items-center justify-center rounded text-app-muted transition-colors hover:bg-app-surface-muted hover:text-app-fg disabled:opacity-50"
          aria-label="Selecionar arquivo"
        >
          <Upload class="h-3.5 w-3.5" />
        </button>
      </FloatingTooltip>
      <FloatingTooltip label="Enviar imóvel" side="bottom" wrapperClass="absolute right-1.5 top-1/2 block h-5 -translate-y-1/2">
        <button
          type="button"
          onclick={() => void pendingAdd.submitInlineAdd()}
          disabled={!pendingAdd.showAddInput || pendingAdd.isSubmittingAdd || (!pendingAdd.addInputValue.trim() && pendingAdd.addFiles.length === 0)}
          class="flex h-full items-center justify-center rounded bg-app-action px-2 text-[11px] font-medium leading-none text-app-action-foreground transition-colors hover:bg-app-action-hover disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Enviar imóvel"
        >
          {#if pendingAdd.isSubmittingAdd}
            <Loader2 class="h-3.5 w-3.5 animate-spin" />
          {:else}
            Enviar
          {/if}
        </button>
      </FloatingTooltip>
    </div>
  </div>
</div>
