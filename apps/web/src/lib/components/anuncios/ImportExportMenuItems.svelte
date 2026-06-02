<script lang="ts">
  import { Download, Upload } from "@lucide/svelte";
  import ExportModal from "$lib/components/anuncios/ExportModal.svelte";
  import ImportModal from "$lib/components/anuncios/ImportModal.svelte";
  import { getCollectionsContext } from "$lib/collections-context.svelte";

  const ctx = getCollectionsContext();

  let showExportModal = $state(false);
  let showImportModal = $state(false);
</script>

<button
  type="button"
  class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
  disabled={ctx.listings.length === 0}
  role="menuitem"
  onclick={() => (showExportModal = true)}
>
  <Download class="h-4 w-4" />
  <span>Exportar</span>
</button>
<button
  type="button"
  class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-app-surface-muted"
  role="menuitem"
  onclick={() => (showImportModal = true)}
>
  <Upload class="h-4 w-4" />
  <span>Importar</span>
</button>

<ExportModal isOpen={showExportModal} onClose={() => (showExportModal = false)} />
<ImportModal
  isOpen={showImportModal}
  onClose={() => (showImportModal = false)}
  onSwitchToCollection={(collectionId) => {
    const collection = ctx.collections.find((item) => item.id === collectionId);
    if (collection) ctx.setActiveCollection(collection);
    else if (ctx.activeCollection?.id) {
      void ctx.loadListings(ctx.activeCollection.id, { silent: true });
    }
  }}
/>
