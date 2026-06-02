<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import type { AdminAddon, AdminAddonGrant } from "$lib/admin/client";

  let {
    addons,
    grants,
    selectedAddonSlug = $bindable(),
    addonExpiresAt = $bindable(),
    grant,
    revoke,
    saving = false
  } = $props<{
    addons: AdminAddon[];
    grants: AdminAddonGrant[];
    selectedAddonSlug: string;
    addonExpiresAt: string;
    grant: () => void | Promise<void>;
    revoke: (grant: AdminAddonGrant) => void | Promise<void>;
    saving?: boolean;
  }>();

  function formatDate(value: string | null | undefined) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("pt-BR");
  }
</script>

<form
  class="mb-4 grid gap-3 md:grid-cols-[1fr_180px_auto]"
  onsubmit={(event) => {
    event.preventDefault();
    void grant();
  }}
>
  <select class="h-10 rounded-md border border-app-border bg-white px-3" bind:value={selectedAddonSlug}>
    {#each addons as addon}
      <option value={addon.slug}>{addon.name}</option>
    {/each}
  </select>
  <input class="h-10 rounded-md border border-app-border bg-white px-3" type="date" bind:value={addonExpiresAt} />
  <Button type="submit" disabled={saving || !selectedAddonSlug}>Conceder</Button>
</form>

<div class="space-y-2">
  {#if grants.length === 0}
    <p class="text-sm text-app-muted">Nenhum addon concedido.</p>
  {/if}
  {#each grants as grantRow (grantRow.id)}
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-app-border bg-white p-3 text-sm">
      <div>
        <div class="font-medium">{grantRow.addon?.name ?? grantRow.addonSlug}</div>
        <div class="text-app-muted">Concedido em {formatDate(grantRow.grantedAt)} · expira {formatDate(grantRow.expiresAt)}</div>
      </div>
      <div class="flex items-center gap-2">
        <span class={`rounded px-2 py-1 text-xs ${grantRow.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
          {grantRow.enabled ? "Ativo" : "Desabilitado"}
        </span>
        <Button class="h-8 px-3" variant="danger" onclick={() => void revoke(grantRow)}>Revogar</Button>
      </div>
    </div>
  {/each}
</div>
