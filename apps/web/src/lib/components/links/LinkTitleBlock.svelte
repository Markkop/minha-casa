<script lang="ts">
  import { ExternalLink } from "@lucide/svelte";

  let {
    title,
    url,
    enriching = false
  }: {
    title: string;
    url: string;
    enriching?: boolean;
  } = $props();
</script>

{#if enriching}
  <span class="text-sm text-app-muted animate-pulse">Carregando…</span>
{:else}
  <div class="inline-flex max-w-full min-w-0 items-center gap-1">
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      class="min-w-0 cursor-pointer truncate font-medium leading-snug text-app-fg transition-colors hover:underline"
      title={title}
    >
      {title || "—"}
    </a>
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      class="shrink-0 text-app-muted transition-colors hover:text-app-fg"
      title="Abrir link"
      aria-label="Abrir link"
    >
      <ExternalLink class="h-3.5 w-3.5" />
    </a>
  </div>
{/if}
