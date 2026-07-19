<script lang="ts">
  import { Check, ClipboardList, Download, Loader2 } from "@lucide/svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import ModalCloseButton from "$lib/components/listings/ModalCloseButton.svelte";
  import ModalHeaderTitle from "$lib/components/listings/ModalHeaderTitle.svelte";
  import { formatApiError } from "$lib/api/error-message";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { getActiveOrganizationId } from "$lib/api/client";
  import { workspaceApi } from "$lib/workspace/client";
  import { toProperty } from "$lib/listings/types";
  import { formatListingForJsonExport } from "$lib/listings/listing-json";
  import { cn } from "$lib/utils";

  const EXPORT_FORMAT_VERSION = "2.0";

  let { isOpen, onClose } = $props<{ isOpen: boolean; onClose: () => void }>();

  const ctx = getCollectionsContext();

  let error = $state<string | null>(null);
  let success = $state<string | null>(null);
  let copySuccess = $state(false);
  let exportMode = $state<"current" | "all">("current");
  let isExporting = $state(false);

  $effect(() => {
    if (!isOpen) return;
    error = null;
    success = null;
    copySuccess = false;
    exportMode = "current";
  });

  async function getExportData() {
    if (exportMode === "current") {
      if (!ctx.activeCollection) throw new Error("Nenhuma coleção ativa");
      return JSON.stringify(
        {
          version: EXPORT_FORMAT_VERSION,
          exportedAt: new Date().toISOString(),
          context: getActiveOrganizationId() ? "organization" : "personal",
          collection: {
            id: ctx.activeCollection.id,
            name: ctx.activeCollection.name,
            createdAt: ctx.activeCollection.createdAt,
            updatedAt: ctx.activeCollection.updatedAt,
            isDefault: ctx.activeCollection.isDefault
          },
          listings: ctx.listings.map(formatListingForJsonExport)
        },
        null,
        2
      );
    }

    if (ctx.collections.length === 0) throw new Error("Nenhuma coleção para exportar");
    const collectionsWithListings = await Promise.all(
      ctx.collections.map(async (collection) => {
        const rows = (await workspaceApi.fetchListings(collection.id)).listings.map((listing) =>
          toProperty(listing)
        );
        return {
          collection: {
            id: collection.id,
            name: collection.name,
            createdAt: collection.createdAt,
            updatedAt: collection.updatedAt,
            isDefault: collection.isDefault
          },
          listings: rows.map(formatListingForJsonExport)
        };
      })
    );

    return JSON.stringify(
      {
        version: EXPORT_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        context: getActiveOrganizationId() ? "organization" : "personal",
        collections: collectionsWithListings
      },
      null,
      2
    );
  }

  async function handleExport() {
    isExporting = true;
    error = null;
    success = null;
    try {
      const data = await getExportData();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `minha-casa-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      success = "Exportação concluída!";
    } catch (err) {
      error = formatApiError(err, { action: "exportar" });
    } finally {
      isExporting = false;
    }
  }

  async function handleCopy() {
    isExporting = true;
    error = null;
    try {
      await navigator.clipboard.writeText(await getExportData());
      copySuccess = true;
      setTimeout(() => (copySuccess = false), 2000);
    } catch (err) {
      error = formatApiError(err, { action: "copiar" });
    } finally {
      isExporting = false;
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-[1000] flex items-center justify-center">
    <button type="button" class="absolute inset-0 bg-app-fg/80 backdrop-blur-sm" aria-label="Fechar" onclick={onClose}></button>
    <Card class="relative z-10 mx-4 w-full max-w-lg border-app-border bg-app-surface">
      <div class="flex items-center justify-between border-b border-app-border px-4 py-3">
        <ModalHeaderTitle icon={Download} title="Exportar" />
        <ModalCloseButton onclick={onClose} />
      </div>
      <div class="space-y-4 p-4">
        <div class="flex gap-2">
          <button type="button" class={cn("flex-1 rounded-lg border px-3 py-2 text-sm", exportMode === "current" ? "border-app-action bg-app-action/20 text-app-accent" : "border-app-border")} onclick={() => (exportMode = "current")}>
            Coleção atual
          </button>
          <button type="button" class={cn("flex-1 rounded-lg border px-3 py-2 text-sm", exportMode === "all" ? "border-app-action bg-app-action/20 text-app-accent" : "border-app-border")} onclick={() => (exportMode = "all")}>
            Todas
          </button>
        </div>
        {#if error}<p class="text-sm text-destructive">{error}</p>{/if}
        {#if success}<p class="text-sm text-app-accent">{success}</p>{/if}
        <div class="flex gap-2">
          <button type="button" class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-app-action py-2.5 text-app-action-foreground" disabled={isExporting || (exportMode === "current" && ctx.listings.length === 0)} onclick={() => void handleExport()}>
            {#if isExporting}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Download class="h-4 w-4" />{/if}
            Baixar JSON
          </button>
          <button type="button" class="flex flex-1 items-center justify-center gap-2 rounded-lg border border-app-border py-2.5" disabled={isExporting} onclick={() => void handleCopy()}>
            {#if copySuccess}<Check class="h-4 w-4" />{:else}<ClipboardList class="h-4 w-4" />{/if}
            Copiar
          </button>
        </div>
      </div>
    </Card>
  </div>
{/if}
