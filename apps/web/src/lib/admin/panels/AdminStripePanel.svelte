<script lang="ts">
  import { RefreshCcw } from "@lucide/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import type { AdminState } from "./use-admin-state.svelte";

  let { admin }: { admin: AdminState } = $props();
</script>

<section class="rounded-md border border-app-border bg-app-surface">
  <div class="flex flex-col gap-3 border-b border-app-border p-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="font-semibold">Reconciliacao Stripe</h2>
      <p class="text-sm text-app-muted">Compara as assinaturas Stripe com os registros locais.</p>
    </div>
    <Button variant="secondary" onclick={() => void admin.loadStripeReconciliation()} disabled={admin.loadingStripe}>
      <RefreshCcw class="h-4 w-4" /> {admin.loadingStripe ? "Consultando..." : "Consultar"}
    </Button>
  </div>

  {#if admin.loadingStripe}
    <div class="p-4 text-sm text-app-muted">Consultando Stripe...</div>
  {:else if admin.stripeReconciliation}
    <div class="grid gap-3 border-b border-app-border p-4 md:grid-cols-5">
      {#each [
        ["Stripe", admin.stripeReconciliation.summary.totalStripeSubscriptions],
        ["Locais", admin.stripeReconciliation.summary.totalLocalSubscriptions],
        ["Casadas", admin.stripeReconciliation.summary.matched],
        ["Faltando local", admin.stripeReconciliation.summary.missingLocally],
        ["Status divergente", admin.stripeReconciliation.summary.staleStatus]
      ] as item}
        <div class="rounded-md border border-app-border bg-white p-3">
          <div class="text-xs text-app-muted">{item[0]}</div>
          <div class="mt-1 text-2xl font-semibold">{item[1]}</div>
        </div>
      {/each}
    </div>

    <div class="grid gap-4 p-4 lg:grid-cols-2">
      <div>
        <h3 class="mb-3 text-sm font-semibold">Faltando localmente</h3>
        {#if admin.stripeReconciliation.discrepancies.missingLocally.length === 0}
          <p class="text-sm text-app-muted">Nenhuma assinatura Stripe sem registro local.</p>
        {:else}
          <div class="space-y-2">
            {#each admin.stripeReconciliation.discrepancies.missingLocally as row}
              <div class="rounded-md border border-app-border bg-white p-3 text-sm">
                <div class="font-mono text-xs">{row.stripeSubscriptionId}</div>
                <div class="mt-1 text-app-muted">{row.stripeStatus} · cliente {row.stripeCustomerId ?? "-"}</div>
                <div class="text-app-muted">Periodo: {admin.formatDate(row.currentPeriodEnd)}</div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div>
        <h3 class="mb-3 text-sm font-semibold">Status divergente</h3>
        {#if admin.stripeReconciliation.discrepancies.staleStatus.length === 0}
          <p class="text-sm text-app-muted">Nenhuma divergencia de status.</p>
        {:else}
          <div class="space-y-2">
            {#each admin.stripeReconciliation.discrepancies.staleStatus as row}
              <div class="rounded-md border border-app-border bg-white p-3 text-sm">
                <div class="font-medium">{row.userEmail}</div>
                <div class="mt-1 font-mono text-xs">{row.stripeSubscriptionId}</div>
                <div class="mt-1 text-app-muted">Local: {row.localStatus}</div>
                <div class="text-app-muted">Stripe: {row.stripeStatus}</div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="p-4 text-sm text-app-muted">Clique em consultar para buscar dados atuais do Stripe.</div>
  {/if}
</section>
