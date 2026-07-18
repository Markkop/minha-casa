<script lang="ts" module>
  export type PropertyTypeFilter = "all" | "house" | "apartment";

  const PROPERTY_TYPE_FILTER_ORDER: PropertyTypeFilter[] = ["all", "house", "apartment"];

  export function cyclePropertyTypeFilter(current: PropertyTypeFilter): PropertyTypeFilter {
    const index = PROPERTY_TYPE_FILTER_ORDER.indexOf(current);
    return PROPERTY_TYPE_FILTER_ORDER[(index + 1) % PROPERTY_TYPE_FILTER_ORDER.length];
  }
</script>

<script lang="ts">
  import { Building, Home, LayoutGrid } from "@lucide/svelte";
  import PageToolbarIconButton from "$lib/components/page-toolbar/PageToolbarIconButton.svelte";

  let {
    value,
    onChange
  }: {
    value: PropertyTypeFilter;
    onChange: (next: PropertyTypeFilter) => void;
  } = $props();

  const config = $derived(
    {
      all: { label: "Todos os tipos", Icon: LayoutGrid },
      house: { label: "Casas", Icon: Home },
      apartment: { label: "Apartamentos", Icon: Building }
    }[value]
  );
</script>

<PageToolbarIconButton
  variant="secondary"
  aria-label={config.label}
  title={config.label}
  onclick={() => onChange(cyclePropertyTypeFilter(value))}
>
  <config.Icon />
</PageToolbarIconButton>
