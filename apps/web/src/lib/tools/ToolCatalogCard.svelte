<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import ToolCatalogPreview from "$lib/tools/previews/ToolCatalogPreview.svelte";
  import type { ToolCatalogEntry } from "$lib/tools/tools-catalog";

  let { entry }: { entry: ToolCatalogEntry } = $props();
</script>

<article class="flex flex-col overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm">
  <div class="flex items-start justify-between gap-3 border-b border-app-border p-4">
    <div class="min-w-0 flex-1">
      <h2 class="text-base font-semibold text-app-fg">{entry.title}</h2>
      <p class="mt-1 text-sm leading-6 text-app-muted">{entry.description}</p>
    </div>
    <a href={entry.href} class="shrink-0">
      <Button variant="outline" size="sm">Abrir</Button>
    </a>
  </div>
  <ToolCatalogPreview {entry} />
</article>
