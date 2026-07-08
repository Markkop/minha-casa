<script lang="ts" generics="T extends string | number">
  import { cn } from "$lib/utils";

  let {
    options,
    selected,
    onToggle,
    ariaLabel,
    baseline,
    baselinePlacement = "first"
  }: {
    options: { value: T; label: string }[];
    selected: T[];
    onToggle: (value: T) => void;
    ariaLabel: string;
    baseline?: {
      value: T;
      label: string;
      selected: boolean;
      onToggle: () => void;
    };
    baselinePlacement?: "first" | "after-first";
  } = $props();

  function sameValue(a: T, b: T): boolean {
    return Object.is(a, b);
  }

  const renderedOptions = $derived.by(() => {
    if (!baseline) return options.map((option) => ({ ...option, baseline: false }));

    const withoutBaseline = options
      .filter((option) => !sameValue(option.value, baseline.value))
      .map((option) => ({ ...option, baseline: false }));
    const baselineOption = { value: baseline.value, label: baseline.label, baseline: true };

    if (baselinePlacement === "after-first" && withoutBaseline.length > 0) {
      return [withoutBaseline[0], baselineOption, ...withoutBaseline.slice(1)];
    }
    return [baselineOption, ...withoutBaseline];
  });

  const activeNonBaselineCount = $derived(
    baseline
      ? selected.filter((value) => !sameValue(value, baseline.value)).length
      : selected.length
  );
</script>

<div class="flex flex-wrap items-center gap-1" role="group" aria-label={ariaLabel}>
  {#each renderedOptions as option (`${option.baseline ? "baseline" : "option"}-${option.value}`)}
    {@const active = option.baseline
      ? (baseline?.selected ?? false) || activeNonBaselineCount === 0
      : selected.includes(option.value)}
    {@const disabled = option.baseline && active && activeNonBaselineCount === 0}
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      title={disabled ? "Selecione outra variação antes de remover o valor do slider" : undefined}
      class={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full border px-1.5 text-[10px] font-medium leading-none transition-colors",
        active
          ? "border-app-action bg-app-action/15 text-app-fg"
          : "border-app-border bg-app-surface text-app-subtle hover:border-app-border-strong hover:text-app-muted",
        disabled && "cursor-not-allowed opacity-60"
      )}
      onclick={() => {
        if (option.baseline) {
          baseline?.onToggle();
          return;
        }
        onToggle(option.value);
      }}
    >
      {option.label}
    </button>
  {/each}
</div>
