<script lang="ts">
  import { Pencil, Shield, Trash2 } from "@lucide/svelte";
  import UserDetailsModal from "$lib/admin/UserDetailsModal.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import AdminUserActionsModal from "./AdminUserActionsModal.svelte";
  import type { AdminState } from "./use-admin-state.svelte";

  let { admin }: { admin: AdminState } = $props();
</script>

<section class="rounded-md border border-app-border bg-app-surface">
  <div class="flex flex-col gap-3 border-b border-app-border p-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="font-semibold">Usuários ({admin.users.length})</h2>
      <p class="text-sm text-app-muted">Contas da plataforma e papel global de Super Admin.</p>
    </div>
    <input
      class="h-10 rounded-md border border-app-border bg-white px-3 text-sm"
      placeholder="Buscar por nome, email ou ID"
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
          <th class="px-3 py-3">Papel global</th>
          <th class="px-3 py-3">Ações</th>
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
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-app-surface-muted disabled:opacity-50"
                onclick={() => void admin.toggleAdmin(user)}
                disabled={admin.saving || (admin.isPlatformSuperAdmin(user) && admin.stats?.totalAdmins === 1)}
                title={admin.isPlatformSuperAdmin(user) && admin.stats?.totalAdmins === 1 ? "O último Super Admin não pode ser removido" : "Alterar papel global"}
              >
                <Shield class="h-4 w-4" />
                {admin.isPlatformSuperAdmin(user) ? "Super Admin" : "Usuário"}
              </button>
            </td>
            <td class="px-3 py-3">
              <div class="flex flex-wrap gap-2">
                <Button class="h-8 px-3" variant="outline" onclick={() => admin.openUserDetails(user)}>Detalhes</Button>
                <Button class="h-8 px-3" variant="secondary" onclick={() => admin.openEditUser(user)}><Pencil class="h-4 w-4" /> Editar</Button>
                <Button class="h-8 px-3" variant="secondary" onclick={() => admin.openGrantSubscription(user)}>Conceder</Button>
                <Button class="h-8 px-3" variant="secondary" onclick={() => void admin.openSubscriptions(user)}>Assinaturas</Button>
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
    onClose={admin.closeUserDetails}
  />
{/if}

<AdminUserActionsModal {admin} />
