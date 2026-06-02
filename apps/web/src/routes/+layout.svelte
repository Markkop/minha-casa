<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import {
    clearLegacyOrganizationStorage,
    readLegacyOrganizationIdFromStorage,
    setActiveOrganizationId,
    setActiveOrganizationIdCache
  } from "$lib/active-organization";
  import type { LayoutData } from "./$types";

  let { children, data } = $props<{
    children?: import("svelte").Snippet;
    data: LayoutData;
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
</script>

{@render children?.()}
