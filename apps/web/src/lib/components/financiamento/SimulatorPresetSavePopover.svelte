<script lang="ts">
  import { Bookmark } from "@lucide/svelte";
  import PageToolbarButton from "$lib/components/page-toolbar/PageToolbarButton.svelte";
  import PageToolbarIconButton from "$lib/components/page-toolbar/PageToolbarIconButton.svelte";
  import ToolbarAnchoredPopover from "$lib/components/anuncios/ToolbarAnchoredPopover.svelte";
  import Input from "$lib/components/ui/Input.svelte";

  let {
    open = $bindable(false),
    activePresetName = null,
    suggestedName,
    canCreate = true,
    onSave
  }: {
    open?: boolean;
    activePresetName?: string | null;
    suggestedName: string;
    canCreate?: boolean;
    onSave: (input: { name: string; mode: "create" | "update" }) => void;
  } = $props();

  let name = $state("");

  $effect(() => {
    if (!open) return;
    name = activePresetName ?? suggestedName;
  });

  function close() {
    open = false;
  }

  function submit(mode: "create" | "update") {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({ name: trimmed, mode });
    close();
  }
</script>

<ToolbarAnchoredPopover bind:open align="end" panelClass="w-64 p-2">
  {#snippet trigger()}
    <PageToolbarIconButton
      variant="secondary"
      aria-label="Salvar configuração"
      title="Salvar configuração"
      tooltipDisabled={open}
      onclick={() => (open = !open)}
    >
      <Bookmark />
    </PageToolbarIconButton>
  {/snippet}

  <p class="px-1 pb-2 text-[11px] leading-snug text-app-subtle">
    Salve os parâmetros, filtros e seleções de gráficos atuais.
  </p>

  <label class="flex flex-col gap-1 px-1">
    <span class="text-xs font-medium text-app-muted">Nome</span>
    <Input
      bind:value={name}
      class="h-8 py-0 text-sm"
      ariaLabel="Nome da configuração"
      onkeydown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          submit(activePresetName ? "update" : "create");
        }
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
    />
  </label>

  <div class="mt-2 flex flex-col gap-1">
    {#if activePresetName}
      <PageToolbarButton
        variant="primary"
        class="h-8 w-full"
        disabled={!name.trim()}
        onclick={() => submit("update")}
      >
        Atualizar "{activePresetName}"
      </PageToolbarButton>
      <PageToolbarButton
        variant="secondary"
        class="h-8 w-full"
        disabled={!name.trim() || !canCreate}
        onclick={() => submit("create")}
      >
        Salvar como nova
      </PageToolbarButton>
    {:else}
      <PageToolbarButton
        variant="primary"
        class="h-8 w-full"
        disabled={!name.trim() || !canCreate}
        onclick={() => submit("create")}
      >
        Salvar
      </PageToolbarButton>
    {/if}
  </div>

  {#if !canCreate}
    <p class="mt-2 px-1 text-[11px] text-destructive">
      Limite de 20 configurações salvas atingido.
    </p>
  {/if}
</ToolbarAnchoredPopover>
