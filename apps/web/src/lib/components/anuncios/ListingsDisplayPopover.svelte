<script lang="ts">
  import { Menu } from "@lucide/svelte";
  import PageToolbarIconButton from "$lib/components/page-toolbar/PageToolbarIconButton.svelte";
  import ToolbarAnchoredPopover from "$lib/components/anuncios/ToolbarAnchoredPopover.svelte";
  import {
    setPropertyDisplayPref,
    type ListingsPropertyDisplayPrefs
  } from "$lib/anuncios/listings-display-prefs";
  import { cn } from "$lib/utils";

  const DISPLAY_OPTIONS: {
    key: keyof ListingsPropertyDisplayPrefs;
    label: string;
  }[] = [
    { key: "showAddress", label: "Endereço" },
    { key: "showPropertyIcons", label: "Detalhes do imóvel" },
    { key: "showContact", label: "Contato" },
    { key: "showMetricTotal", label: "Área total" },
    { key: "showMetricPrivado", label: "Área privada" }
  ];

  let {
    prefs,
    onChange
  }: {
    prefs: ListingsPropertyDisplayPrefs;
    onChange: (prefs: ListingsPropertyDisplayPrefs) => void;
  } = $props();

  let open = $state(false);
</script>

<ToolbarAnchoredPopover bind:open panelClass="w-56 p-2">
  {#snippet trigger()}
    <PageToolbarIconButton
      variant="secondary"
      aria-label="Exibição do imóvel"
      title="Exibição do imóvel"
      onclick={() => (open = !open)}
    >
      <Menu />
    </PageToolbarIconButton>
  {/snippet}
  <div class="flex flex-col gap-1">
    {#each DISPLAY_OPTIONS as option (option.key)}
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
