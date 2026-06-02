<script lang="ts">
  import { Pencil, Shield, Trash2 } from "@lucide/svelte";
  import AdminAddonManager from "$lib/admin/AdminAddonManager.svelte";
  import UserDetailsModal from "$lib/admin/UserDetailsModal.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import type { AdminState } from "./use-admin-state.svelte";

  let { admin }: { admin: AdminState } = $props();
</script>

<section class="rounded-md border border-app-border bg-app-surface">
  <div class="flex flex-col gap-3 border-b border-app-border p-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="font-semibold">Usuarios ({admin.users.length})</h2>
      <p class="text-sm text-app-muted">Gerencie administradores, assinaturas e addons pessoais.</p>
    </div>
    <input
      class="h-10 rounded-md border border-app-border bg-white px-3 text-sm"
      placeholder="Buscar por nome ou email"
      bind:value={admin.search}
    />
  </div>

  <div class="overflow-x-auto">
    <table class="w-full min-w-[920px] text-left text-sm">
      <thead class="bg-app-surface-muted text-xs uppercase text-app-muted">
        <tr>
          <th class="px-3 py-3">Nome</th>
          <th class="px-3 py-3">Email</th>
          <th class="px-3 py-3">Assinatura</th>
          <th class="px-3 py-3">Expira</th>
          <th class="px-3 py-3">Criado</th>
          <th class="px-3 py-3">Admin</th>
          <th class="px-3 py-3">Acoes</th>
        </tr>
      </thead>
      <tbody>
        {#each admin.filteredUsers as user (user.id)}
          <tr class="border-t border-app-border">
            <td class="px-3 py-3 font-medium">{user.name}</td>
            <td class="px-3 py-3">{user.email}</td>
            <td class="px-3 py-3">
              {#if user.subscription?.plan}
                <span
                  class={`rounded px-2 py-1 text-xs ${admin.statusClass(user.subscription.status, user.subscription.expiresAt)}`}
                >
                  {user.subscription.plan.name}
                </span>
              {:else}
                <span class="text-app-muted">-</span>
              {/if}
            </td>
            <td class="px-3 py-3">{admin.formatDate(user.subscription?.expiresAt)}</td>
            <td class="px-3 py-3">{admin.formatDate(user.createdAt)}</td>
            <td class="px-3 py-3">
              <label class="inline-flex items-center gap-2">
                <input type="checkbox" checked={user.isAdmin} onchange={() => void admin.toggleAdmin(user)} disabled={admin.saving} />
                <Shield class="h-4 w-4 text-app-muted" />
              </label>
            </td>
            <td class="px-3 py-3">
              <div class="flex flex-wrap gap-2">
                <Button class="h-8 px-3" variant="outline" onclick={() => admin.openUserDetails(user)}>Detalhes</Button>
                <Button class="h-8 px-3" variant="secondary" onclick={() => admin.openEditUser(user)}><Pencil class="h-4 w-4" /> Editar</Button>
                <Button class="h-8 px-3" variant="secondary" onclick={() => admin.openGrantSubscription(user)}>Conceder</Button>
                <Button class="h-8 px-3" variant="secondary" onclick={() => void admin.openSubscriptions(user)}>Assinaturas</Button>
                <Button class="h-8 px-3" variant="secondary" onclick={() => void admin.openUserAddons(user)}>Addons</Button>
                <Button class="h-8 px-3" variant="danger" onclick={() => void admin.deleteUser(user)}><Trash2 class="h-4 w-4" /></Button>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

{#if admin.userDetailsOpen && admin.selectedUser}
  <UserDetailsModal
    user={admin.selectedUser}
    availableAddons={admin.addons}
    onClose={admin.closeUserDetails}
    onUserUpdated={admin.loadAll}
  />
{/if}

{#if admin.isUserMode()}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button type="button" class="absolute inset-0 bg-black/40" aria-label="Fechar modal" onclick={admin.closeModal}></button>
    <div
      class="relative z-10 max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-md border border-app-border bg-app-surface p-5 shadow-xl"
      role="dialog"
      aria-modal="true"
      aria-label={admin.mode === "edit-user"
        ? "Editar usuario"
        : admin.mode === "grant-subscription"
          ? "Conceder assinatura"
          : admin.mode === "subscriptions"
            ? "Assinaturas"
            : "Addons do usuario"}
      tabindex="-1"
      onkeydown={admin.handleModalKeydown}
    >
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">
            {#if admin.mode === "edit-user"}Editar usuario{:else if admin.mode === "grant-subscription"}Conceder assinatura{:else if admin.mode === "subscriptions"}Assinaturas{:else}Addons do usuario{/if}
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
          <label class="block text-sm">
            Plano
            <select class="mt-1 h-10 w-full rounded-md border border-app-border bg-white px-3" bind:value={admin.selectedPlanId}>
              {#each admin.paidPlans as plan}
                <option value={plan.id}>{plan.name} - {admin.formatMoney(plan.priceInCents)}</option>
              {/each}
            </select>
          </label>
          <label class="block text-sm">
            Duracao em dias
            <input class="mt-1 h-10 w-full rounded-md border border-app-border bg-white px-3" type="number" min="1" bind:value={admin.subscriptionDays} />
          </label>
          <div class="flex justify-end gap-2"><Button type="submit" disabled={admin.saving}>Conceder</Button></div>
        </form>
      {:else if admin.mode === "subscriptions" && admin.selectedUser}
        <div class="space-y-3">
          {#if admin.subscriptions.length === 0}
            <p class="text-sm text-app-muted">Sem historico de assinaturas.</p>
          {/if}
          {#each admin.subscriptions as subscription (subscription.id)}
            <div class="rounded-md border border-app-border bg-white p-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div class="font-medium">{subscription.plan?.name ?? subscription.planId}</div>
                  <div class="text-sm text-app-muted">
                    {admin.formatDate(subscription.startsAt)} ate {admin.formatDate(subscription.expiresAt)}
                  </div>
                </div>
                <span class={`rounded px-2 py-1 text-xs ${admin.statusClass(subscription.status, subscription.expiresAt)}`}
                  >{admin.statusLabel(subscription.status, subscription.expiresAt)}</span
                >
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <Button class="h-8 px-3" variant="secondary" onclick={() => admin.startEditSubscription(subscription)}>Editar</Button>
                {#if subscription.status === "active"}
                  <Button class="h-8 px-3" variant="secondary" onclick={() => void admin.setSubscriptionStatus(subscription, "cancelled")}>Cancelar</Button>
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
                  <Button class="md:col-span-3" type="submit" disabled={admin.saving}>Salvar assinatura</Button>
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
