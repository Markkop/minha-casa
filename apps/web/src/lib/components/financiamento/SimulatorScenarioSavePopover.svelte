<script lang="ts">
  import { Bookmark } from "@lucide/svelte";
  import PageToolbarButton from "$lib/components/page-toolbar/PageToolbarButton.svelte";
  import PageToolbarIconButton from "$lib/components/page-toolbar/PageToolbarIconButton.svelte";
  import ToolbarAnchoredPopover from "$lib/components/anuncios/ToolbarAnchoredPopover.svelte";
  import Input from "$lib/components/ui/Input.svelte";

  let {
    open = $bindable(false),
    suggestedName,
    canCreate = true,
    onCreate
  }: {
    open?: boolean;
    suggestedName: string;
    canCreate?: boolean;
    onCreate: (name: string) => void;
  } = $props();

  let name = $state("");

  $effect(() => {
    if (!open) return;
    name = suggestedName;
  });

  function close() {
    open = false;
  }

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    close();
  }
</script>

<ToolbarAnchoredPopover bind:open align="end" panelClass="w-64 p-2">
  {#snippet trigger()}
    <PageToolbarIconButton
      variant="secondary"
      aria-label="Salvar cenário local"
      title="Salvar cenário local"
      tooltipDisabled={open}
      onclick={() => (open = !open)}
    >
      <Bookmark />
    </PageToolbarIconButton>
  {/snippet}

  <p class="px-1 pb-2 text-[11px] leading-snug text-app-subtle">
    Salve localmente os parâmetros, filtros e seleções de gráficos atuais em um cenário.
  </p>

  <label class="flex flex-col gap-1 px-1">
    <span class="text-xs font-medium text-app-muted">Nome</span>
    <Input
      bind:value={name}
      class="h-8 py-0 text-sm"
      ariaLabel="Nome do cenário"
      onkeydown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          submit();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
    />
  </label>

  <div class="mt-2 flex flex-col gap-1">
    <PageToolbarButton
      variant="primary"
      class="h-8 w-full"
      disabled={!name.trim() || !canCreate}
      onclick={submit}
    >
      Salvar cenário
    </PageToolbarButton>
  </div>

  {#if !canCreate}
    <p class="mt-2 px-1 text-[11px] text-destructive">
      Limite de 20 cenários atingido.
    </p>
  {/if}
</ToolbarAnchoredPopover>
