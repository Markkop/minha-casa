<script lang="ts">
  import { onMount } from "svelte";
  import { Building2, CreditCard, History, LayoutDashboard, RefreshCcw, ShieldCheck, Users } from "@lucide/svelte";
  import AdminAuditPanel from "$lib/admin/panels/AdminAuditPanel.svelte";
  import AdminGrantsPanel from "$lib/admin/panels/AdminGrantsPanel.svelte";
  import AdminOverviewPanel from "$lib/admin/panels/AdminOverviewPanel.svelte";
  import AdminOrganizationsPanel from "$lib/admin/panels/AdminOrganizationsPanel.svelte";
  import AdminPlansPanel from "$lib/admin/panels/AdminPlansPanel.svelte";
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

<PageScaffold title="Super Admin" description="Operação global de usuários, planos, concessões e workspaces.">
  {#if admin.error}
    <div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{admin.error}</div>
  {/if}

  <div class="flex flex-wrap gap-2">
    <Button variant={admin.panel === "overview" ? "primary" : "secondary"} onclick={() => (admin.panel = "overview")}><LayoutDashboard class="h-4 w-4" /> Visão geral</Button>
    <Button variant={admin.panel === "users" ? "primary" : "secondary"} onclick={() => (admin.panel = "users")}><Users class="h-4 w-4" /> Usuários</Button>
    <Button variant={admin.panel === "grants" ? "primary" : "secondary"} onclick={() => (admin.panel = "grants")}><ShieldCheck class="h-4 w-4" /> Concessões</Button>
    <Button variant={admin.panel === "plans" ? "primary" : "secondary"} onclick={() => (admin.panel = "plans")}><CreditCard class="h-4 w-4" /> Catálogo</Button>
    <Button variant={admin.panel === "workspaces" ? "primary" : "secondary"} onclick={() => (admin.panel = "workspaces")}><Building2 class="h-4 w-4" /> Famílias e imobiliárias</Button>
    <Button variant={admin.panel === "audit" ? "primary" : "secondary"} onclick={() => (admin.panel = "audit")}><History class="h-4 w-4" /> Auditoria</Button>
    <Button variant="secondary" onclick={() => void admin.loadAll()} disabled={admin.loading}><RefreshCcw class="h-4 w-4" /> Atualizar</Button>
  </div>

  {#if admin.loading}
    <div class="rounded-md border border-app-border bg-app-surface p-8 text-sm text-app-muted">Carregando...</div>
  {:else}
    {#if admin.panel === "overview"}
      <AdminOverviewPanel {admin} />
    {:else if admin.panel === "users"}
      <AdminUsersPanel {admin} />
    {:else if admin.panel === "grants"}
      <AdminGrantsPanel {admin} />
    {:else if admin.panel === "plans"}
      <AdminPlansPanel {admin} />
    {:else if admin.panel === "workspaces"}
      <AdminOrganizationsPanel {admin} />
    {:else}
      <AdminAuditPanel {admin} />
    {/if}
  {/if}
</PageScaffold>
