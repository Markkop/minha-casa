<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import WorkspaceShell from "$lib/components/layout/WorkspaceShell.svelte";
  import {
    clearLegacyOrganizationStorage,
    readLegacyOrganizationIdFromStorage,
    setActiveOrganizationId,
    setActiveOrganizationIdCache
  } from "$lib/active-organization";

  let { children, data } = $props<{
    children?: import("svelte").Snippet;
    data: App.PageData;
  }>();

  $effect(() => {
    setActiveOrganizationIdCache(data.activeOrganizationId ?? null);
  });

  onMount(() => {
    void migrateLegacyOrganizationContext();
  });

  async function migrateLegacyOrganizationContext() {
    const legacyOrgId = readLegacyOrganizationIdFromStorage();
    if (!legacyOrgId) return;
    if (data.activeOrganizationId === legacyOrgId) {
      clearLegacyOrganizationStorage();
      return;
    }
    try {
      await setActiveOrganizationId(legacyOrgId);
      clearLegacyOrganizationStorage();
    } catch (error) {
      console.warn("[layout] legacy organization migration failed", error);
    }
  }

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

{#if unframed.has(page.url.pathname) || page.url.pathname.startsWith("/share/") || page.url.pathname.startsWith("/s/")}
  {@render children?.()}
{:else}
  <WorkspaceShell user={data.user}>
    {@render children?.()}
  </WorkspaceShell>
{/if}
