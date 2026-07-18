<script lang="ts">
  import { Bot, Check, Loader2, Paperclip, Sparkles, X } from "@lucide/svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import CardContent from "$lib/components/ui/CardContent.svelte";
  import CardHeader from "$lib/components/ui/CardHeader.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Label from "$lib/components/ui/Label.svelte";
  import ModalCloseButton from "$lib/components/listings/ModalCloseButton.svelte";
  import ModalHeaderTitle from "$lib/components/listings/ModalHeaderTitle.svelte";
  import type { Property } from "$lib/listings/types";
  import type { ListingData } from "$lib/workspace/client";

  let {
    isOpen,
    onClose,
    onListingAdded
  } = $props<{
    isOpen: boolean;
    onClose: () => void;
    onListingAdded: (listing: Property) => void;
  }>();

  const SAMPLE_INPUT = `CASA DUPLEX - CAMPECHE
4 bedrooms (2 suites), 3 bathrooms
Area total: 280m² | Area privativa: 180m²
Piscina, churrasqueira, 2 vagas
R$ 1.450.000
Rua dos Surfistas, 456 - Campeche`;

  const SAMPLE_OUTPUT: ListingData = {
    title: "Casa Duplex - Campeche",
    address: "Rua dos Surfistas, 456 - Campeche",
    bedrooms: 4,
    suites: 2,
    bathrooms: 3,
    totalAreaM2: 280,
    privateAreaM2: 180,
    price: 1450000,
    pricePerM2: 1450000 / 180,
    features: {
      pool: true,
      doorman24h: false,
      gym: false,
      unobstructedView: true,
      heatedPool: false
    },
    parkingSpots: 2,
    sourceUrl: undefined,
    addedAt: new Date().toISOString().split("T")[0]
  };

  let rawText = $state(SAMPLE_INPUT);
  let attachedName = $state<string | null>(null);
  let isLoading = $state(false);
  let lastParsed = $state<{ id: string; data: ListingData } | null>(null);
  let linkValue = $state("");
  let addressValue = $state("");

  $effect(() => {
    if (!isOpen) return;
    rawText = SAMPLE_INPUT;
    attachedName = null;
    isLoading = false;
    lastParsed = null;
    linkValue = "";
    addressValue = "";
  });

  async function handleParse() {
    if (!rawText.trim() && !attachedName) return;
    isLoading = true;
    await new Promise((resolve) => setTimeout(resolve, 1200));
    lastParsed = { id: `demo-${Date.now()}`, data: SAMPLE_OUTPUT };
    addressValue = SAMPLE_OUTPUT.address || "";
    rawText = "";
    attachedName = null;
    isLoading = false;
  }

  function handleSaveAndClose() {
    if (!lastParsed) return;
    onListingAdded({
      id: lastParsed.id,
      ...lastParsed.data,
      address: addressValue || lastParsed.data.address || "",
      sourceUrl: linkValue || null,
      createdAt: new Date().toISOString()
    } as Property);
    onClose();
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-[1000] flex items-center justify-center">
    <button
      type="button"
      class="absolute inset-0 bg-app-fg/80 backdrop-blur-sm"
      aria-label="Fechar modal"
      onclick={onClose}
    ></button>
    <Card
      class="relative z-10 mx-4 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden border-app-border bg-app-surface"
    >
      <CardHeader class="flex flex-row items-center justify-between px-4 py-3">
        <div class="flex items-center gap-2">
          <ModalHeaderTitle icon={Bot} title="Adicionar imóvel" />
          <span
            class="rounded border border-app-action/30 bg-app-action/20 px-1.5 py-0.5 text-[10px] font-medium uppercase text-app-accent"
          >
            Demo
          </span>
        </div>
        <ModalCloseButton onclick={onClose} />
      </CardHeader>
      <CardContent class="flex flex-col gap-3 px-4 pb-4">
        {#if !lastParsed}
          <Input
            disabled
            placeholder="URL do anúncio (em breve)"
            class="h-8 cursor-not-allowed text-sm opacity-60"
          />
          <textarea
            bind:value={rawText}
            class="min-h-[80px] w-full resize-none rounded-lg border border-app-border bg-input/30 px-3 py-2 text-sm"
          ></textarea>
          <p class="text-center text-xs text-muted-foreground">ou</p>
          <div
            class="flex min-h-[72px] items-center justify-center rounded-lg border border-dashed border-app-border bg-app-surface-muted/40 px-3 py-3 text-xs text-muted-foreground"
          >
            {#if attachedName}
              <span class="flex w-full items-center gap-2">
                <Paperclip class="h-4 w-4" />
                <span class="flex-1 truncate">{attachedName}</span>
                <button type="button" onclick={() => (attachedName = null)}>
                  <X class="h-4 w-4" />
                </button>
              </span>
            {:else}
              Arraste um arquivo ou clique para selecionar
            {/if}
          </div>
          <button
            type="button"
            onclick={() => void handleParse()}
            disabled={isLoading || (!rawText.trim() && !attachedName)}
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-app-action py-2.5 text-sm font-medium text-app-action-foreground disabled:opacity-50"
          >
            {#if isLoading}
              <Loader2 class="h-4 w-4 animate-spin" />
              Processando...
            {:else}
              <Sparkles class="h-4 w-4" />
              Extrair Dados
            {/if}
          </button>
        {:else}
          <div class="space-y-3 rounded-lg border border-green/30 bg-green/10 p-3">
            <p class="flex items-center gap-2 text-sm text-green">
              <Check class="h-4 w-4" />
              Dados extraídos
            </p>
            <div>
              <Label class="text-xs">Endereço</Label>
              <Input bind:value={addressValue} class="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label class="text-xs">Link</Label>
              <Input bind:value={linkValue} class="mt-1 h-8 text-sm" />
            </div>
            <button
              type="button"
              onclick={handleSaveAndClose}
              class="w-full rounded-lg bg-app-action py-2 text-sm font-medium text-app-action-foreground"
            >
              Adicionar à tabela demo
            </button>
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>
{/if}
