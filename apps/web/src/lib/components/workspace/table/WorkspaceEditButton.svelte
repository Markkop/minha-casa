<script lang="ts">
  import { Pencil } from "@lucide/svelte";
  import WorkspaceTableIconButton from "./WorkspaceTableIconButton.svelte";

  let {
    onclick,
    disabled = false
  }: {
    onclick?: (event: MouseEvent) => void;
    disabled?: boolean;
  } = $props();
</script>

<WorkspaceTableIconButton {onclick} {disabled} title="Editar" ariaLabel="Editar">
  <Pencil class="h-4 w-4" />
</WorkspaceTableIconButton>
