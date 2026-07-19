<script lang="ts">
  import { Check, Link2, Loader2, Lock } from "@lucide/svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import ModalCloseButton from "$lib/components/listings/ModalCloseButton.svelte";
  import ModalHeaderTitle from "$lib/components/listings/ModalHeaderTitle.svelte";
  import type { Collection } from "$lib/listings/types";
  import { formatApiError } from "$lib/api/error-message";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { cn } from "$lib/utils";

  let {
    isOpen,
    onClose,
    collection
  } = $props<{
    isOpen: boolean;
    onClose: () => void;
    collection: Collection | null;
  }>();

  const ctx = getCollectionsContext();

  let shareUrl = $state<string | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let copied = $state(false);
  let showRevokeConfirm = $state(false);

  const isShared = $derived(Boolean(shareUrl));

  $effect(() => {
    if (!isOpen || !collection) return;
    showRevokeConfirm = false;
    copied = false;
    error = null;
    shareUrl =
      collection.shareToken && typeof window !== "undefined"
        ? `${window.location.origin}/share/${collection.shareToken}`
        : null;
  });

  async function handleShare() {
    if (!collection) return;
    isLoading = true;
    error = null;
    try {
      shareUrl = await ctx.shareCollection(collection.id);
    } catch (err) {
      error = formatApiError(err, { action: "compartilhar coleção" });
    } finally {
      isLoading = false;
    }
  }

  async function handleRevoke() {
    if (!collection) return;
    isLoading = true;
    error = null;
    try {
      await ctx.unshareCollection(collection.id);
      shareUrl = null;
      showRevokeConfirm = false;
    } catch (err) {
      error = formatApiError(err, { action: "revogar compartilhamento" });
    } finally {
      isLoading = false;
    }
  }

  async function handleCopyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      error = "Não foi possível copiar o link";
    }
  }
</script>

{#if isOpen && collection}
  <div class="fixed inset-0 z-[1000] flex items-center justify-center">
    <button type="button" class="absolute inset-0 bg-app-fg/80 backdrop-blur-sm" aria-label="Fechar" onclick={onClose}></button>
    <Card class="relative z-10 mx-4 w-full max-w-md border-app-border bg-app-surface">
      <div class="flex items-center justify-between border-b border-app-border px-4 py-3">
        <ModalHeaderTitle icon={Link2} title="Compartilhar Coleção" />
        <ModalCloseButton onclick={onClose} />
      </div>
      <div class="space-y-4 p-4">
        <p class="text-sm font-medium">{collection.name}</p>
        {#if isLoading}
          <div class="flex items-center gap-2 text-sm text-app-muted">
            <Loader2 class="h-4 w-4 animate-spin" />
            Carregando...
          </div>
        {:else if isShared && shareUrl}
          <div class="space-y-2">
            <label class="sr-only" for="share-collection-url">Link de compartilhamento</label>
            <input
              id="share-collection-url"
              readonly
              value={shareUrl}
              aria-label="Link de compartilhamento da coleção"
              class="w-full rounded border border-app-border bg-app-surface-muted px-2 py-2 text-xs"
            />
            <button type="button" class="flex w-full items-center justify-center gap-2 rounded-lg border border-app-border py-2 text-sm" onclick={() => void handleCopyLink()}>
              {#if copied}<Check class="h-4 w-4" /> Copiado!{:else}Copiar link{/if}
            </button>
          </div>
          {#if showRevokeConfirm}
            <div class="space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <p class="text-sm">Revogar link de compartilhamento?</p>
              <div class="flex gap-2">
                <button type="button" class="flex-1 rounded border border-app-border py-2 text-sm" onclick={() => (showRevokeConfirm = false)}>Cancelar</button>
                <button type="button" class="flex-1 rounded bg-destructive py-2 text-sm text-white" onclick={() => void handleRevoke()}>Revogar</button>
              </div>
            </div>
          {:else}
            <button type="button" class="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/40 py-2 text-sm text-destructive" onclick={() => (showRevokeConfirm = true)}>
              <Lock class="h-4 w-4" />
              Revogar compartilhamento
            </button>
          {/if}
        {:else}
          <p class="text-sm text-app-muted">Gere um link público somente leitura para esta coleção.</p>
          <button type="button" class={cn("flex w-full items-center justify-center gap-2 rounded-lg bg-app-action py-2.5 text-app-action-foreground")} onclick={() => void handleShare()}>
            <Link2 class="h-4 w-4" />
            Gerar link
          </button>
        {/if}
        {#if error}<p class="text-xs text-destructive">{error}</p>{/if}
      </div>
    </Card>
  </div>
{/if}
