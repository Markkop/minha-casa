<script lang="ts">
  let { url }: { url: string } = $props();
</script>

<a
  href={url}
  target="_blank"
  rel="noreferrer"
  class="mt-1 block min-w-0 truncate text-xs text-app-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-app-fg"
  title={url}
>
  {url}
</a>
