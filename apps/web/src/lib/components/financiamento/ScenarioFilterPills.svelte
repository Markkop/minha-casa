<script lang="ts" generics="T extends string | number">
  import { cn } from "$lib/utils";

  let {
    options,
    selected,
    onToggle,
    minSelected = 1,
    ariaLabel
  }: {
    options: { value: T; label: string }[];
    selected: T[];
    onToggle: (value: T) => void;
    minSelected?: number;
    ariaLabel: string;
  } = $props();
</script>

<div class="flex flex-wrap items-center gap-1" role="group" aria-label={ariaLabel}>
  {#each options as option (option.value)}
    {@const active = selected.includes(option.value)}
    {@const isLast = selected.length <= minSelected && active}
    <button
      type="button"
      aria-pressed={active}
      disabled={isLast}
      title={isLast ? "Mantenha pelo menos uma opção ativa" : undefined}
      class={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full border px-1.5 text-[10px] font-medium leading-none transition-colors",
        active
          ? "border-app-action bg-app-action/15 text-app-fg"
          : "border-app-border bg-app-surface text-app-subtle hover:border-app-border-strong hover:text-app-muted",
        isLast && "cursor-not-allowed opacity-60"
      )}
      onclick={() => onToggle(option.value)}
    >
      {option.label}
    </button>
  {/each}
</div>
