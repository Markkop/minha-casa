<script lang="ts">
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import RoomCardPhoto from "$lib/components/analise/RoomCardPhoto.svelte";

  let {
    imageIndices,
    imageUrls
  }: {
    imageIndices: number[];
    imageUrls: string[];
  } = $props();
</script>

{#if imageIndices.length > 0}
  <WorkspacePanel
    class="mb-3 break-inside-avoid overflow-hidden border border-dashed border-app-border p-0"
  >
    <div class="border-b border-app-border px-3 py-2">
      <h4 class="text-sm font-semibold text-app-muted">Outros</h4>
      <p class="text-xs text-app-muted">
        {imageIndices.length} foto{imageIndices.length !== 1 ? "s" : ""} sem ambiente identificado
      </p>
    </div>
    <RoomCardPhoto {imageUrls} {imageIndices} />
  </WorkspacePanel>
{/if}
