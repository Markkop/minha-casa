<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import AddonCatalogPreview from "$lib/addons/previews/AddonCatalogPreview.svelte";
  import type { AddonCatalogEntry } from "$lib/addons/addons-catalog";

  let { entry }: { entry: AddonCatalogEntry } = $props();
</script>

<article class="flex flex-col overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm">
  <div class="flex items-start justify-between gap-3 border-b border-app-border p-4">
    <div class="min-w-0 flex-1">
      <h2 class="text-base font-semibold text-app-fg">{entry.title}</h2>
      <p class="mt-1 text-sm leading-6 text-app-muted">{entry.description}</p>
    </div>
    <a href={entry.href} class="shrink-0">
      <Button variant="outline" size="sm">Testar</Button>
    </a>
  </div>
  <AddonCatalogPreview {entry} />
</article>
