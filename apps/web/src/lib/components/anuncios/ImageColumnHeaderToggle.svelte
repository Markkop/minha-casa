<script lang="ts">
  import { Image, MapPinned } from "@lucide/svelte";
  import { cn } from "$lib/utils";
  import type { ImageColumnView } from "$lib/components/anuncios/listings-table-shared";

  let {
    value,
    onChange
  }: {
    value: ImageColumnView;
    onChange: (value: ImageColumnView) => void;
  } = $props();

  const options = [
    { value: "image" as const, label: "Imagem", Icon: Image },
    { value: "map" as const, label: "Mapa", Icon: MapPinned }
  ];
</script>

<div
  role="group"
  aria-label="Alternar entre imagem e mapa na coluna"
  class="inline-flex h-5 w-20 shrink-0 rounded border border-app-border bg-app-surface-muted p-px"
>
  {#each options as option (option.value)}
    <button
      type="button"
      aria-pressed={value === option.value}
      aria-label={option.label}
      title={option.label}
      class={cn(
        "flex flex-1 items-center justify-center rounded-sm transition-colors",
        value === option.value
          ? "bg-app-surface text-app-fg shadow-sm"
          : "text-app-muted hover:text-app-fg"
      )}
      onclick={() => onChange(option.value)}
    >
      <option.Icon class="h-3 w-3" />
    </button>
  {/each}
</div>
