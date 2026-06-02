<script lang="ts">
  import AdminAddonManager from "$lib/admin/AdminAddonManager.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import type { AdminState } from "./use-admin-state.svelte";

  let { admin }: { admin: AdminState } = $props();
</script>

<section class="rounded-md border border-app-border bg-app-surface">
  <div class="border-b border-app-border p-4">
    <h2 class="font-semibold">Addons por organizacao</h2>
    <p class="text-sm text-app-muted">Concessoes atuais e atalhos para gerenciar cada organizacao.</p>
  </div>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[760px] text-left text-sm">
      <thead class="bg-app-surface-muted text-xs uppercase text-app-muted">
        <tr><th class="px-3 py-3">Organizacao</th><th class="px-3 py-3">Dono</th><th class="px-3 py-3">Addons</th><th class="px-3 py-3">Acoes</th></tr>
      </thead>
      <tbody>
        {#each admin.organizations as org (org.id)}
          <tr class="border-t border-app-border">
            <td class="px-3 py-3"><span class="font-medium">{org.name}</span><span class="ml-2 font-mono text-xs text-app-muted">@{org.slug}</span></td>
            <td class="px-3 py-3">{org.owner?.email ?? "-"}</td>
            <td class="px-3 py-3">
              {#if org.addons?.length}
                <div class="flex flex-wrap gap-1">
                  {#each org.addons as grant}
                    <span class={`rounded px-2 py-1 text-xs ${grant.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{grant.addonName}</span>
                  {/each}
                </div>
              {:else}
                <span class="text-app-muted">-</span>
              {/if}
            </td>
            <td class="px-3 py-3"><Button class="h-8 px-3" variant="secondary" onclick={() => void admin.openOrgAddons(org)}>Gerenciar</Button></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

{#if admin.mode === "org-addons"}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button type="button" class="absolute inset-0 bg-black/40" aria-label="Fechar modal" onclick={admin.closeModal}></button>
    <div
      class="relative z-10 max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-md border border-app-border bg-app-surface p-5 shadow-xl"
      role="dialog"
      aria-modal="true"
      aria-label="Addons da organizacao"
      tabindex="-1"
      onkeydown={admin.handleModalKeydown}
    >
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">Addons da organizacao</h2>
          <p class="text-sm text-app-muted">{admin.selectedOrg?.name}</p>
        </div>
        <Button variant="ghost" onclick={admin.closeModal}>Fechar</Button>
      </div>

      {#if admin.selectedOrg}
        <AdminAddonManager
          addons={admin.addons}
          grants={admin.orgAddons}
          bind:selectedAddonSlug={admin.selectedAddonSlug}
          bind:addonExpiresAt={admin.addonExpiresAt}
          grant={admin.grantOrgAddon}
          revoke={admin.revokeOrgAddon}
          saving={admin.saving}
        />
      {/if}
    </div>
  </div>
{/if}
