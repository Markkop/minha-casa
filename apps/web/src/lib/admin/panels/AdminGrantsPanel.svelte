<script lang="ts">
  import { CalendarPlus, History } from "@lucide/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import AdminUserActionsModal from "./AdminUserActionsModal.svelte";
  import type { AdminState } from "./use-admin-state.svelte";

  let { admin }: { admin: AdminState } = $props();
</script>

<section class="rounded-md border border-app-border bg-app-surface">
  <div class="flex flex-col gap-3 border-b border-app-border p-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="font-semibold">Planos e concessões</h2>
      <p class="text-sm text-app-muted">
        Conceda, estenda, cancele ou reative assinaturas usando os contratos administrativos existentes.
      </p>
    </div>
    <input
      class="h-10 rounded-md border border-app-border bg-white px-3 text-sm"
      placeholder="Buscar por nome, email ou ID"
      bind:value={admin.search}
    />
  </div>

  <div class="overflow-x-auto">
    <table class="w-full min-w-[780px] text-left text-sm">
      <thead class="bg-app-surface-muted text-xs uppercase text-app-muted">
        <tr>
          <th class="px-3 py-3">Usuário</th>
          <th class="px-3 py-3">Plano efetivo</th>
          <th class="px-3 py-3">Status</th>
          <th class="px-3 py-3">Expira</th>
          <th class="px-3 py-3">Ações</th>
        </tr>
      </thead>
      <tbody>
        {#each admin.filteredUsers as user (user.id)}
          <tr class="border-t border-app-border">
            <td class="px-3 py-3">
              <div class="font-medium">{user.name}</div>
              <div class="text-xs text-app-muted">{user.email}</div>
            </td>
            <td class="px-3 py-3">{user.subscription?.plan?.name ?? "Free"}</td>
            <td class="px-3 py-3">
              {#if user.subscription}
                <span class={`rounded px-2 py-1 text-xs ${admin.statusClass(user.subscription.status, user.subscription.expiresAt)}`}>
                  {admin.statusLabel(user.subscription.status, user.subscription.expiresAt)}
                </span>
              {:else}
                <span class="text-app-muted">Sem concessão</span>
              {/if}
            </td>
            <td class="px-3 py-3">{admin.formatDate(user.subscription?.expiresAt)}</td>
            <td class="px-3 py-3">
              <div class="flex flex-wrap gap-2">
                <Button class="h-8 px-3" variant="secondary" onclick={() => admin.openGrantSubscription(user)}>
                  <CalendarPlus class="h-4 w-4" /> Conceder
                </Button>
                <Button class="h-8 px-3" variant="outline" onclick={() => void admin.openSubscriptions(user)}>
                  <History class="h-4 w-4" /> Histórico
                </Button>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<AdminUserActionsModal {admin} />
