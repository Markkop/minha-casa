<script lang="ts">
  import AdminAddonManager from "$lib/admin/AdminAddonManager.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import type { AdminState, GrantReason } from "./use-admin-state.svelte";

  let { admin }: { admin: AdminState } = $props();

  const grantReasons: { value: GrantReason; label: string }[] = [
    { value: "friend", label: "Amigo" },
    { value: "pilot", label: "Cliente piloto" },
    { value: "test", label: "Teste" },
    { value: "support", label: "Suporte" },
    { value: "promotion", label: "Promoção" },
    { value: "other", label: "Outro" }
  ];
</script>

{#if admin.isUserMode()}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button type="button" class="absolute inset-0 bg-black/40" aria-label="Fechar modal" onclick={admin.closeModal}></button>
    <div
      class="relative z-10 max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-md border border-app-border bg-app-surface p-5 shadow-xl"
      role="dialog"
      aria-modal="true"
      aria-label={admin.mode === "edit-user"
        ? "Editar usuário"
        : admin.mode === "grant-subscription"
          ? "Conceder plano"
          : admin.mode === "subscriptions"
            ? "Histórico de concessões"
            : "Capacidades do usuário"}
      tabindex="-1"
      onkeydown={admin.handleModalKeydown}
    >
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">
            {#if admin.mode === "edit-user"}Editar usuário{:else if admin.mode === "grant-subscription"}Conceder plano{:else if admin.mode === "subscriptions"}Histórico de concessões{:else}Capacidades do usuário{/if}
          </h2>
          <p class="text-sm text-app-muted">{admin.selectedUser?.email}</p>
        </div>
        <Button variant="ghost" onclick={admin.closeModal}>Fechar</Button>
      </div>

      {#if admin.mode === "edit-user" && admin.selectedUser}
        <form
          class="space-y-4"
          onsubmit={(event) => {
            event.preventDefault();
            void admin.saveUserName();
          }}
        >
          <label class="block text-sm">
            Nome
            <input class="mt-1 h-10 w-full rounded-md border border-app-border bg-white px-3" bind:value={admin.editName} />
          </label>
          <div class="flex justify-end gap-2"><Button type="submit" disabled={admin.saving}>Salvar</Button></div>
        </form>
      {:else if admin.mode === "grant-subscription" && admin.selectedUser}
        <form
          class="space-y-4"
          onsubmit={(event) => {
            event.preventDefault();
            void admin.grantSubscription();
          }}
        >
          <div class="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            A concessão usa o contrato atual de assinatura manual e não altera uma assinatura Stripe diretamente.
          </div>
          <label class="block text-sm">
            Plano
            <select
              class="mt-1 h-10 w-full rounded-md border border-app-border bg-white px-3"
              value={admin.selectedPlanId}
              onchange={(event) => admin.selectGrantPlan(event.currentTarget.value)}
            >
              {#each admin.paidPlans as plan}
                <option value={plan.id}>{plan.name} · {admin.formatMoney(plan.priceInCents)}</option>
              {/each}
            </select>
          </label>
          {#if admin.selectedPlan?.slug === "imobiliaria"}
            <div class="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              A Imobiliária e seu workspace serão criados automaticamente caso o usuário ainda não tenha um.
            </div>
          {/if}
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block text-sm">
              Duração em dias
              <input class="mt-1 h-10 w-full rounded-md border border-app-border bg-white px-3" type="number" min="1" bind:value={admin.subscriptionDays} />
            </label>
            <label class="block text-sm">
              Motivo
              <select class="mt-1 h-10 w-full rounded-md border border-app-border bg-white px-3" bind:value={admin.grantReason}>
                {#each grantReasons as reason}
                  <option value={reason.value}>{reason.label}</option>
                {/each}
              </select>
            </label>
          </div>
          <label class="block text-sm">
            Nota interna
            <textarea class="mt-1 min-h-20 w-full rounded-md border border-app-border bg-white p-3" placeholder="Contexto da concessão" bind:value={admin.grantNotes}></textarea>
          </label>
          <div class="flex justify-end gap-2"><Button type="submit" disabled={admin.saving}>Confirmar concessão</Button></div>
        </form>
      {:else if admin.mode === "subscriptions" && admin.selectedUser}
        <div class="space-y-3">
          {#if admin.subscriptions.length === 0}
            <p class="text-sm text-app-muted">Sem histórico de assinaturas ou concessões.</p>
          {/if}
          {#each admin.subscriptions as subscription (subscription.id)}
            <div class="rounded-md border border-app-border bg-white p-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div class="font-medium">{subscription.plan?.name ?? subscription.planId}</div>
                  <div class="text-sm text-app-muted">
                    {admin.formatDate(subscription.startsAt)} até {admin.formatDate(subscription.expiresAt)}
                    {#if subscription.source} · {subscription.source}{/if}
                  </div>
                  {#if subscription.notes}<div class="mt-1 text-xs text-app-muted">{subscription.notes}</div>{/if}
                </div>
                <span class={`rounded px-2 py-1 text-xs ${admin.statusClass(subscription.status, subscription.expiresAt)}`}>
                  {admin.statusLabel(subscription.status, subscription.expiresAt)}
                </span>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <Button class="h-8 px-3" variant="secondary" onclick={() => admin.startEditSubscription(subscription)}>Editar ou estender</Button>
                {#if subscription.status === "active"}
                  <Button class="h-8 px-3" variant="secondary" onclick={() => void admin.setSubscriptionStatus(subscription, "cancelled")}>Revogar</Button>
                {:else}
                  <Button class="h-8 px-3" variant="secondary" onclick={() => void admin.setSubscriptionStatus(subscription, "active")}>Reativar</Button>
                {/if}
              </div>
              {#if admin.editSubscriptionId === subscription.id}
                <form
                  class="mt-3 grid gap-3 md:grid-cols-3"
                  onsubmit={(event) => {
                    event.preventDefault();
                    void admin.saveSubscription();
                  }}
                >
                  <select class="h-10 rounded-md border border-app-border bg-white px-3" bind:value={admin.editSubscriptionStatus}>
                    <option value="active">Ativa</option>
                    <option value="expired">Expirada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                  <input class="h-10 rounded-md border border-app-border bg-white px-3" type="date" bind:value={admin.editSubscriptionExpiresAt} />
                  <input class="h-10 rounded-md border border-app-border bg-white px-3" placeholder="Notas" bind:value={admin.editSubscriptionNotes} />
                  <Button class="md:col-span-3" type="submit" disabled={admin.saving}>Salvar concessão</Button>
                </form>
              {/if}
            </div>
          {/each}
        </div>
      {:else if admin.mode === "user-addons" && admin.selectedUser}
        <AdminAddonManager
          addons={admin.addons}
          grants={admin.userAddons}
          bind:selectedAddonSlug={admin.selectedAddonSlug}
          bind:addonExpiresAt={admin.addonExpiresAt}
          grant={admin.grantUserAddon}
          revoke={admin.revokeUserAddon}
          saving={admin.saving}
        />
      {/if}
    </div>
  </div>
{/if}
