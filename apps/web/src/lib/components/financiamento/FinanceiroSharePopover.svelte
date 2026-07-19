<script lang="ts">
  import { Check, Copy, Share2 } from "@lucide/svelte";
  import { formatApiError } from "$lib/api/error-message";
  import PageToolbarButton from "$lib/components/page-toolbar/PageToolbarButton.svelte";
  import PageToolbarIconButton from "$lib/components/page-toolbar/PageToolbarIconButton.svelte";
  import ToolbarAnchoredPopover from "$lib/components/listings/ToolbarAnchoredPopover.svelte";
  import Input from "$lib/components/ui/Input.svelte";

  let {
    suggestedTitle = "Simulação financeira",
    onCreate
  }: {
    suggestedTitle?: string;
    onCreate: (title: string) => Promise<string>;
  } = $props();

  let open = $state(false);
  let title = $state("Simulação financeira");
  let shareUrl = $state("");
  let status = $state<"idle" | "creating" | "created" | "error" | "copied">("idle");
  let error = $state("");

  const busy = $derived(status === "creating");
  const canCreate = $derived(title.trim().length > 0 && !busy);

  async function copyLink(url: string) {
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      status = "copied";
      window.setTimeout(() => {
        if (status === "copied") status = "created";
      }, 1800);
    } catch {
      status = "created";
    }
  }

  async function createLink() {
    if (!canCreate) return;

    status = "creating";
    error = "";
    shareUrl = "";

    try {
      const url = await onCreate(title.trim());
      shareUrl = url;
      status = "created";
      await copyLink(url);
    } catch (err) {
      error = formatApiError(err, { action: "criar link" });
      status = "error";
    }
  }

  function toggleOpen() {
    if (!open) {
      title = suggestedTitle;
      shareUrl = "";
      error = "";
      status = "idle";
    }
    open = !open;
  }
</script>

<ToolbarAnchoredPopover bind:open align="end" panelClass="w-80 p-2">
  {#snippet trigger()}
    <PageToolbarIconButton
      variant="secondary"
      aria-label="Compartilhar visualização financeira"
      title="Compartilhar"
      tooltipDisabled={open}
      onclick={toggleOpen}
    >
      <Share2 />
    </PageToolbarIconButton>
  {/snippet}

  <p class="px-1 pb-2 text-[11px] leading-snug text-app-subtle">
    Crie um link público e estático com os parâmetros e gráficos atuais.
  </p>

  <label class="flex flex-col gap-1 px-1">
    <span class="text-xs font-medium text-app-muted">Título</span>
    <Input
      bind:value={title}
      class="h-8 py-0 text-sm"
      ariaLabel="Título do link compartilhável"
      onkeydown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void createLink();
        }
      }}
    />
  </label>

  <PageToolbarButton
    variant="primary"
    class="mt-2 h-8 w-full"
    disabled={!canCreate}
    onclick={() => void createLink()}
  >
    {busy ? "Criando..." : "Criar link"}
  </PageToolbarButton>

  {#if shareUrl}
    <div class="mt-2 flex items-center gap-1 px-1">
      <input
        class="h-8 min-w-0 flex-1 rounded-md border border-app-border bg-app-surface px-2 text-xs text-app-fg"
        readonly
        value={shareUrl}
      />
      <PageToolbarButton
        variant="secondary"
        class="h-8 w-8 shrink-0 px-0"
        aria-label={status === "copied" ? "Link copiado" : "Copiar link"}
        onclick={() => void copyLink(shareUrl)}
      >
        {#if status === "copied"}
          <Check />
        {:else}
          <Copy />
        {/if}
      </PageToolbarButton>
    </div>
    <p class="mt-1 px-1 text-[11px] text-app-subtle">
      {status === "copied" ? "Link copiado." : "Link criado."}
    </p>
  {/if}

  {#if error}
    <p class="mt-2 px-1 text-[11px] text-destructive">{error}</p>
  {/if}
</ToolbarAnchoredPopover>
