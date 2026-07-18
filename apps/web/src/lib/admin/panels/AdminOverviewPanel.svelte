<script lang="ts">
  import { AlertTriangle, ShieldCheck } from "@lucide/svelte";
  import AdminStripePanel from "./AdminStripePanel.svelte";
  import type { AdminState } from "./use-admin-state.svelte";

  let { admin }: { admin: AdminState } = $props();
</script>

<div class="space-y-4">
  <section class="rounded-md border border-app-border bg-app-surface p-4">
    <div class="flex items-start gap-3">
      <span class="rounded-md bg-app-surface-muted p-2"><ShieldCheck class="h-5 w-5 text-app-accent" /></span>
      <div>
        <h2 class="font-semibold">Operação global da plataforma</h2>
        <p class="mt-1 text-sm text-app-muted">
          Esta área controla contas e entitlements da plataforma inteira. Administradores de Família ou Imobiliária
          não recebem acesso de Super Admin.
        </p>
      </div>
    </div>
  </section>

  {#if admin.stats}
    <section class="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
      {#each [
        ["Usuários", admin.stats.totalUsers],
        ["Super Admins", admin.stats.totalAdmins],
        ["Assinaturas", admin.stats.activeSubscriptions],
        ["Famílias e imobiliárias", admin.organizations.length],
        ["Coleções", admin.stats.totalCollections],
        ["Anúncios", admin.stats.totalListings],
        ["Novos em 30 dias", admin.stats.recentUsers]
      ] as item}
        <div class="rounded-md border border-app-border bg-app-surface p-4">
          <div class="text-xs text-app-muted">{item[0]}</div>
          <div class="mt-1 text-2xl font-semibold">{item[1]}</div>
        </div>
      {/each}
    </section>

    {#if admin.stats.manualGrants !== undefined || admin.stats.frozenWorkspaces !== undefined || admin.stats.billingFailures !== undefined}
      <section class="grid gap-3 sm:grid-cols-3">
        {#if admin.stats.manualGrants !== undefined}
          <div class="rounded-md border border-app-border bg-app-surface p-4">
            <div class="text-xs text-app-muted">Concessões manuais</div>
            <div class="mt-1 text-xl font-semibold">{admin.stats.manualGrants}</div>
          </div>
        {/if}
        {#if admin.stats.frozenWorkspaces !== undefined}
          <div class="rounded-md border border-app-border bg-app-surface p-4">
            <div class="text-xs text-app-muted">Workspaces congelados</div>
            <div class="mt-1 text-xl font-semibold">{admin.stats.frozenWorkspaces}</div>
          </div>
        {/if}
        {#if admin.stats.billingFailures !== undefined}
          <div class="rounded-md border border-app-border bg-app-surface p-4">
            <div class="flex items-center gap-2 text-xs text-app-muted"><AlertTriangle class="h-4 w-4" /> Falhas de billing</div>
            <div class="mt-1 text-xl font-semibold">{admin.stats.billingFailures}</div>
          </div>
        {/if}
      </section>
    {/if}

    {#if admin.stats.subscriptionsByPlan.length > 0}
      <section class="rounded-md border border-app-border bg-app-surface">
        <div class="border-b border-app-border p-4">
          <h2 class="font-semibold">Assinaturas ativas por plano</h2>
          <p class="text-sm text-app-muted">Distribuição retornada pelo catálogo e pelas assinaturas atuais.</p>
        </div>
        <div class="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {#each admin.stats.subscriptionsByPlan as plan (plan.planSlug)}
            <div class="rounded-md bg-app-surface-muted p-3">
              <div class="text-sm text-app-muted">{plan.planName}</div>
              <div class="mt-1 text-xl font-semibold">{plan.count}</div>
            </div>
          {/each}
        </div>
      </section>
    {/if}
  {/if}

  <AdminStripePanel {admin} />
</div>
