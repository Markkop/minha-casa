<script lang="ts">
  import ModalCloseButton from "$lib/components/listings/ModalCloseButton.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { isPlatformSuperAdmin } from "$lib/admin/platform-role";
  import type { AdminUser } from "$lib/admin/client";

  let { user, onClose } = $props<{
    user: AdminUser;
    onClose: () => void;
  }>();

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }

  function isExpired(expiresAt: string) {
    return new Date(expiresAt) < new Date();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    onClose();
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
  <button
    type="button"
    class="absolute inset-0 bg-app-fg/50"
    aria-label="Fechar modal"
    onclick={onClose}
  ></button>

  <div
    class="relative z-10 mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="user-details-title"
    tabindex="-1"
  >
    <div class="border-b border-app-border px-6 py-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 id="user-details-title" class="text-lg font-semibold leading-none">Detalhes do Usuário</h2>
          <p class="mt-1.5 text-sm text-app-muted">Visualize e gerencie informações do usuário</p>
        </div>
        <ModalCloseButton onclick={onClose} />
      </div>
    </div>

    <div class="space-y-6 overflow-y-auto px-6 py-5">
      <div class="grid grid-cols-1 gap-4 rounded-lg bg-app-surface-muted/80 p-4 md:grid-cols-2">
        <div>
          <span class="text-sm text-app-muted">Nome</span>
          <p class="font-medium">{user.name}</p>
        </div>
        <div>
          <span class="text-sm text-app-muted">Email</span>
          <p class="font-medium">{user.email}</p>
        </div>
        <div>
          <span class="text-sm text-app-muted">Criado em</span>
          <p class="font-medium">{formatDate(user.createdAt)}</p>
        </div>
        {#if user.lastSeenAt}
          <div>
            <span class="text-sm text-app-muted">Último acesso</span>
            <p class="font-medium">{formatDateTime(user.lastSeenAt)}</p>
          </div>
        {/if}
        <div>
          <span class="text-sm text-app-muted">Status</span>
          <div class="mt-1 flex flex-wrap items-center gap-2">
            {#if isPlatformSuperAdmin(user)}
              <span class="rounded px-2 py-0.5 text-xs bg-blue-100 text-blue-700">Super Admin</span>
            {/if}
            {#if user.emailVerified}
              <span class="rounded px-2 py-0.5 text-xs bg-emerald-100 text-emerald-800">Email Verificado</span>
            {:else}
              <span class="rounded px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700">Email Pendente</span>
            {/if}
          </div>
        </div>
      </div>

      {#if user.workspaces?.length}
        <div>
          <h3 class="mb-3 text-lg font-medium">Workspaces e memberships</h3>
          <div class="grid gap-2 sm:grid-cols-2">
            {#each user.workspaces as workspace (workspace.id)}
              <div class="rounded-lg border border-app-border p-3">
                <div class="font-medium">{workspace.name}</div>
                <div class="text-xs text-app-muted">{workspace.type}{workspace.role ? ` · ${workspace.role}` : ""}</div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <div>
        <h3 class="mb-3 text-lg font-medium">Assinatura</h3>
        {#if user.subscription?.plan}
          <div class="rounded-lg border border-app-border p-4">
            <div class="mb-2 flex items-center gap-2">
              <span class="font-medium">{user.subscription.plan.name}</span>
              <span
                class={`rounded px-2 py-0.5 text-xs ${
                  isExpired(user.subscription.expiresAt)
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {isExpired(user.subscription.expiresAt) ? "Expirada" : "Ativa"}
              </span>
            </div>
            <p class="text-sm text-app-muted">Expira em: {formatDate(user.subscription.expiresAt)}</p>
          </div>
        {:else}
          <p class="rounded-lg border border-app-border p-4 text-app-muted">Nenhuma assinatura ativa</p>
        {/if}
      </div>

      <div class="flex justify-end border-t border-app-border pt-4">
        <Button variant="outline" onclick={onClose}>Fechar</Button>
      </div>
    </div>
  </div>
</div>
