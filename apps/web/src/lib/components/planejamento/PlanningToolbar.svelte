<script lang="ts">
  import {
    CalendarDays,
    Download,
    Maximize2,
    Minus,
    PanelRightOpen,
    Plus
  } from "@lucide/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import { workspacePageToolbarRowClass } from "$lib/workspace-chrome";

  let {
    name,
    onNameChange,
    onZoomIn,
    onZoomOut,
    onToday,
    onFit,
    onImport,
    onOpenSidebar
  }: {
    name: string;
    onNameChange: (name: string) => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onToday: () => void;
    onFit: () => void;
    onImport: () => void;
    onOpenSidebar: () => void;
  } = $props();
</script>

<div class="{workspacePageToolbarRowClass} justify-between">
  <div class="flex min-w-0 flex-1 items-center gap-2">
    <Input
      value={name}
      ariaLabel="Nome do planejamento"
      class="h-8 min-w-32 max-w-64 border-transparent bg-transparent px-2 font-semibold shadow-none hover:border-app-border focus:border-app-border"
      oninput={(event) => onNameChange(event.currentTarget.value)}
    />
  </div>

  <div class="flex items-center gap-1">
    <Button variant="ghost" size="icon" title="Diminuir zoom" onclick={onZoomOut}>
      <Minus class="size-4" />
    </Button>
    <Button variant="ghost" size="icon" title="Aumentar zoom" onclick={onZoomIn}>
      <Plus class="size-4" />
    </Button>
    <Button variant="ghost" size="icon" title="Ir para hoje" onclick={onToday}>
      <CalendarDays class="size-4" />
    </Button>
    <Button variant="ghost" size="icon" title="Ajustar à tela" onclick={onFit}>
      <Maximize2 class="size-4" />
    </Button>
    <Button variant="outline" size="sm" class="hidden sm:inline-flex" onclick={onImport}>
      <Download class="size-3.5" />
      Importar simulador
    </Button>
    <Button variant="ghost" size="icon" title="Abrir eventos" onclick={onOpenSidebar}>
      <PanelRightOpen class="size-4" />
    </Button>
  </div>
</div>
