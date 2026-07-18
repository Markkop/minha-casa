<script lang="ts">
  import { Image, MapPinned } from "@lucide/svelte";
  import { cn } from "$lib/utils";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import type { ImageColumnView } from "$lib/components/listings/listings-table-shared";

  let {
    value = $bindable()
  }: {
    value: ImageColumnView;
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
    <FloatingTooltip label={option.label} side="bottom" wrapperClass="flex min-w-0 flex-1">
      <button
        type="button"
        aria-pressed={value === option.value}
        aria-label={option.label}
        class={cn(
          "flex h-full min-w-0 flex-1 items-center justify-center rounded-[3px] transition-colors",
          value === option.value
            ? "bg-app-surface text-app-fg shadow-sm"
            : "text-app-subtle hover:text-app-muted"
        )}
        onpointerdown={(event) => {
          event.preventDefault();
          value = option.value;
        }}
        onclick={() => (value = option.value)}
      >
        <option.Icon class="pointer-events-none h-3 w-3" />
      </button>
    </FloatingTooltip>
  {/each}
</div>
