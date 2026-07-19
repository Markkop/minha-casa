<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import type { AdminState } from "./use-admin-state.svelte";

  let { admin }: { admin: AdminState } = $props();
</script>

<section class="rounded-md border border-app-border bg-app-surface">
  <div class="border-b border-app-border p-4">
    <h2 class="font-semibold">Famílias, imobiliárias e workspaces</h2>
    <p class="text-sm text-app-muted">Consulte os workspaces coletivos e gerencie o plano e as licenças das imobiliárias.</p>
  </div>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[920px] text-left text-sm">
      <thead class="bg-app-surface-muted text-xs uppercase text-app-muted">
        <tr><th class="px-3 py-3">Família ou imobiliária</th><th class="px-3 py-3">Tipo</th><th class="px-3 py-3">Owner</th><th class="px-3 py-3">Workspace / licenças</th><th class="px-3 py-3">Ações</th></tr>
      </thead>
      <tbody>
        {#each admin.organizations as org (org.id)}
          <tr class="border-t border-app-border">
            <td class="px-3 py-3">
              <div><span class="font-medium">{org.name}</span><span class="ml-2 font-mono text-xs text-app-muted">@{org.slug}</span></div>
              {#if org.frozen}<span class="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Congelado</span>{/if}
            </td>
            <td class="px-3 py-3">{org.kind === "agency" ? "Imobiliária" : "Família"}</td>
            <td class="px-3 py-3">{org.owner?.email ?? "-"}</td>
            <td class="px-3 py-3 text-xs text-app-muted">
              {#if org.workspaceId}<div class="font-mono">{org.workspaceId}</div>{/if}
              {#if org.membersCount !== undefined}<div>{org.membersCount} membros</div>{/if}
              {#if org.licensesUsed !== undefined}<div>{org.licensesUsed}{org.licenseLimit !== undefined ? ` / ${org.licenseLimit}` : ""} licenças</div>{/if}
              {#if !org.workspaceId && org.membersCount === undefined && org.licensesUsed === undefined}<span>-</span>{/if}
            </td>
            <td class="px-3 py-3">
              {#if org.kind === "agency"}
                <Button class="h-8 px-3" variant="secondary" onclick={() => admin.openOrganization(org)}>Gerenciar</Button>
              {:else}<span class="text-app-muted">-</span>{/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

{#if admin.mode === "organization"}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button type="button" class="absolute inset-0 bg-black/40" aria-label="Fechar modal" onclick={admin.closeModal}></button>
    <div
      class="relative z-10 max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-md border border-app-border bg-app-surface p-5 shadow-xl"
      role="dialog"
      aria-modal="true"
      aria-label="Plano e licenças da imobiliária"
      tabindex="-1"
      onkeydown={admin.handleModalKeydown}
    >
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">Plano e licenças da imobiliária</h2>
          <p class="text-sm text-app-muted">{admin.selectedOrg?.name}</p>
        </div>
        <Button variant="ghost" onclick={admin.closeModal}>Fechar</Button>
      </div>

      {#if admin.selectedOrg}
        {#if admin.selectedOrg.kind === "agency"}
          <form
            class="mb-5 space-y-3 rounded-md border border-app-border bg-app-surface-muted p-4"
            onsubmit={(event) => {
              event.preventDefault();
              void admin.saveOrganizationLicenseLimit();
            }}
          >
            <div>
              <h3 class="font-medium">Limite de licenças</h3>
              <p class="text-xs text-app-muted">
                A imobiliária usa {admin.selectedOrg.licensesUsed ?? admin.selectedOrg.membersCount ?? 0} licenças. O limite não pode ser menor que {admin.minimumLicenseLimit}.
              </p>
            </div>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label class="max-w-xs flex-1 text-sm" for="organization-license-limit">
                Licenças disponíveis
                <input
                  id="organization-license-limit"
                  class="mt-1 h-10 w-full rounded-md border border-app-border bg-white px-3"
                  type="number"
                  min={admin.minimumLicenseLimit}
                  step="1"
                  required
                  bind:value={admin.licenseLimit}
                />
              </label>
              <Button type="submit" disabled={admin.saving}>Salvar licenças</Button>
            </div>
          </form>
        {/if}

        {#if admin.selectedOrg.kind === "agency" && admin.agencyPlan}
          <form
            class="mb-5 space-y-3 rounded-md border border-app-border bg-app-surface-muted p-4"
            onsubmit={(event) => {
              event.preventDefault();
              void admin.grantAgencySubscription();
            }}
          >
            <div>
              <h3 class="font-medium">Concessão manual do plano Imobiliária</h3>
              <p class="text-xs text-app-muted">
                Ativa o workspace e as 10 licenças incluídas sem alterar o Stripe.
              </p>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="text-sm">
                Duração em dias
                <input
                  class="mt-1 h-10 w-full rounded-md border border-app-border bg-white px-3"
                  type="number"
                  min="1"
                  bind:value={admin.subscriptionDays}
                />
              </label>
              <label class="text-sm">
                Motivo
                <select
                  class="mt-1 h-10 w-full rounded-md border border-app-border bg-white px-3"
                  bind:value={admin.grantReason}
                >
                  <option value="friend">Amigo</option>
                  <option value="pilot">Cliente piloto</option>
                  <option value="test">Teste</option>
                  <option value="support">Suporte</option>
                  <option value="promotion">Promoção</option>
                  <option value="other">Outro</option>
                </select>
              </label>
            </div>
            <textarea
              class="min-h-20 w-full rounded-md border border-app-border bg-white p-3 text-sm"
              placeholder="Nota interna"
              bind:value={admin.grantNotes}
            ></textarea>
            <Button type="submit" disabled={admin.saving}>Conceder Imobiliária</Button>
          </form>
        {/if}
      {/if}
    </div>
  </div>
{/if}
