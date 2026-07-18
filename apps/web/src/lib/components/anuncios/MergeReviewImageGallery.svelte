<script lang="ts">
  import { Image as ImageIcon } from "@lucide/svelte";
  import {
    galleryStatusLabel,
    isGalleryItemSelectable,
    type MergeGalleryItem,
    type MergeReviewStats
  } from "$lib/components/anuncios/merge-review";
  import { cn } from "$lib/utils";

  let {
    gallery,
    stats,
    selectedImageRefs,
    onToggleImage
  } = $props<{
    gallery: MergeGalleryItem[];
    stats: MergeReviewStats;
    selectedImageRefs: string[];
    onToggleImage: (ref: string, selected: boolean) => void;
  }>();
</script>

<section aria-labelledby="merge-images-title">
  <div class="mb-3 flex flex-wrap items-end justify-between gap-2">
    <div>
      <h3 id="merge-images-title" class="flex items-center gap-2 text-sm font-semibold">
        <ImageIcon class="h-4 w-4" />
        Galeria final
      </h3>
      <p class="mt-1 text-xs text-muted-foreground">
        Revise todas as fotos do anúncio atual e do importado. Duplicadas aparecem para comparação e
        ficam desmarcadas por padrão.
      </p>
    </div>
    <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
      <span>{stats.duplicates} duplicada(s) ignorada(s)</span>
      <span>· {stats.failed} falha(s)</span>
      <span>· {stats.limitSkipped} fora do limite</span>
    </div>
  </div>

  {#if gallery.length > 0}
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {#each gallery as item}
        {@const selectable = isGalleryItemSelectable(item)}
        {@const selected = selectedImageRefs.includes(item.ref)}
        <button
          type="button"
          class={cn(
            "group relative w-full overflow-hidden rounded-lg border bg-app-surface-muted text-left transition-colors",
            selectable ? "cursor-pointer" : "opacity-70",
            selected ? "border-app-action ring-1 ring-app-action" : "border-app-border",
            item.status === "duplicate" && !selected && "border-dashed"
          )}
          disabled={!selectable}
          onclick={() => {
            if (!selectable) return;
            onToggleImage(item.ref, !selected);
          }}
        >
          <img
            src={item.previewUrl}
            alt="Prévia de imagem"
            class="aspect-[4/3] w-full object-cover"
            loading="lazy"
          />

          <span
            class={cn(
              "absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm",
              item.status === "existing" && "bg-app-surface/95 text-muted-foreground",
              item.status === "new" && "bg-app-accent/90 text-app-fg",
              item.status === "duplicate" && "bg-amber-500/90 text-white",
              item.status === "failed" && "bg-destructive/90 text-white",
              item.status === "limit_skipped" && "bg-muted-foreground/90 text-white"
            )}
          >
            {galleryStatusLabel(item.status)}
          </span>

          {#if selectable}
            <span class="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-md bg-app-surface/90 shadow-sm">
              <span
                class="flex h-4 w-4 items-center justify-center rounded border border-app-border bg-white text-[10px] font-bold text-app-action"
                aria-hidden="true"
              >{selected ? "✓" : ""}</span>
            </span>
          {/if}

          <div class="space-y-0.5 px-2 py-1.5">
            {#if item.width && item.height}
              <span class="block truncate text-xs text-muted-foreground">
                {item.width} × {item.height}
              </span>
            {/if}
            {#if item.status === "duplicate" && item.duplicateOf !== undefined}
              <span class="block truncate text-xs text-amber-700 dark:text-amber-300">
                Igual à foto {item.duplicateOf + 1} do anúncio atual
              </span>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  {:else}
    <div class="rounded-lg border border-dashed border-app-border p-5 text-center text-sm text-muted-foreground">
      Nenhuma imagem para revisar.
    </div>
  {/if}
</section>
