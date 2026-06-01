<script lang="ts">
  import { Check, Copy } from "@lucide/svelte";
  import WorkspaceTableIconButton from "$lib/components/workspace/table/WorkspaceTableIconButton.svelte";

  let {
    url,
    disabled = false
  }: {
    url: string;
    disabled?: boolean;
  } = $props();

  let copied = $state(false);

  async function handleCopy() {
    const value = url.trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      copied = true;
      window.setTimeout(() => {
        copied = false;
      }, 2000);
    } catch {
      // ignore — button stays in default state
    }
  }
</script>

<WorkspaceTableIconButton
  title={copied ? "Copiado!" : "Copiar link"}
  ariaLabel={copied ? "Copiado!" : "Copiar link"}
  disabled={disabled || !url.trim()}
  onclick={() => void handleCopy()}
>
  {#if copied}
    <Check class="h-4 w-4" />
  {:else}
    <Copy class="h-4 w-4" />
  {/if}
</WorkspaceTableIconButton>
