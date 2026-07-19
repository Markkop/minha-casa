<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { AlertCircle, Calendar, Check, CheckCircle, Crown, FlaskConical } from "@lucide/svelte";
  import { ApiError } from "$lib/api/client";
  import { billingApi } from "$lib/billing/client";
  import Button from "$lib/components/ui/Button.svelte";
  import type { AdminPlan, AdminSubscription } from "$lib/admin/client";
  import { isSafeRedirectPath } from "$lib/navigation/safe-redirect";
  import {
    findPlanCatalogEntry,
    formatPlanMonthlyPrice,
    PLAN_CATALOG,
    type PlanSlug
  } from "$lib/plans/catalog";

  let plans = $state<AdminPlan[]>([]);
  let subscription = $state<AdminSubscription | null>(null);
  let currentPlan = $state<AdminPlan | null>(null);
  let hasActiveSubscription = $state(false);
  let loading = $state(true);
  let checkoutPlanId = $state<string | null>(null);
  let portalLoading = $state(false);
  let error = $state("");
  let accountError = $state("");
  let stripeTestMode = $state(false);
  let authenticated = $state<boolean | null>(null);
  let paymentSyncing = $state(false);

  const success = $derived(page.url.searchParams.get("success") === "true");
  const cancelled = $derived(page.url.searchParams.get("cancelled") === "true");
  const redirectPath = $derived(page.url.searchParams.get("redirect"));
  const selectedPlan = $derived(findPlanCatalogEntry(page.url.searchParams.get("plan")));

  onMount(() => {
    void loadBilling();
  });

  async function loadBilling() {
    loading = true;
    error = "";
    accountError = "";
    try {
      const plansData = await billingApi.fetchPlans();
      plans = plansData.plans;
      stripeTestMode = plansData.stripeTestMode ?? false;

      try {
        const subscriptionData = await billingApi.fetchCurrentSubscription();
        authenticated = true;
        applySubscription(subscriptionData);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          authenticated = false;
          applySubscription(null);
        } else {
          authenticated = null;
          accountError = errorMessage(err, "Não foi possível consultar sua assinatura agora.");
        }
      }
    } catch (err) {
      error = errorMessage(err, "Erro ao carregar os planos");
    } finally {
      loading = false;
    }

    if (success && authenticated && !hasActiveSubscription) void pollForSubscription();
  }

  function applySubscription(
    data: Awaited<ReturnType<typeof billingApi.fetchCurrentSubscription>> | null
  ) {
    subscription = data?.subscription ?? null;
    currentPlan = data?.plan ?? null;
    hasActiveSubscription = data?.hasActiveSubscription ?? false;
    if (hasActiveSubscription && isSafeRedirectPath(redirectPath)) {
      window.location.replace(redirectPath);
    }
  }

  async function pollForSubscription() {
    if (paymentSyncing) return;
    paymentSyncing = true;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1_500));
      try {
        const data = await billingApi.fetchCurrentSubscription();
        applySubscription(data);
        if (data.hasActiveSubscription) break;
      } catch {
        // The checkout succeeded; transient webhook/API errors are safe to retry.
      }
    }
    paymentSyncing = false;
  }

  function planFor(slug: PlanSlug) {
    return plans.find((plan) => plan.slug === slug) ?? null;
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  }

  function isExpiringSoon(value: string) {
    return new Date(value).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
  }

  async function startCheckout(plan: AdminPlan | null) {
    if (!plan) return;
    if (authenticated === false) {
      const returnTo = `${page.url.pathname}${page.url.search}`;
      window.location.href = `/login?redirect=${encodeURIComponent(returnTo)}`;
      return;
    }
    checkoutPlanId = plan.id;
    error = "";
    try {
      const origin = window.location.origin;
      const redirect = isSafeRedirectPath(redirectPath) ? `&redirect=${encodeURIComponent(redirectPath)}` : "";
      const session = await billingApi.createCheckoutSession({
        planId: plan.id,
        successUrl: `${origin}/subscribe?success=true&session_id={CHECKOUT_SESSION_ID}${redirect}`,
        cancelUrl: `${origin}/subscribe?cancelled=true`
      });
      window.location.href = session.checkoutUrl;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const returnTo = `${page.url.pathname}${page.url.search}`;
        window.location.href = `/login?redirect=${encodeURIComponent(returnTo)}`;
        return;
      }
      error = errorMessage(err, "Erro ao iniciar checkout");
      checkoutPlanId = null;
    }
  }

  async function openPortal() {
    portalLoading = true;
    error = "";
    try {
      const portal = await billingApi.openBillingPortal();
      window.location.href = portal.url;
    } catch (err) {
      error = errorMessage(err, "Erro ao abrir portal de cobranca");
    } finally {
      portalLoading = false;
    }
  }

  function errorMessage(err: unknown, fallback: string) {
    if (err && typeof err === "object" && "data" in err) {
      const data = (err as { data?: { error?: string } }).data;
      if (data?.error) return data.error;
    }
    return err instanceof Error ? err.message : fallback;
  }
</script>

<main class="min-h-screen bg-app-bg text-app-fg">
  <section class="mx-auto max-w-6xl px-4 py-12 sm:py-16">
    <header class="mb-10 text-center">
      <h1 class="text-4xl font-bold sm:text-5xl">Assinatura</h1>
      <p class="mx-auto mt-4 max-w-3xl text-lg text-app-muted">
        Escolha o plano certo para sua busca, sua atuação profissional ou sua equipe.
      </p>
    </header>

    {#if loading}
      <div class="rounded-md border border-app-border bg-app-surface p-8 text-center text-sm text-app-muted">Carregando...</div>
    {:else if error}
      <div class="mx-auto max-w-lg rounded-md border border-red-200 bg-red-50 p-5 text-center text-sm text-red-700">
        <AlertCircle class="mx-auto mb-2 h-5 w-5" />
        {error}
        <div class="mt-4"><Button variant="secondary" onclick={() => void loadBilling()}>Tentar novamente</Button></div>
      </div>
    {:else}
      {#if stripeTestMode}
        <div class="mb-8 rounded-md border border-amber-200 bg-amber-50">
          <div class="py-4">
            <div class="flex items-center justify-center gap-3">
              <FlaskConical class="h-5 w-5 text-amber-700" />
              <div class="text-center">
                <p class="font-semibold text-amber-900">MODO DE TESTE ATIVO</p>
                <p class="text-sm text-amber-800">
                  Pagamentos nesta pagina estao em modo de teste do Stripe. Nenhuma cobranca real sera processada.
                </p>
              </div>
            </div>
          </div>
        </div>
      {/if}

      {#if accountError}
        <div class="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-900">
          <AlertCircle class="mr-2 inline h-5 w-5" /> {accountError} Os planos continuam disponíveis abaixo.
        </div>
      {/if}

      {#if success}
        <div class="mb-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-800">
          <CheckCircle class="mr-2 inline h-5 w-5" />
          {#if hasActiveSubscription}
            Pagamento confirmado e assinatura ativada.
          {:else if paymentSyncing}
            Pagamento recebido. Estamos ativando sua assinatura automaticamente...
          {:else}
            Pagamento recebido. A ativação ainda está sendo processada; você pode atualizar esta página em instantes.
          {/if}
        </div>
      {/if}

      {#if cancelled}
        <div class="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800">
          <AlertCircle class="mr-2 inline h-5 w-5" /> Checkout cancelado. Voce pode tentar novamente quando o checkout Svelte/Phoenix estiver ativo.
        </div>
      {/if}

      {#if hasActiveSubscription && subscription && currentPlan}
        <section class="mb-8 rounded-md border border-app-border bg-app-surface p-5">
          <div class="mb-4 flex items-center gap-2">
            <Crown class="h-5 w-5 text-app-muted" />
            <h2 class="text-lg font-semibold">Sua assinatura</h2>
          </div>
          <div class="grid gap-3 text-sm sm:grid-cols-2">
            <div class="flex justify-between gap-3 rounded-md bg-white p-3"><span class="text-app-muted">Plano</span><strong>{currentPlan.name}</strong></div>
            <div class="flex justify-between gap-3 rounded-md bg-white p-3"><span class="text-app-muted">Status</span><strong>{subscription.status === "active" ? "Ativo" : subscription.status}</strong></div>
            <div class="flex justify-between gap-3 rounded-md bg-white p-3"><span class="text-app-muted">Inicio</span><span><Calendar class="mr-1 inline h-4 w-4" />{formatDate(subscription.startsAt)}</span></div>
            <div class={`flex justify-between gap-3 rounded-md bg-white p-3 ${isExpiringSoon(subscription.expiresAt) ? "text-amber-700" : ""}`}>
              <span class="text-app-muted">Expira</span><span><Calendar class="mr-1 inline h-4 w-4" />{formatDate(subscription.expiresAt)}</span>
            </div>
          </div>
          {#if isSafeRedirectPath(redirectPath)}
            <div class="mt-4"><a href={redirectPath}><Button>Continuar</Button></a></div>
          {/if}
          {#if subscription.stripeSubscriptionId}
            <div class="mt-4">
              <Button variant="secondary" onclick={() => void openPortal()} disabled={portalLoading}>
                {portalLoading ? "Abrindo..." : "Abrir portal de cobranca"}
              </Button>
            </div>
          {/if}
        </section>
      {:else}
        <section class="mb-8 rounded-md border border-app-border bg-app-surface p-5 text-center text-sm text-app-muted">
          {authenticated === false
            ? "Veja todos os planos sem entrar. Ao escolher um plano pago, você poderá acessar ou criar sua conta antes do checkout."
            : "Você está no plano Free. Escolha um upgrade abaixo quando quiser ampliar seu uso."}
        </section>
      {/if}

      <section>
        <h2 class="mb-6 text-center text-2xl font-semibold">Planos disponíveis</h2>
        <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {#each PLAN_CATALOG as plan (plan.slug)}
            {@const apiPlan = planFor(plan.slug)}
            {@const current = plan.slug === "free" ? !hasActiveSubscription : currentPlan?.slug === plan.slug}
            {@const selected = selectedPlan?.slug === plan.slug}
            <article class={`relative flex flex-col rounded-xl border bg-app-surface p-6 ${current || selected ? "border-app-action border-2 shadow-sm" : "border-app-border"}`}>
              {#if current}
                <span class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-app-action px-3 py-1 text-xs font-bold text-app-action-foreground">Seu plano</span>
              {:else if selected}
                <span class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-app-action px-3 py-1 text-xs font-bold text-app-action-foreground">Selecionado</span>
              {/if}
              <div>
                <p class="text-sm font-medium text-app-muted">{plan.audience}</p>
                <h3 class="mt-2 text-2xl font-bold">{plan.name}</h3>
                <p class="mt-2 min-h-12 text-sm leading-6 text-app-muted">{plan.description}</p>
                <div class="mt-5 flex items-end gap-1">
                  <span class="text-4xl font-bold">{formatPlanMonthlyPrice(plan)}</span>
                  {#if plan.monthlyPriceInCents > 0}
                    <span class="pb-1 text-sm text-app-muted">/mês</span>
                  {/if}
                </div>
              </div>
              <ul class="mt-6 flex-1 space-y-3">
                {#each plan.features as feature}
                  <li class="flex items-start gap-2 text-sm text-app-muted">
                    <Check class="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
                    <span>{feature}</span>
                  </li>
                {/each}
              </ul>
              {#if plan.slug === "free"}
                <a
                  href="/lista"
                  class={`mt-6 flex h-11 items-center justify-center rounded-md font-medium ${current ? "bg-app-surface-muted text-app-muted" : "border border-app-border bg-white text-app-fg"}`}
                >
                  {current ? "Plano atual" : "Usar Free"}
                </a>
              {:else}
                <button
                  class={`mt-6 h-11 rounded-md font-medium ${current ? "bg-app-surface-muted text-app-muted" : apiPlan?.stripePriceId ? "bg-app-fg text-white" : "border border-app-border bg-white text-app-muted"}`}
                  disabled={current || !apiPlan?.stripePriceId || checkoutPlanId === apiPlan?.id}
                  onclick={() => void startCheckout(apiPlan)}
                >
                  {#if current}
                    Plano atual
                  {:else if checkoutPlanId === apiPlan?.id}
                    Abrindo checkout...
                  {:else if apiPlan?.stripePriceId}
                    {authenticated === false ? `Entrar para assinar ${plan.name}` : `Assinar ${plan.name}`}
                  {:else}
                    Checkout em breve
                  {/if}
                </button>
              {/if}
              {#if plan.slug !== "free" && apiPlan && !apiPlan.stripePriceId}
                <p class="mt-3 text-center text-xs text-app-muted">Checkout ainda não configurado para este plano.</p>
              {/if}
            </article>
          {/each}
        </div>
        <p class="mt-8 text-center text-sm text-app-muted">
          O plano Imobiliária oferece até 10 licenças para a equipe.
        </p>
      </section>
    {/if}
  </section>
</main>
