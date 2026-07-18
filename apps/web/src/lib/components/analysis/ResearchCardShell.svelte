<script lang="ts">
  import { Loader2, RefreshCw } from "@lucide/svelte";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import type { AnalysisStepStatus } from "$lib/property-analysis/step-status";
  import { truncateError } from "$lib/components/analysis/format-brl";
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  let {
    title,
    status,
    children,
    class: className = "",
    onRefresh,
    errorMessage
  }: {
    title: string;
    status: AnalysisStepStatus;
    children?: Snippet;
    class?: string;
    onRefresh?: () => void;
    errorMessage?: string;
  } = $props();

  const showSkeleton = $derived(status === "pending" || status === "waiting");
  const canRefresh = $derived(Boolean(onRefresh) && status !== "pending");
</script>

<WorkspacePanel class={cn("flex h-full flex-col p-4", className)}>
  <div class="mb-3 flex items-start justify-between gap-2">
    <div class="min-w-0 flex-1">
      <h3 class="text-sm font-semibold text-app-fg">{title}</h3>
      {#if status === "failed" && errorMessage}
        <p class="mt-1 text-xs text-destructive" title={errorMessage}>
          {truncateError(errorMessage)}
        </p>
      {/if}
    </div>
    <div class="flex shrink-0 items-center gap-1">
      {#if canRefresh && onRefresh}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="size-7 text-app-muted hover:text-app-fg"
          ariaLabel={`Reexecutar ${title}`}
          onclick={onRefresh}
        >
          <RefreshCw class="size-3.5" />
        </Button>
      {/if}
      {#if status === "pending"}
        <span class="inline-flex items-center gap-1 text-xs text-app-muted">
          <Loader2 class="size-3 animate-spin" />
          Processando…
        </span>
      {:else if status === "done"}
        <span class="text-xs font-medium text-emerald-700 dark:text-emerald-400">Pronto</span>
      {:else if status === "failed"}
        <span class="text-xs font-medium text-destructive">Falhou</span>
      {:else if status === "incomplete"}
        <span class="text-xs font-medium text-amber-700 dark:text-amber-400">Incompleto</span>
      {:else if status === "waiting"}
        <span class="text-xs text-app-muted">Aguardando…</span>
      {/if}
    </div>
  </div>
  {#if showSkeleton && !children}
    <div class="space-y-2">
      <div class="h-3 w-full animate-pulse rounded bg-app-surface-muted"></div>
      <div class="h-3 w-4/5 animate-pulse rounded bg-app-surface-muted"></div>
      <div class="h-3 w-2/3 animate-pulse rounded bg-app-surface-muted"></div>
    </div>
  {:else}
    {@render children?.()}
  {/if}
</WorkspacePanel>
