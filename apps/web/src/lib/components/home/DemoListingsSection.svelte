<script lang="ts">
  import DemoListingsTable from "$lib/components/home/DemoListingsTable.svelte";
  import DemoParserModal from "$lib/components/home/DemoParserModal.svelte";
  import { INITIAL_DEMO_LISTINGS } from "$lib/components/home/demo-listings-data";
  import type { Property } from "$lib/listings/types";
  import { cn } from "$lib/utils";

  let listings = $state<Property[]>(INITIAL_DEMO_LISTINGS.map((listing) => ({ ...listing })));
  let isParserOpen = $state(false);

  function handleUpdateListing(id: string, updates: Partial<Property>) {
    listings = listings.map((listing) =>
      listing.id === id ? { ...listing, ...updates } : listing
    );
  }

  function handleDeleteListing(id: string) {
    listings = listings.filter((listing) => listing.id !== id);
  }

  function handleListingAdded(newListing: Property) {
    listings = [newListing, ...listings];
  }
</script>

<section class="mt-16 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
  <div
    class="flex flex-col justify-between gap-4 border-b border-app-border pb-4 md:flex-row md:items-center"
  >
    <div>
      <h2 class="flex items-center gap-2 text-2xl font-bold text-app-fg">
        <span>🏘️</span>
        <span>Gerenciador de imóveis</span>
      </h2>
      <p class="text-sm text-app-muted">
        Cole anúncios de imóveis e deixe a IA extrair automaticamente todos os dados relevantes.
      </p>
    </div>

    <button
      type="button"
      onclick={() => (isParserOpen = true)}
      class={cn(
        "flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold transition-all",
        "bg-app-action text-app-action-foreground hover:bg-app-action-hover active:scale-95"
      )}
    >
      <span>✨</span>
      <span>Adicionar com IA</span>
    </button>
  </div>

  <DemoListingsTable
    {listings}
    onUpdateListing={handleUpdateListing}
    onDeleteListing={handleDeleteListing}
  />

  <DemoParserModal
    isOpen={isParserOpen}
    onClose={() => (isParserOpen = false)}
    onListingAdded={handleListingAdded}
  />
</section>
