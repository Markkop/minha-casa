<script lang="ts">
  import { goto } from "$app/navigation";
  import Button from "$lib/components/ui/Button.svelte";
  import { setActiveOrganizationId } from "$lib/api/client";
  import { formatInviteExpiration, organizationRoleLabel } from "$lib/organizacoes/helpers";
  import { workspaceApi } from "$lib/workspace/client";

  let { data } = $props();

  let accepting = $state(false);
  let error = $state("");

  const redirectPath = $derived(`/convites/${encodeURIComponent(data.token)}`);
  const loginHref = $derived(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  const signupHref = $derived(`/signup?redirect=${encodeURIComponent(redirectPath)}`);
  const canAccept = $derived(Boolean(data.user && data.invite?.available));

  async function acceptInvite() {
    if (!data.invite) return;
    accepting = true;
    error = "";
    try {
      const result = await workspaceApi.acceptOrganizationInvite(data.token);
      await setActiveOrganizationId(result.organization.id);
      await goto("/organizacoes");
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao aceitar convite";
    } finally {
      accepting = false;
    }
  }
</script>

<main class="grid min-h-screen place-items-center bg-app-bg px-4 py-10">
  <section class="w-full max-w-md rounded-md border border-app-border bg-app-surface p-6 shadow-sm">
    <p class="text-xs font-medium uppercase text-app-muted">Convite de organizacao</p>

    {#if data.invite}
      <h1 class="mt-2 text-2xl font-semibold">{data.invite.organization.name}</h1>
      <p class="mt-2 text-sm text-app-muted">
        Voce foi convidado para entrar como {organizationRoleLabel(data.invite.role)}.
      </p>
      <dl class="mt-5 grid gap-3 rounded-md border border-app-border bg-white p-4 text-sm">
        <div class="flex items-center justify-between gap-3">
          <dt class="text-app-muted">Organizacao</dt>
          <dd class="font-medium">@{data.invite.organization.slug}</dd>
        </div>
        <div class="flex items-center justify-between gap-3">
          <dt class="text-app-muted">Papel</dt>
          <dd class="font-medium">{organizationRoleLabel(data.invite.role)}</dd>
        </div>
        <div class="flex items-center justify-between gap-3">
          <dt class="text-app-muted">Expira</dt>
          <dd class="font-medium">{formatInviteExpiration(data.invite.expiresAt)}</dd>
        </div>
      </dl>

      {#if !data.invite.available}
        <p class="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Este convite nao esta mais disponivel.
        </p>
      {:else if data.user}
        <Button class="mt-6 w-full" type="button" onclick={() => void acceptInvite()} disabled={accepting || !canAccept}>
          {accepting ? "Aceitando..." : "Aceitar convite"}
        </Button>
      {:else}
        <div class="mt-6 grid gap-2">
          <a class="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-[#7ec4f8]" href={signupHref}>Criar conta</a>
          <a class="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted" href={loginHref}>Entrar</a>
        </div>
      {/if}
    {:else}
      <h1 class="mt-2 text-2xl font-semibold">Convite indisponivel</h1>
      <p class="mt-2 text-sm text-app-muted">
        {data.inviteError || "Este convite nao existe ou nao esta mais disponivel."}
      </p>
      <a class="mt-6 inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted" href="/login">Entrar</a>
    {/if}

    {#if error}
      <p class="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
    {/if}
  </section>
</main>
