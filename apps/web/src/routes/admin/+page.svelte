<script lang="ts">
  import { onMount } from "svelte";
  import { Boxes, CreditCard, RefreshCcw, Users, Activity } from "@lucide/svelte";
  import AdminOrgAddonsPanel from "$lib/admin/panels/AdminOrgAddonsPanel.svelte";
  import AdminPlansPanel from "$lib/admin/panels/AdminPlansPanel.svelte";
  import AdminStripePanel from "$lib/admin/panels/AdminStripePanel.svelte";
  import AdminUsersPanel from "$lib/admin/panels/AdminUsersPanel.svelte";
  import { createAdminState } from "$lib/admin/panels/use-admin-state.svelte";
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import Button from "$lib/components/ui/Button.svelte";

  const admin = createAdminState();

  onMount(() => {
    void admin.loadAll();
  });
</script>

<svelte:window onkeydown={admin.handleModalKeydown} />

<PageScaffold title="Admin Dashboard" description="Usuários, assinaturas, planos e addons.">
  {#if admin.error}
    <div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{admin.error}</div>
  {/if}

  <div class="flex flex-wrap gap-2">
    <Button variant={admin.panel === "users" ? "primary" : "secondary"} onclick={() => (admin.panel = "users")}><Users class="h-4 w-4" /> Usuarios</Button>
    <Button variant={admin.panel === "plans" ? "primary" : "secondary"} onclick={() => (admin.panel = "plans")}><CreditCard class="h-4 w-4" /> Planos</Button>
    <Button variant={admin.panel === "org-addons" ? "primary" : "secondary"} onclick={() => (admin.panel = "org-addons")}><Boxes class="h-4 w-4" /> Addons org</Button>
    <Button variant={admin.panel === "stripe" ? "primary" : "secondary"} onclick={() => admin.openStripePanel()}><Activity class="h-4 w-4" /> Stripe</Button>
    <Button variant="secondary" onclick={() => void admin.loadAll()} disabled={admin.loading}><RefreshCcw class="h-4 w-4" /> Atualizar</Button>
  </div>

  {#if admin.loading}
    <div class="rounded-md border border-app-border bg-app-surface p-8 text-sm text-app-muted">Carregando...</div>
  {:else}
    {#if admin.stats}
      <section class="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {#each [
          ["Usuarios", admin.stats.totalUsers],
          ["Admins", admin.stats.totalAdmins],
          ["Assinaturas", admin.stats.activeSubscriptions],
          ["Colecoes", admin.stats.totalCollections],
          ["Anuncios", admin.stats.totalListings],
          ["Planos", admin.stats.activePlans],
          ["30 dias", admin.stats.recentUsers]
        ] as item}
          <div class="rounded-md border border-app-border bg-app-surface p-4">
            <div class="text-xs text-app-muted">{item[0]}</div>
            <div class="mt-1 text-2xl font-semibold">{item[1]}</div>
          </div>
        {/each}
      </section>
    {/if}

    {#if admin.panel === "users"}
      <AdminUsersPanel {admin} />
    {:else if admin.panel === "plans"}
      <AdminPlansPanel {admin} />
    {:else if admin.panel === "org-addons"}
      <AdminOrgAddonsPanel {admin} />
    {:else}
      <AdminStripePanel {admin} />
    {/if}
  {/if}
</PageScaffold>
