<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import type { AdminState } from "./use-admin-state.svelte";

  let { admin }: { admin: AdminState } = $props();
</script>

<section class="rounded-md border border-app-border bg-app-surface">
  <div class="border-b border-app-border p-4">
    <h2 class="font-semibold">Planos</h2>
    <p class="text-sm text-app-muted">Mapeamento local de planos e Stripe Price IDs.</p>
  </div>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[760px] text-left text-sm">
      <thead class="bg-app-surface-muted text-xs uppercase text-app-muted">
        <tr><th class="px-3 py-3">Plano</th><th class="px-3 py-3">Slug</th><th class="px-3 py-3">Preco</th><th class="px-3 py-3">Ativo</th><th class="px-3 py-3">Stripe Price ID</th></tr>
      </thead>
      <tbody>
        {#each admin.plans as plan (plan.id)}
          <tr class="border-t border-app-border">
            <td class="px-3 py-3 font-medium">{plan.name}</td>
            <td class="px-3 py-3 font-mono text-xs">{plan.slug}</td>
            <td class="px-3 py-3">{admin.formatMoney(plan.priceInCents)}</td>
            <td class="px-3 py-3">{plan.isActive ? "Sim" : "Nao"}</td>
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
