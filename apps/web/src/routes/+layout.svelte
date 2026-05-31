<script lang="ts">
  import "../app.css";
  import { page } from "$app/stores";
  import WorkspaceShell from "$lib/components/layout/WorkspaceShell.svelte";

  let { children, data } = $props<{
    children?: import("svelte").Snippet;
    data: App.PageData;
  }>();

  const unframed = new Set([
    "/",
    "/login",
    "/signup",
    "/privacy",
    "/terms",
    "/data-deletion",
    "/subscribe",
    "/planos",
    "/conectar-whatsapp",
    "/conectar-telegram"
  ]);
</script>

{#if unframed.has($page.url.pathname) || $page.url.pathname.startsWith("/share/") || $page.url.pathname.startsWith("/s/")}
  {@render children?.()}
{:else}
  <WorkspaceShell user={data.user}>
    {@render children?.()}
  </WorkspaceShell>
{/if}
