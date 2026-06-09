<script lang="ts">
  import { Download, FolderOpen, Loader2 } from "@lucide/svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import ModalCloseButton from "$lib/components/anuncios/ModalCloseButton.svelte";
  import ModalHeaderTitle from "$lib/components/anuncios/ModalHeaderTitle.svelte";
  import CollectionDestinationPicker, {
    type DestinationMode
  } from "$lib/components/anuncios/CollectionDestinationPicker.svelte";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { applyGeneratedTitlesToListingData } from "$lib/listing-display-title";
  import { listingDataWithPreferences } from "$lib/anuncios/listing-preferences";
  import type { ListingData } from "$lib/workspace/client";
  import { queueListingImports } from "$lib/anuncios/listing-import-queue";
  import { cn } from "$lib/utils";

  let {
    isOpen,
    onClose,
    onSwitchToCollection
  } = $props<{
    isOpen: boolean;
    onClose: () => void;
    onSwitchToCollection?: (collectionId: string) => void;
  }>();

  const ctx = getCollectionsContext();

  let importText = $state("");
  let error = $state<string | null>(null);
  let success = $state<string | null>(null);
  let isImporting = $state(false);
  let importMode = $state<DestinationMode>("new");
  let selectedCollectionId = $state("");
  let newCollectionName = $state("");

  $effect(() => {
    if (!isOpen) return;
    importText = "";
    error = null;
    success = null;
    importMode = "new";
    selectedCollectionId = ctx.activeCollection?.id ?? "";
  });

  function parseListingData(listing: Record<string, unknown>): ListingData {
    const preferences =
      listing.preferences && typeof listing.preferences === "object" && !Array.isArray(listing.preferences)
        ? (listing.preferences as Record<string, boolean | null>)
        : undefined;

    const parsed: ListingData = {
      titulo: String(listing.titulo ?? ""),
      endereco: String(listing.endereco ?? ""),
      bairro: typeof listing.bairro === "string" ? listing.bairro : undefined,
      cidade: typeof listing.cidade === "string" ? listing.cidade : undefined,
      m2Totais: typeof listing.m2Totais === "number" ? listing.m2Totais : null,
      m2Privado: typeof listing.m2Privado === "number" ? listing.m2Privado : null,
      quartos: typeof listing.quartos === "number" ? listing.quartos : null,
      suites: typeof listing.suites === "number" ? listing.suites : null,
      banheiros: typeof listing.banheiros === "number" ? listing.banheiros : null,
      garagem: typeof listing.garagem === "number" ? listing.garagem : null,
      preco: typeof listing.preco === "number" ? listing.preco : null,
      precoM2: typeof listing.precoM2 === "number" ? listing.precoM2 : null,
      piscina: typeof listing.piscina === "boolean" ? listing.piscina : null,
      porteiro24h: typeof listing.porteiro24h === "boolean" ? listing.porteiro24h : null,
      academia: typeof listing.academia === "boolean" ? listing.academia : null,
      vistaLivre: typeof listing.vistaLivre === "boolean" ? listing.vistaLivre : null,
      piscinaTermica: typeof listing.piscinaTermica === "boolean" ? listing.piscinaTermica : null,
      andar: typeof listing.andar === "number" ? listing.andar : null,
      tipoImovel:
        listing.tipoImovel === "casa" || listing.tipoImovel === "apartamento"
          ? listing.tipoImovel
          : undefined,
      link: typeof listing.link === "string" ? listing.link : undefined,
      imageUrl: typeof listing.imageUrl === "string" ? listing.imageUrl : undefined,
      imageUrls: Array.isArray(listing.imageUrls)
        ? listing.imageUrls.filter((u): u is string => typeof u === "string" && u.trim() !== "")
        : null,
      contactName: typeof listing.contactName === "string" ? listing.contactName : null,
      contactNumber: typeof listing.contactNumber === "string" ? listing.contactNumber : null,
      condominiumName: typeof listing.condominiumName === "string" ? listing.condominiumName : null,
      starred: typeof listing.starred === "boolean" ? listing.starred : false,
      visited: typeof listing.visited === "boolean" ? listing.visited : false,
      strikethrough: typeof listing.strikethrough === "boolean" ? listing.strikethrough : false,
      discardedReason: typeof listing.discardedReason === "string" ? listing.discardedReason : null,
      customLat: typeof listing.customLat === "number" ? listing.customLat : null,
      customLng: typeof listing.customLng === "number" ? listing.customLng : null,
      addedAt:
        typeof listing.addedAt === "string"
          ? listing.addedAt
          : new Date().toISOString().split("T")[0],
      imageIngestionStatus:
        typeof listing.link === "string" && listing.link.trim() ? "idle" : null,
      preferences
    };

    return listingDataWithPreferences(parsed);
  }

  async function handleProcessImport(jsonText?: string) {
    const textToProcess = jsonText ?? importText;
    if (!textToProcess.trim()) {
      error = "Por favor, cole o JSON para importar";
      return;
    }

    error = null;
    success = null;
    isImporting = true;

    try {
      const parsed = JSON.parse(textToProcess) as unknown;
      let collectionsToImport: { collection: { label?: string; name?: string }; listings: Record<string, unknown>[] }[] = [];

      if (Array.isArray(parsed)) {
        collectionsToImport = [{ collection: { label: "Coleção Importada" }, listings: parsed }];
      } else if (parsed && typeof parsed === "object" && "collection" in parsed && "listings" in parsed) {
        collectionsToImport = [parsed as { collection: { label?: string; name?: string }; listings: Record<string, unknown>[] }];
      } else if (parsed && typeof parsed === "object" && "collections" in parsed && Array.isArray((parsed as { collections: unknown }).collections)) {
        collectionsToImport = (parsed as { collections: typeof collectionsToImport }).collections;
        if (collectionsToImport.length === 0) throw new Error("Nenhuma coleção encontrada no arquivo");
      } else {
        throw new Error("Formato de importação inválido");
      }

      let totalImported = 0;
      let targetCollectionId: string | null = null;

      for (const importData of collectionsToImport) {
        const validListings = importData.listings.filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" &&
            item !== null &&
            typeof item.titulo === "string" &&
            typeof item.endereco === "string"
        );
        if (validListings.length === 0) continue;

        let collectionId: string;
        if (importMode === "existing" && selectedCollectionId) {
          collectionId = selectedCollectionId;
        } else {
          const baseName = importData.collection.label || importData.collection.name || "Coleção Importada";
          const existingNames = new Set(ctx.collections.map((c) => c.label));
          let collectionName = baseName;
          let counter = 2;
          while (existingNames.has(collectionName)) {
            collectionName = `${baseName} (${counter})`;
            counter += 1;
          }
          const created = await ctx.createCollection(collectionName);
          collectionId = created.id;
          if (!targetCollectionId) {
            ctx.setActiveCollection(created);
            targetCollectionId = created.id;
          }
        }

        const parsedBatch = applyGeneratedTitlesToListingData(
          validListings.map((listing) => parseListingData(listing)) as Parameters<
            typeof applyGeneratedTitlesToListingData
          >[0]
        ) as ListingData[];

        queueListingImports({ collectionId, listings: parsedBatch });
        totalImported += parsedBatch.length;

        if (importMode === "existing" && !targetCollectionId) {
          targetCollectionId = collectionId;
        }
      }

      if (totalImported === 0) throw new Error("Nenhum imóvel válido encontrado no arquivo");

      if (targetCollectionId && targetCollectionId !== ctx.activeCollection?.id) {
        await ctx.loadListings(targetCollectionId, { silent: true });
      }
      if (targetCollectionId) onSwitchToCollection?.(targetCollectionId);

      success = `${totalImported} imóvel(eis) enviado(s) para revisão.`;
      importText = "";
      if (ctx.activeCollection?.id) {
        await ctx.loadListings(ctx.activeCollection.id, { silent: true });
      }
      setTimeout(() => {
        success = null;
        onClose();
      }, 1500);
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao importar dados";
    } finally {
      isImporting = false;
    }
  }

  function handleFileUpload(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      error = "Por favor, selecione um arquivo JSON";
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const content = loadEvent.target?.result;
      if (typeof content !== "string") {
        error = "Erro ao ler o arquivo";
        return;
      }
      importText = content;
      void handleProcessImport(content);
    };
    reader.onerror = () => {
      error = "Erro ao ler o arquivo";
    };
    reader.readAsText(file);
    input.value = "";
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-[1000] flex items-center justify-center">
    <button type="button" class="absolute inset-0 bg-app-fg/80 backdrop-blur-sm" aria-label="Fechar" onclick={onClose}></button>
    <Card class="relative z-10 mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden border-app-border bg-app-surface">
      <div class="flex items-center justify-between border-b border-app-border px-4 py-3">
        <ModalHeaderTitle icon={Download} title="Importar" />
        <ModalCloseButton onclick={onClose} />
      </div>
      <div class="flex-1 space-y-4 overflow-y-auto p-4">
        <CollectionDestinationPicker
          collections={ctx.collections}
          mode={importMode}
          onModeChange={(mode) => (importMode = mode)}
          {selectedCollectionId}
          onSelectedCollectionIdChange={(id) => (selectedCollectionId = id)}
          {newCollectionName}
          onNewCollectionNameChange={(name) => (newCollectionName = name)}
          disabled={isImporting}
          destinationLabel="Destino da importação"
          showNewCollectionNameField={false}
          newCollectionHint="Será criada uma coleção por arquivo importado, usando o nome do JSON."
        />

        <input type="file" accept=".json" class="hidden" id="json-file-input" disabled={isImporting} onchange={handleFileUpload} />
        <label
          for="json-file-input"
          class={cn(
            "flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface-muted py-2.5 text-sm font-medium",
            isImporting && "pointer-events-none opacity-50"
          )}
        >
          <FolderOpen class="h-4 w-4" />
          Upload JSON
        </label>

        <textarea
          bind:value={importText}
          placeholder="Cole o JSON aqui..."
          disabled={isImporting}
          class="min-h-[160px] w-full rounded-lg border border-app-border bg-app-surface-muted px-3 py-2 text-sm"
        ></textarea>

        {#if error}<p class="text-sm text-destructive">{error}</p>{/if}
        {#if success}<p class="text-sm text-app-accent">{success}</p>{/if}

        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-lg bg-app-action py-2.5 font-medium text-app-action-foreground disabled:opacity-50"
          disabled={isImporting || !importText.trim()}
          onclick={() => void handleProcessImport()}
        >
          {#if isImporting}<Loader2 class="h-4 w-4 animate-spin" /> Importando...{:else}Importar{/if}
        </button>
      </div>
    </Card>
  </div>
{/if}
