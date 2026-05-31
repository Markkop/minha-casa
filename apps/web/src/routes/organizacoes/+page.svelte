<script lang="ts">
  import { onMount } from "svelte";
  import { Building2, Folder, Home, Users } from "@lucide/svelte";
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { getActiveOrganizationId, setActiveOrganizationId } from "$lib/api/client";
  import {
    workspaceApi,
    type Organization,
    type OrganizationMember,
    type OrganizationRole
  } from "$lib/workspace/client";

  let organizations = $state<Organization[]>([]);
  let members = $state<OrganizationMember[]>([]);
  let selectedOrgId = $state<string | null>(null);
  let activeOrgId = $state<string | null>(null);
  let loading = $state(true);
  let loadingMembers = $state(false);
  let saving = $state(false);
  let error = $state("");
  let newOrgName = $state("");
  let newMemberEmail = $state("");
  let newMemberRole = $state<OrganizationRole>("member");

  const selectedOrg = $derived(organizations.find((org) => org.id === selectedOrgId) ?? null);
  const canManageMembers = $derived(selectedOrg?.role === "owner" || selectedOrg?.role === "admin");
  const canDeleteSelected = $derived(selectedOrg?.role === "owner");

  onMount(async () => {
    activeOrgId = getActiveOrganizationId();
    await loadOrganizations();
  });

  async function loadOrganizations() {
    loading = true;
    error = "";
    try {
      organizations = (await workspaceApi.fetchOrganizations()).organizations;
      const next =
        organizations.find((org) => org.id === selectedOrgId) ??
        organizations.find((org) => org.id === activeOrgId) ??
        organizations[0] ??
        null;
      if (next) await selectOrganization(next.id);
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao carregar organizacoes";
    } finally {
      loading = false;
    }
  }

  async function selectOrganization(id: string) {
    selectedOrgId = id;
    loadingMembers = true;
    error = "";
    try {
      members = (await workspaceApi.fetchOrganizationMembers(id)).members;
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao carregar membros";
      members = [];
    } finally {
      loadingMembers = false;
    }
  }

  async function createOrganization() {
    if (!newOrgName.trim()) return;
    saving = true;
    error = "";
    try {
      const { organization } = await workspaceApi.createOrganization({ name: newOrgName.trim() });
      organizations = [organization, ...organizations];
      newOrgName = "";
      await selectOrganization(organization.id);
      activateOrganization(organization.id);
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao criar organizacao";
    } finally {
      saving = false;
    }
  }

  async function deleteOrganization() {
    if (!selectedOrg || !confirm(`Excluir ${selectedOrg.name}? Colecoes da organizacao tambem serao removidas.`)) return;
    saving = true;
    error = "";
    try {
      await workspaceApi.deleteOrganization(selectedOrg.id);
      organizations = organizations.filter((org) => org.id !== selectedOrg.id);
      if (activeOrgId === selectedOrg.id) activateOrganization(null);
      const next = organizations[0] ?? null;
      selectedOrgId = null;
      members = [];
      if (next) await selectOrganization(next.id);
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao excluir organizacao";
    } finally {
      saving = false;
    }
  }

  async function addMember() {
    if (!selectedOrg || !newMemberEmail.trim()) return;
    saving = true;
    error = "";
    try {
      const { member } = await workspaceApi.addOrganizationMember(selectedOrg.id, {
        email: newMemberEmail.trim(),
        role: newMemberRole
      });
      members = [...members, member];
      organizations = organizations.map((org) =>
        org.id === selectedOrg.id ? { ...org, memberCount: org.memberCount + 1 } : org
      );
      newMemberEmail = "";
      newMemberRole = "member";
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao adicionar membro";
    } finally {
      saving = false;
    }
  }

  async function updateMember(member: OrganizationMember, role: OrganizationRole) {
    if (!selectedOrg) return;
    saving = true;
    error = "";
    try {
      const { member: updated } = await workspaceApi.updateOrganizationMember(selectedOrg.id, member.userId, { role });
      members = members.map((item) => (item.userId === updated.userId ? updated : item));
      if (member.userId === selectedOrg.ownerId || selectedOrg.role !== role) {
        await loadOrganizations();
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao atualizar membro";
    } finally {
      saving = false;
    }
  }

  async function removeMember(member: OrganizationMember) {
    if (!selectedOrg || !confirm(`Remover ${member.userName || member.userEmail}?`)) return;
    saving = true;
    error = "";
    try {
      await workspaceApi.removeOrganizationMember(selectedOrg.id, member.userId);
      members = members.filter((item) => item.userId !== member.userId);
      organizations = organizations.map((org) =>
        org.id === selectedOrg.id ? { ...org, memberCount: Math.max(org.memberCount - 1, 0) } : org
      );
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao remover membro";
    } finally {
      saving = false;
    }
  }

  function activateOrganization(id: string | null) {
    activeOrgId = id;
    setActiveOrganizationId(id);
  }

  function roleLabel(role: OrganizationRole) {
    if (role === "owner") return "Dono";
    if (role === "admin") return "Admin";
    return "Membro";
  }

  function formatDate(value: string | null) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("pt-BR");
  }
</script>

<PageScaffold title="Organizacoes" description="Organizacoes, membros e contexto ativo do workspace." status="Svelte port">
  {#if error}
    <div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
  {/if}

  <section class="grid gap-4 lg:grid-cols-[340px_1fr]">
    <aside class="rounded-md border border-app-border bg-app-surface p-4">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold">Organizacoes</h2>
        <Button class="h-8 px-3 text-xs" variant="secondary" onclick={() => activateOrganization(null)}>
          <Home class="h-4 w-4" /> Pessoal
        </Button>
      </div>

      <form class="mt-4 flex gap-2" onsubmit={(event) => { event.preventDefault(); void createOrganization(); }}>
        <input class="h-10 min-w-0 flex-1 rounded-md border border-app-border bg-white px-3 text-sm" placeholder="Nova organizacao" bind:value={newOrgName} />
        <Button type="submit" disabled={saving}>Criar</Button>
      </form>

      {#if loading}
        <p class="mt-4 text-sm text-app-muted">Carregando...</p>
      {:else if organizations.length === 0}
        <p class="mt-4 text-sm leading-6 text-app-muted">Voce ainda nao faz parte de nenhuma organizacao.</p>
      {:else}
        <div class="mt-4 flex flex-col gap-2">
          {#each organizations as org (org.id)}
            <button
              type="button"
              class={[
                "rounded-md border p-3 text-left transition",
                org.id === selectedOrgId ? "border-app-fg bg-app-fg text-white" : "border-app-border bg-white hover:bg-app-surface-muted",
                org.id === activeOrgId && org.id !== selectedOrgId ? "ring-2 ring-app-action" : ""
              ]}
              onclick={() => void selectOrganization(org.id)}
            >
              <span class="block font-medium">{org.name}</span>
              <span class={org.id === selectedOrgId ? "text-xs text-white/75" : "text-xs text-app-muted"}>
                @{org.slug} · {roleLabel(org.role)}
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </aside>

    <div class="flex min-w-0 flex-col gap-4">
      {#if selectedOrg}
        <section class="rounded-md border border-app-border bg-app-surface p-4">
          <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-app-muted">Organizacao</p>
              <h2 class="mt-1 text-2xl font-semibold">{selectedOrg.name}</h2>
              <p class="mt-1 text-sm text-app-muted">@{selectedOrg.slug} · {roleLabel(selectedOrg.role)} · criada em {formatDate(selectedOrg.createdAt)}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button variant={activeOrgId === selectedOrg.id ? "primary" : "secondary"} onclick={() => activateOrganization(selectedOrg.id)}>
                <Building2 class="h-4 w-4" /> {activeOrgId === selectedOrg.id ? "Ativa" : "Usar no workspace"}
              </Button>
              {#if canDeleteSelected}
                <Button variant="danger" onclick={() => void deleteOrganization()} disabled={saving}>Excluir</Button>
              {/if}
            </div>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-3">
            {#each [
              { label: "Membros", value: selectedOrg.memberCount, icon: Users },
              { label: "Colecoes", value: selectedOrg.collectionsCount, icon: Folder },
              { label: "Anuncios", value: selectedOrg.listingsCount, icon: Building2 }
            ] as item}
              {@const Icon = item.icon}
              <div class="rounded-md border border-app-border bg-white p-3">
                <div class="flex items-center justify-between gap-2 text-sm text-app-muted">
                  <span>{item.label}</span>
                  <Icon class="h-4 w-4" />
                </div>
                <div class="mt-2 text-2xl font-semibold">{item.value}</div>
              </div>
            {/each}
          </div>
        </section>

        <section class="rounded-md border border-app-border bg-app-surface p-4">
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 class="text-sm font-semibold">Membros</h2>
            {#if canManageMembers}
              <form class="grid gap-2 md:grid-cols-[1fr_140px_auto]" onsubmit={(event) => { event.preventDefault(); void addMember(); }}>
                <input class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" type="email" placeholder="email@exemplo.com" bind:value={newMemberEmail} />
                <select class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" bind:value={newMemberRole}>
                  <option value="member">Membro</option>
                  <option value="admin">Admin</option>
                  {#if selectedOrg.role === "owner"}<option value="owner">Dono</option>{/if}
                </select>
                <Button type="submit" disabled={saving}>Adicionar</Button>
              </form>
            {/if}
          </div>

          {#if loadingMembers}
            <p class="mt-4 text-sm text-app-muted">Carregando membros...</p>
          {:else}
            <div class="mt-4 overflow-x-auto">
              <table class="w-full min-w-[720px] border-collapse text-sm">
                <thead class="bg-app-surface-muted text-left text-xs uppercase text-app-muted">
                  <tr>
                    <th class="px-3 py-2 font-medium">Nome</th>
                    <th class="px-3 py-2 font-medium">Email</th>
                    <th class="px-3 py-2 font-medium">Papel</th>
                    <th class="px-3 py-2 font-medium">Entrada</th>
                    <th class="px-3 py-2 text-right font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {#each members as member (member.id)}
                    <tr class="border-t border-app-border">
                      <td class="px-3 py-3 font-medium">{member.userName}</td>
                      <td class="px-3 py-3 text-app-muted">{member.userEmail}</td>
                      <td class="px-3 py-3">
                        {#if canManageMembers && !(member.role === "owner" && selectedOrg.role !== "owner")}
                          <select
                            class="h-9 rounded-md border border-app-border bg-white px-2 text-sm"
                            value={member.role}
                            onchange={(event) => void updateMember(member, event.currentTarget.value as OrganizationRole)}
                            disabled={saving}
                          >
                            <option value="member">Membro</option>
                            <option value="admin">Admin</option>
                            {#if selectedOrg.role === "owner"}<option value="owner">Dono</option>{/if}
                          </select>
                        {:else}
                          {roleLabel(member.role)}
                        {/if}
                      </td>
                      <td class="px-3 py-3 text-app-muted">{formatDate(member.joinedAt)}</td>
                      <td class="px-3 py-3 text-right">
                        {#if canManageMembers && !(member.role === "owner" && selectedOrg.role !== "owner")}
                          <Button class="h-9 px-3 text-xs" variant="ghost" onclick={() => void removeMember(member)} disabled={saving}>Remover</Button>
                        {/if}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </section>
      {:else}
        <section class="rounded-md border border-app-border bg-app-surface p-5 text-sm text-app-muted">
          Selecione ou crie uma organizacao. Use "Pessoal" para voltar o workspace aos seus dados pessoais.
        </section>
      {/if}
    </div>
  </section>
</PageScaffold>
