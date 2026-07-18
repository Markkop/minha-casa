<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import type { AdminState } from "./use-admin-state.svelte";

  let { admin }: { admin: AdminState } = $props();

  function formatLimits(limits: Record<string, unknown>) {
    const entries = Object.entries(limits);
    if (entries.length === 0) return "Sem limites publicados";
    return entries.map(([key, value]) => `${key}: ${String(value)}`).join(" · ");
  }
</script>

<section class="rounded-md border border-app-border bg-app-surface">
  <div class="border-b border-app-border p-4">
    <h2 class="font-semibold">Catálogo de planos</h2>
    <p class="text-sm text-app-muted">Configuração publicada e vínculo com Stripe. Apenas o Price ID possui edição na API atual.</p>
  </div>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[980px] text-left text-sm">
      <thead class="bg-app-surface-muted text-xs uppercase text-app-muted">
        <tr><th class="px-3 py-3">Plano</th><th class="px-3 py-3">Slug</th><th class="px-3 py-3">Preço</th><th class="px-3 py-3">Status</th><th class="px-3 py-3">Limites publicados</th><th class="px-3 py-3">Stripe Price ID</th></tr>
      </thead>
      <tbody>
        {#each admin.plans as plan (plan.id)}
          <tr class="border-t border-app-border">
            <td class="px-3 py-3">
              <div class="font-medium">{plan.name}</div>
              {#if plan.description}<div class="mt-1 max-w-xs text-xs text-app-muted">{plan.description}</div>{/if}
            </td>
            <td class="px-3 py-3 font-mono text-xs">{plan.slug}</td>
            <td class="px-3 py-3">{admin.formatMoney(plan.priceInCents)}</td>
            <td class="px-3 py-3">
              <span class={`rounded px-2 py-1 text-xs ${plan.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                {plan.isActive ? "Disponível" : "Inativo"}
              </span>
            </td>
            <td class="max-w-sm px-3 py-3 text-xs text-app-muted">{formatLimits(plan.limits)}</td>
            <td class="px-3 py-3">
              <div class="flex gap-2">
                <input class="h-9 min-w-0 flex-1 rounded-md border border-app-border bg-white px-3 font-mono text-xs" value={plan.stripePriceId ?? ""} id={`stripe-${plan.id}`} />
                <Button
                  class="h-9 px-3"
                  variant="secondary"
                  onclick={() => void admin.savePlanStripe(plan, document.getElementById(`stripe-${plan.id}`) as HTMLInputElement)}
                >
                  Salvar
                </Button>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
