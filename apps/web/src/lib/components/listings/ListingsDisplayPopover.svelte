<script lang="ts">
  import { Menu } from "@lucide/svelte";
  import PageToolbarIconButton from "$lib/components/page-toolbar/PageToolbarIconButton.svelte";
  import ToolbarAnchoredPopover from "$lib/components/listings/ToolbarAnchoredPopover.svelte";
  import { getDisplayMetricToggleLabels } from "$lib/listings/area-metric-labels";
  import {
    setPropertyDisplayPref,
    type ListingsPropertyDisplayPrefs
  } from "$lib/listings/listings-display-prefs";
  import { cn } from "$lib/utils";

  let {
    prefs,
    useCasaAreaLabels = false,
    onChange
  }: {
    prefs: ListingsPropertyDisplayPrefs;
    useCasaAreaLabels?: boolean;
    onChange: (prefs: ListingsPropertyDisplayPrefs) => void;
  } = $props();

  const metricToggleLabels = $derived(getDisplayMetricToggleLabels(useCasaAreaLabels));

  const displayOptions = $derived<
    { key: keyof ListingsPropertyDisplayPrefs; label: string }[]
  >([
    { key: "showAddress", label: "Mapa" },
    { key: "showCountFeatures", label: "Quartos e vagas" },
    { key: "showContact", label: "Contato" },
    { key: "showMetricTotal", label: metricToggleLabels.total },
    { key: "showMetricPrivado", label: metricToggleLabels.privado }
  ]);

  let open = $state(false);
</script>

<ToolbarAnchoredPopover bind:open align="auto" panelClass="w-56 p-2">
  {#snippet trigger()}
    <PageToolbarIconButton
      variant="secondary"
      aria-label="Exibição do imóvel"
      title="Exibição do imóvel"
      tooltipDisabled={open}
      onclick={() => (open = !open)}
    >
      <Menu />
    </PageToolbarIconButton>
  {/snippet}
  <div class="flex flex-col gap-1">
    {#each displayOptions as option (option.key)}
      {@const isMetric = option.key === "showMetricTotal" || option.key === "showMetricPrivado"}
      {@const otherMetricKey =
        option.key === "showMetricTotal" ? "showMetricPrivado" : "showMetricTotal"}
      {@const isLastMetric = isMetric && prefs[option.key] && !prefs[otherMetricKey]}
      <label
        class={cn(
          "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-app-muted transition-colors hover:bg-app-surface-muted hover:text-app-fg",
          isLastMetric && "cursor-not-allowed opacity-50"
        )}
      >
        <input
          type="checkbox"
          checked={prefs[option.key]}
          disabled={isLastMetric}
          onchange={(event) =>
            onChange(setPropertyDisplayPref(prefs, option.key, event.currentTarget.checked))}
          class="h-3.5 w-3.5 accent-app-action disabled:cursor-not-allowed"
        />
        <span>{option.label}</span>
      </label>
    {/each}
  </div>
</ToolbarAnchoredPopover>
