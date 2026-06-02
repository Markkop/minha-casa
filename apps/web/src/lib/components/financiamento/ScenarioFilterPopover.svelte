<script lang="ts" generics="T extends string | number">
  import type { Component } from "svelte";
  import PageToolbarButton from "$lib/components/page-toolbar/PageToolbarButton.svelte";
  import ToolbarAnchoredPopover from "$lib/components/anuncios/ToolbarAnchoredPopover.svelte";
  import type { ScenarioFilterOption } from "$lib/components/financiamento/scenario-filter-shared";
  import { cn } from "$lib/utils";

  let {
    icon,
    buttonLabel,
    ariaLabel,
    headerText,
    options,
    selected,
    onToggle,
    disabled = false,
    panelClass = "w-56 p-2"
  }: {
    icon: Component<{ class?: string }>;
    buttonLabel: string;
    ariaLabel: string;
    headerText: string;
    options: ScenarioFilterOption<T>[];
    selected: T[];
    onToggle: (value: T) => void;
    disabled?: boolean;
    panelClass?: string;
  } = $props();

  let open = $state(false);

  const Icon = $derived(icon);
</script>

<ToolbarAnchoredPopover bind:open align="auto" {panelClass}>
  {#snippet trigger()}
    <PageToolbarButton
      variant="secondary"
      class="h-7 shrink-0 rounded-full px-2"
      aria-label={ariaLabel}
      {disabled}
      tooltipDisabled
      onclick={() => (open = !open)}
    >
      <Icon />
      <span>{buttonLabel}</span>
    </PageToolbarButton>
  {/snippet}

  <p class="px-2 pb-1.5 text-[11px] leading-snug text-app-subtle">{headerText}</p>
  <div class="flex flex-col gap-0.5">
    {#each options as option (option.value)}
      {@const checked = selected.includes(option.value)}
      {@const isLast = selected.length === 1 && checked}
      <label
        class={cn(
          "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-app-muted transition-colors hover:bg-app-surface-muted hover:text-app-fg",
          isLast && "cursor-not-allowed opacity-50"
        )}
      >
        <input
          type="checkbox"
          {checked}
          disabled={isLast}
          onchange={() => onToggle(option.value)}
          class="h-3.5 w-3.5 accent-app-action disabled:cursor-not-allowed"
        />
        <span class="min-w-0 leading-snug">
          {option.label}
          {#if option.hint}
            <span class="text-xs text-app-subtle">{option.hint}</span>
          {/if}
        </span>
      </label>
    {/each}
  </div>
</ToolbarAnchoredPopover>
