<script lang="ts">
  import { onMount } from "svelte";
  import { Building2, Copy, CreditCard, Link2, Pencil, Users, X } from "@lucide/svelte";
  import { billingApi, type SeatChangePreview, type SeatSummary } from "$lib/billing/client";
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import {
    getActiveOrganizationId,
    setActiveOrganizationId,
    setActiveWorkspaceId
  } from "$lib/api/client";
  import {
    buildInviteUrl,
    formatInviteExpiration,
    formatOrganizationDate,
    organizationRoleLabel,
    pickInitialOrganizationId
  } from "$lib/organizacoes/helpers";
  import type { ManagedOrganizationKind } from "$lib/organizacoes/load-management";
  import {
    workspaceApi,
    type Organization,
    type OrganizationInvite,
    type OrganizationMember,
    type OrganizationRole
  } from "$lib/workspace/client";

  let {
    kind,
    initialOrganizations,
    initialActiveOrganizationId = null,
    initialError = null
  } = $props<{
    kind: ManagedOrganizationKind;
    initialOrganizations: Organization[];
    initialActiveOrganizationId?: string | null;
    initialError?: string | null;
  }>();

  let organizations = $state<Organization[]>([]);
  let members = $state<OrganizationMember[]>([]);
  let invites = $state<OrganizationInvite[]>([]);
  let selectedId = $state<string | null>(null);
  let activeId = $state<string | null>(null);
  let loadingMembers = $state(false);
  let loadingInvites = $state(false);
  let saving = $state(false);
  let error = $state("");
  let memberEmail = $state("");
  let memberRole = $state<OrganizationRole>("member");
  let inviteRole = $state<OrganizationRole>("member");
  let copiedInviteId = $state<string | null>(null);
  let initialized = $state(false);
  let editingAgencyName = $state(false);
  let agencyName = $state("");
  let seatSummary = $state<SeatSummary | null>(null);
  let seatPreview = $state<SeatChangePreview | null>(null);
  let desiredSeats = $state(10);
  let loadingSeats = $state(false);
  let previewingSeats = $state(false);
  let updatingSeats = $state(false);
  let seatError = $state("");

  $effect(() => {
    organizations = initialOrganizations.filter(
      (organization: Organization) => organization.kind === kind
    );
    error = initialError ?? "";
  });

  const selected = $derived(
    organizations.find((organization) => organization.id === selectedId) ?? null
  );
  const canManageMembers = $derived(selected?.role === "owner" || selected?.role === "admin");
  const title = $derived(kind === "agency" ? "Imobiliária" : "Família");
  const description = $derived(
    kind === "agency"
      ? "Gerencie corretores, administradores e convites da imobiliária."
      : "Gerencie familiares, administradores e convites da família."
  );
  const defaultRole = $derived<OrganizationRole>(kind === "agency" ? "broker" : "member");
  const defaultRoleLabel = $derived(kind === "agency" ? "Corretor" : "Membro");

  onMount(() => {
    organizations = initialOrganizations.filter(
      (organization: Organization) => organization.kind === kind
    );
    error = initialError ?? "";
    memberRole = kind === "agency" ? "broker" : "member";
    inviteRole = kind === "agency" ? "broker" : "member";
    activeId = initialActiveOrganizationId ?? getActiveOrganizationId();
    void initialize();
  });

  async function initialize() {
    if (initialized) return;
    initialized = true;
    const initialId = pickInitialOrganizationId(organizations, {
      selectedOrgId: selectedId,
      activeOrgId: activeId
    });
    if (initialId) await selectOrganization(initialId);
  }

  async function refreshOrganizations() {
    const response = await workspaceApi.fetchOrganizations();
    organizations = response.organizations.filter((organization) => organization.kind === kind);
    if (selectedId && !organizations.some((organization) => organization.id === selectedId)) {
      selectedId = organizations[0]?.id ?? null;
    }
  }

  async function selectOrganization(id: string) {
    selectedId = id;
    loadingMembers = true;
    loadingInvites = true;
    error = "";
    copiedInviteId = null;
    memberRole = defaultRole;
    inviteRole = defaultRole;
    seatSummary = null;
    seatPreview = null;
    seatError = "";

    const organization = organizations.find((item) => item.id === id);
    agencyName = organization?.name ?? "";
    editingAgencyName = false;
    try {
      members = (await workspaceApi.fetchOrganizationMembers(id)).members;
      invites =
        organization?.role === "owner" || organization?.role === "admin"
          ? (await workspaceApi.fetchOrganizationInvites(id)).invites
          : [];
      if (kind === "agency") await refreshSeatSummary(id);
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao carregar membros e convites";
      members = [];
      invites = [];
    } finally {
      loadingMembers = false;
      loadingInvites = false;
    }
  }

  async function refreshSeatSummary(organizationId = selectedId) {
    if (kind !== "agency" || !organizationId) return;
    loadingSeats = true;
    seatError = "";
    try {
      seatSummary = (await billingApi.fetchSeatSummary(organizationId)).seats;
      desiredSeats = seatSummary.pendingLicensedSeats ?? seatSummary.licensedSeats;
    } catch (err) {
      seatSummary = null;
      seatError = errorMessage(err, "Erro ao carregar seats da imobiliária");
    } finally {
      loadingSeats = false;
    }
  }

  async function previewSeatChange() {
    if (!selected || !seatSummary) return;
    const normalizedDesiredSeats = Number.isFinite(desiredSeats)
      ? Math.trunc(desiredSeats)
      : seatSummary.licensedSeats;
    const totalSeats = Math.max(
      seatSummary.includedSeats,
      seatSummary.usedSeats,
      normalizedDesiredSeats
    );
    desiredSeats = totalSeats;
    previewingSeats = true;
    seatError = "";
    try {
      seatPreview = (await billingApi.previewSeatChange(selected.id, totalSeats)).preview;
    } catch (err) {
      seatPreview = null;
      seatError = errorMessage(err, "Erro ao calcular a alteração de seats");
    } finally {
      previewingSeats = false;
    }
  }

  async function confirmSeatChange() {
    if (!selected || !seatPreview) return;
    updatingSeats = true;
    seatError = "";
    try {
      seatSummary = (
        await billingApi.updateSeats(selected.id, {
          totalSeats: seatPreview.totalSeats,
          quoteToken: seatPreview.quoteToken
        })
      ).seats;
      desiredSeats = seatSummary.pendingLicensedSeats ?? seatSummary.licensedSeats;
      seatPreview = null;
    } catch (err) {
      seatError = errorMessage(err, "Erro ao atualizar os seats");
    } finally {
      updatingSeats = false;
    }
  }

  function formatMoney(valueInCents: number, currency = "BRL") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency.toUpperCase()
    }).format(valueInCents / 100);
  }

  function formatSeatDate(value: string | null | undefined) {
    if (!value) return "na próxima renovação";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(new Date(value));
  }

  function errorMessage(err: unknown, fallback: string) {
    if (err && typeof err === "object" && "data" in err) {
      const data = (err as { data?: { error?: string } }).data;
      if (data?.error) return data.error;
    }
    return err instanceof Error ? err.message : fallback;
  }

  async function activateSelected() {
    if (!selected) return;
    try {
      await setActiveOrganizationId(selected.id);
      setActiveWorkspaceId(selected.workspaceId);
      activeId = selected.id;
    } catch (err) {
      error = err instanceof Error ? err.message : `Erro ao ativar a ${title.toLowerCase()}`;
    }
  }

  async function saveAgencyName() {
    const name = agencyName.trim();
    if (!selected || kind !== "agency" || !name) return;

    saving = true;
    error = "";
    try {
      const { organization } = await workspaceApi.updateAgencyName(selected.id, name);
      organizations = organizations.map((item) =>
        item.id === organization.id ? organization : item
      );
      agencyName = organization.name;
      editingAgencyName = false;
      window.dispatchEvent(new CustomEvent("minha-casa:workspace-profiles-changed"));
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao atualizar o nome da imobiliária";
    } finally {
      saving = false;
    }
  }

  async function addMember() {
    if (!selected || !memberEmail.trim()) return;
    saving = true;
    error = "";
    try {
      const response = await workspaceApi.addOrganizationMember(selected.id, {
        email: memberEmail.trim(),
        role: memberRole
      });
      members = [...members, response.member];
      memberEmail = "";
      memberRole = defaultRole;
      await refreshOrganizations();
      await refreshSeatSummary();
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao adicionar membro";
      if (kind === "agency" && seatSummary?.canManageBilling) {
        desiredSeats = Math.max(seatSummary.licensedSeats + 1, seatSummary.usedSeats + 1);
        seatPreview = null;
      }
    } finally {
      saving = false;
    }
  }

  async function createInvite() {
    if (!selected) return;
    saving = true;
    error = "";
    copiedInviteId = null;
    try {
      const response = await workspaceApi.createOrganizationInvite(selected.id, {
        role: inviteRole
      });
      invites = [response.invite, ...invites];
      inviteRole = defaultRole;
      await refreshSeatSummary();
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao criar convite";
    } finally {
      saving = false;
    }
  }

  async function copyInvite(invite: OrganizationInvite) {
    const url = invite.inviteUrl.startsWith("http")
      ? invite.inviteUrl
      : buildInviteUrl(invite.token, window.location.origin);
    try {
      await navigator.clipboard.writeText(url);
      copiedInviteId = invite.id;
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao copiar convite";
    }
  }

  async function revokeInvite(invite: OrganizationInvite) {
    if (!selected || !confirm("Revogar este link de convite?")) return;
    saving = true;
    error = "";
    try {
      await workspaceApi.revokeOrganizationInvite(selected.id, invite.id);
      invites = invites.filter((item) => item.id !== invite.id);
      if (copiedInviteId === invite.id) copiedInviteId = null;
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao revogar convite";
    } finally {
      saving = false;
    }
  }

  async function updateMember(member: OrganizationMember, role: OrganizationRole) {
    if (!selected) return;
    saving = true;
    error = "";
    try {
      const response = await workspaceApi.updateOrganizationMember(selected.id, member.userId, {
        role
      });
      members = members.map((item) =>
        item.userId === response.member.userId ? response.member : item
      );
      await refreshOrganizations();
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao atualizar membro";
    } finally {
      saving = false;
    }
  }

  async function removeMember(member: OrganizationMember) {
    if (!selected || !confirm(`Remover ${member.userName || member.userEmail}?`)) return;
    saving = true;
    error = "";
    try {
      await workspaceApi.removeOrganizationMember(selected.id, member.userId);
      members = members.filter((item) => item.userId !== member.userId);
      await refreshOrganizations();
      await refreshSeatSummary();
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao remover membro";
    } finally {
      saving = false;
    }
  }
</script>

<PageScaffold {title} {description}>
  {#if error}
    <div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
  {/if}

  {#if organizations.length === 0}
    <section class="rounded-md border border-app-border bg-app-surface p-8 text-center">
      {#if kind === "agency"}
        <Building2 class="mx-auto h-12 w-12 text-app-muted" />
      {:else}
        <Users class="mx-auto h-12 w-12 text-app-muted" />
      {/if}
      <h2 class="mt-4 text-lg font-semibold">Nenhuma {title.toLowerCase()} vinculada</h2>
      <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-app-muted">
        {kind === "agency"
          ? "A imobiliária é criada automaticamente quando o plano Imobiliária é ativado, ou aparece aqui quando você aceita um convite."
          : "A família é criada automaticamente para o titular do plano Pro, ou aparece aqui quando você aceita um convite."}
      </p>
      <a href="/planos" class="mt-5 inline-flex h-10 items-center rounded-md bg-app-action px-4 text-sm font-medium text-app-action-foreground hover:bg-app-action-hover">
        Ver planos
      </a>
    </section>
  {:else}
    <div class="grid gap-4 lg:grid-cols-[280px_1fr]">
      {#if organizations.length > 1}
        <aside class="rounded-md border border-app-border bg-app-surface p-3">
          <p class="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-app-muted">
            {kind === "agency" ? "Minhas imobiliárias" : "Minha família"}
          </p>
          <div class="flex flex-col gap-1">
            {#each organizations as organization (organization.id)}
              <button
                type="button"
                class={[
                  "rounded-md px-3 py-2 text-left text-sm transition",
                  organization.id === selectedId
                    ? "bg-app-surface-muted font-medium text-app-fg"
                    : "text-app-muted hover:bg-app-surface-muted hover:text-app-fg"
                ]}
                onclick={() => void selectOrganization(organization.id)}
              >
                <span class="block truncate">{organization.name}</span>
                <span class="block text-xs">{organizationRoleLabel(organization.role)}</span>
              </button>
            {/each}
          </div>
        </aside>
      {/if}

      <div class={organizations.length > 1 ? "flex min-w-0 flex-col gap-4" : "col-span-full flex min-w-0 flex-col gap-4"}>
        {#if selected}
          <section class="rounded-md border border-app-border bg-app-surface p-4">
            <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                {#if kind === "agency" && editingAgencyName}
                  <form
                    class="flex flex-wrap items-center gap-2"
                    onsubmit={(event) => {
                      event.preventDefault();
                      void saveAgencyName();
                    }}
                  >
                    <input
                      class="h-10 min-w-64 rounded-md border border-app-border bg-white px-3 text-lg font-semibold"
                      maxlength="100"
                      bind:value={agencyName}
                      aria-label="Nome da imobiliária"
                    />
                    <Button type="submit" disabled={saving || agencyName.trim().length < 2}>Salvar</Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onclick={() => {
                        agencyName = selected.name;
                        editingAgencyName = false;
                      }}
                    >Cancelar</Button>
                  </form>
                {:else}
                  <div class="flex flex-wrap items-center gap-2">
                    <h2 class="text-2xl font-semibold">{kind === "family" ? "Família" : selected.name}</h2>
                    {#if kind === "agency" && canManageMembers}
                      <Button class="h-8 px-2 text-xs" variant="ghost" onclick={() => (editingAgencyName = true)}>
                        <Pencil class="h-3.5 w-3.5" /> Editar nome
                      </Button>
                    {/if}
                  </div>
                {/if}
                <p class="mt-1 text-sm text-app-muted">
                  {organizationRoleLabel(selected.role)} · desde {formatOrganizationDate(selected.createdAt)}
                </p>
              </div>
              <Button
                variant={activeId === selected.id ? "primary" : "secondary"}
                onclick={() => void activateSelected()}
              >
                <Building2 class="h-4 w-4" />
                {activeId === selected.id ? "Workspace ativo" : "Usar este workspace"}
              </Button>
            </div>
          </section>

          {#if kind === "agency"}
            <section class="rounded-md border border-app-border bg-app-surface p-4" aria-labelledby="seat-billing-title">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <CreditCard class="h-4 w-4 text-app-muted" />
                    <h2 id="seat-billing-title" class="text-sm font-semibold">Seats e cobrança</h2>
                  </div>

                  {#if loadingSeats}
                    <p class="mt-3 text-sm text-app-muted">Carregando capacidade da equipe...</p>
                  {:else if seatSummary}
                    <div class="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <strong class="text-2xl">{seatSummary.usedSeats} de {seatSummary.licensedSeats}</strong>
                      <span class="text-sm text-app-muted">seats em uso</span>
                    </div>
                    <div class="mt-2 h-2 max-w-xl overflow-hidden rounded-full bg-app-surface-muted">
                      <div
                        class="h-full rounded-full bg-app-action transition-all"
                        style={`width: ${Math.min(100, (seatSummary.usedSeats / Math.max(1, seatSummary.licensedSeats)) * 100)}%`}
                      ></div>
                    </div>
                    <p class="mt-3 text-sm text-app-muted">
                      O plano inclui {seatSummary.includedSeats} seats. Cada seat adicional custa
                      {formatMoney(seatSummary.additionalSeatPriceInCents, seatSummary.currency)}/mês.
                    </p>
                    <p class="mt-1 text-xs text-app-muted">
                      {seatSummary.pendingInvites === 1
                        ? "1 convite pendente não reserva um seat; ele será validado quando for aceito."
                        : `${seatSummary.pendingInvites} convites pendentes não reservam seats; eles serão validados quando forem aceitos.`}
                    </p>
                    {#if seatSummary.pendingLicensedSeats !== null && seatSummary.pendingLicensedSeats !== undefined}
                      <div class="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        Redução agendada para {seatSummary.pendingLicensedSeats} seats em
                        {formatSeatDate(seatSummary.pendingSeatsEffectiveAt)}. Até lá, a capacidade atual continua disponível.
                      </div>
                    {/if}
                  {:else}
                    <p class="mt-3 text-sm text-app-muted">A capacidade de seats ficará disponível com a assinatura da imobiliária.</p>
                  {/if}
                </div>

                {#if seatSummary?.canManageBilling}
                  <form
                    class="w-full rounded-md border border-app-border bg-white p-4 lg:w-[360px]"
                    onsubmit={(event) => {
                      event.preventDefault();
                      void previewSeatChange();
                    }}
                  >
                    <label for="licensed-seats" class="text-sm font-semibold">Capacidade da equipe</label>
                    <p class="mt-1 text-xs leading-5 text-app-muted">
                      Aumentos são cobrados proporcionalmente agora. Reduções entram em vigor na próxima renovação.
                    </p>
                    <div class="mt-3 flex gap-2">
                      <input
                        id="licensed-seats"
                        class="h-10 min-w-0 flex-1 rounded-md border border-app-border bg-white px-3 text-sm"
                        type="number"
                        min={Math.max(seatSummary.includedSeats, seatSummary.usedSeats)}
                        max="500"
                        step="1"
                        required
                        bind:value={desiredSeats}
                        oninput={() => (seatPreview = null)}
                      />
                      <Button
                        type="submit"
                        variant="secondary"
                        disabled={previewingSeats || desiredSeats === (seatSummary.pendingLicensedSeats ?? seatSummary.licensedSeats)}
                      >
                        {previewingSeats ? "Calculando..." : "Revisar"}
                      </Button>
                    </div>

                    {#if seatPreview}
                      <div class="mt-4 rounded-md bg-app-surface-muted p-3 text-sm">
                        <div class="flex justify-between gap-4">
                          <span class="text-app-muted">Nova capacidade</span>
                          <strong>{seatPreview.totalSeats} seats</strong>
                        </div>
                        <div class="mt-2 flex justify-between gap-4">
                          <span class="text-app-muted">Cobrança agora</span>
                          <strong>{formatMoney(seatPreview.amountDueNow, seatPreview.currency)}</strong>
                        </div>
                        <div class="mt-2 flex justify-between gap-4">
                          <span class="text-app-muted">Novo total mensal</span>
                          <strong>{formatMoney(seatPreview.monthlyTotalInCents ?? seatPreview.nextInvoiceAmount, seatPreview.currency)}</strong>
                        </div>
                        <p class="mt-3 text-xs leading-5 text-app-muted">
                          {seatPreview.change === "decrease"
                            ? `A redução entra em vigor em ${formatSeatDate(seatPreview.effectiveAt)}.`
                            : seatPreview.change === "increase"
                              ? "O Stripe calcula o valor proporcional restante deste ciclo."
                              : "A capacidade já está configurada assim."}
                        </p>
                        <Button
                          class="mt-3 w-full"
                          type="button"
                          disabled={updatingSeats || seatPreview.change === "unchanged"}
                          onclick={() => void confirmSeatChange()}
                        >
                          {updatingSeats ? "Atualizando..." : "Confirmar alteração"}
                        </Button>
                      </div>
                    {/if}
                  </form>
                {:else if seatSummary}
                  <div class="w-full rounded-md bg-app-surface-muted p-3 text-sm text-app-muted lg:w-[300px]">
                    Somente o dono da imobiliária pode alterar seats e cobrança.
                  </div>
                {/if}
              </div>

              {#if seatError}
                <div class="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{seatError}</div>
              {/if}
            </section>
          {/if}

          <section class="rounded-md border border-app-border bg-app-surface p-4">
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 class="text-sm font-semibold">Membros</h2>
                <p class="mt-1 text-xs text-app-muted">
                  {canManageMembers ? "Você pode convidar e administrar esta equipe." : "Somente owner e admins podem alterar a equipe."}
                </p>
              </div>
              {#if canManageMembers}
                <form class="grid gap-2 md:grid-cols-[minmax(180px,1fr)_140px_auto]" onsubmit={(event) => { event.preventDefault(); void addMember(); }}>
                  <input class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" type="email" placeholder="email@exemplo.com" bind:value={memberEmail} />
                  <select class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" bind:value={memberRole}>
                    <option value={defaultRole}>{defaultRoleLabel}</option>
                    <option value="admin">Admin</option>
                    {#if selected.role === "owner"}<option value="owner">Dono</option>{/if}
                  </select>
                  <Button type="submit" disabled={saving}>Adicionar</Button>
                </form>
              {/if}
            </div>

            {#if canManageMembers}
              <div class="mt-4 rounded-md border border-app-border bg-white p-3">
                <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 class="flex items-center gap-2 text-sm font-semibold"><Link2 class="h-4 w-4" /> Link de convite</h3>
                    <p class="mt-1 text-xs text-app-muted">O link expira em sete dias e pode ser revogado.</p>
                  </div>
                  <form class="flex gap-2" onsubmit={(event) => { event.preventDefault(); void createInvite(); }}>
                    <select class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" bind:value={inviteRole}>
                      <option value={defaultRole}>{defaultRoleLabel}</option>
                      <option value="admin">Admin</option>
                      {#if selected.role === "owner"}<option value="owner">Dono</option>{/if}
                    </select>
                    <Button type="submit" disabled={saving}>Criar link</Button>
                  </form>
                </div>

                {#if loadingInvites}
                  <p class="mt-3 text-sm text-app-muted">Carregando convites...</p>
                {:else if invites.length > 0}
                  <div class="mt-3 flex flex-col gap-2">
                    {#each invites as invite (invite.id)}
                      <div class="flex flex-col gap-2 rounded-md bg-app-surface-muted p-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p class="text-sm font-medium">{organizationRoleLabel(invite.role)}</p>
                          <p class="text-xs text-app-muted">Expira em {formatInviteExpiration(invite.expiresAt)}</p>
                        </div>
                        <div class="flex gap-2">
                          <Button class="h-9 px-3 text-xs" variant="secondary" type="button" onclick={() => void copyInvite(invite)}>
                            <Copy class="h-4 w-4" /> {copiedInviteId === invite.id ? "Copiado" : "Copiar"}
                          </Button>
                          <Button class="h-9 px-3 text-xs" variant="ghost" type="button" onclick={() => void revokeInvite(invite)} disabled={saving}>
                            <X class="h-4 w-4" /> Revogar
                          </Button>
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}

            {#if loadingMembers}
              <p class="mt-4 text-sm text-app-muted">Carregando membros...</p>
            {:else}
              <div class="mt-4 overflow-x-auto">
                <table class="w-full min-w-[680px] border-collapse text-sm">
                  <thead class="bg-app-surface-muted text-left text-xs uppercase text-app-muted">
                    <tr><th class="px-3 py-2">Nome</th><th class="px-3 py-2">Email</th><th class="px-3 py-2">Papel</th><th class="px-3 py-2">Entrada</th><th class="px-3 py-2 text-right">Ações</th></tr>
                  </thead>
                  <tbody>
                    {#each members as member (member.id)}
                      <tr class="border-t border-app-border">
                        <td class="px-3 py-3 font-medium">{member.userName}</td>
                        <td class="px-3 py-3 text-app-muted">{member.userEmail}</td>
                        <td class="px-3 py-3">
                          {#if canManageMembers && !(member.role === "owner" && selected.role !== "owner")}
                            <select
                              class="h-9 rounded-md border border-app-border bg-white px-2 text-sm"
                              value={member.role}
                              onchange={(event) => void updateMember(member, event.currentTarget.value as OrganizationRole)}
                              disabled={saving}
                            >
                              <option value={defaultRole}>{defaultRoleLabel}</option>
                              <option value="admin">Admin</option>
                              {#if selected.role === "owner"}<option value="owner">Dono</option>{/if}
                            </select>
                          {:else}
                            {organizationRoleLabel(member.role)}
                          {/if}
                        </td>
                        <td class="px-3 py-3 text-app-muted">{formatOrganizationDate(member.joinedAt)}</td>
                        <td class="px-3 py-3 text-right">
                          {#if canManageMembers && member.userId !== selected.ownerId}
                            <Button class="h-8 px-3 text-xs" variant="ghost" onclick={() => void removeMember(member)} disabled={saving}>Remover</Button>
                          {/if}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </section>
        {/if}
      </div>
    </div>
  {/if}
</PageScaffold>
