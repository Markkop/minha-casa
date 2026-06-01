<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { AlertCircle, Calendar, Check, CheckCircle, Crown, FlaskConical } from "@lucide/svelte";
  import { billingApi } from "$lib/billing/client";
  import { syncSubscriptionCookie } from "$lib/sync-subscription-cookie";
  import GrantedAddonsSection from "$lib/addons/GrantedAddonsSection.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import type { AdminPlan, AdminSubscription } from "$lib/admin/client";

  type Tier = {
    slug: "plus" | "pro";
    name: string;
    description: string;
    fallbackPrice: string;
    features: string[];
    cta: "checkout" | "coming_soon";
  };

  const tiers: Tier[] = [
    {
      slug: "plus",
      name: "Plus",
      description: "Extraia dados dos seus imóveis favoritos",
      fallbackPrice: "R$ 20,00",
      features: [
        "Captura manual de anúncios (Ctrl+C, Ctrl+V)",
        "Extração automática de dados do anúncio",
        "Criar e organizar coleções de imóveis",
        "Compartilhar coleções com outras pessoas",
        "Salvar e comparar anúncios na plataforma"
      ],
      cta: "checkout"
    },
    {
      slug: "pro",
      name: "Pro",
      description: "Recursos avançados",
      fallbackPrice: "R$ 200,00",
      features: [
        "Tudo do Plus",
        "Simulador de financiamento imobiliário",
        "Mapa de risco de enchente por região",
        "Criar organizações (times / imobiliárias)",
        "Feedback direto com o desenvolvedor"
      ],
      cta: "coming_soon"
    }
  ];

  let plans = $state<AdminPlan[]>([]);
  let subscription = $state<AdminSubscription | null>(null);
  let currentPlan = $state<AdminPlan | null>(null);
  let loading = $state(true);
  let checkoutPlanId = $state<string | null>(null);
  let portalLoading = $state(false);
  let error = $state("");
  let stripeTestMode = $state(false);

  const success = $derived($page.url.searchParams.get("success") === "true");
  const cancelled = $derived($page.url.searchParams.get("cancelled") === "true");
  const redirectPath = $derived($page.url.searchParams.get("redirect"));

  onMount(() => {
    void loadBilling();
    if ($page.url.searchParams.get("success") === "true") {
      void syncSubscriptionCookie();
    }
  });

  async function loadBilling() {
    loading = true;
    error = "";
    try {
      const [plansData, subscriptionData] = await Promise.all([
        billingApi.fetchPlans(),
        billingApi.fetchCurrentSubscription()
      ]);
      plans = plansData.plans;
      stripeTestMode = plansData.stripeTestMode ?? false;
      subscription = subscriptionData.subscription;
      currentPlan = subscriptionData.plan;
      await syncSubscriptionCookie();
    } catch (err) {
      error = errorMessage(err, "Erro ao carregar assinatura");
    } finally {
      loading = false;
    }
  }

  function planFor(slug: string) {
    return plans.find((plan) => plan.slug === slug) ?? null;
  }

  function formatPrice(plan: AdminPlan | null, fallback: string) {
    if (!plan) return fallback;
    if (plan.priceInCents === 0) return "Gratis";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(plan.priceInCents / 100);
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  }

  function isExpiringSoon(value: string) {
    return new Date(value).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
  }

  function isSafeRedirect(value: string | null) {
    return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
  }

  async function startCheckout(plan: AdminPlan | null) {
    if (!plan) return;
    checkoutPlanId = plan.id;
    error = "";
    try {
      const origin = window.location.origin;
      const redirect = isSafeRedirect(redirectPath) ? `&redirect=${encodeURIComponent(redirectPath ?? "")}` : "";
      const session = await billingApi.createCheckoutSession({
        planId: plan.id,
        successUrl: `${origin}/subscribe?success=true&session_id={CHECKOUT_SESSION_ID}${redirect}`,
        cancelUrl: `${origin}/subscribe?cancelled=true`
      });
      window.location.href = session.checkoutUrl;
    } catch (err) {
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
        Gerencie seu plano e veja as opcoes disponiveis enquanto o checkout Stripe e portado para Phoenix.
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

      {#if success}
        <div class="mb-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-800">
          <CheckCircle class="mr-2 inline h-5 w-5" /> Pagamento recebido. Se a assinatura ainda nao apareceu, o webhook pode estar processando.
        </div>
      {/if}

      {#if cancelled}
        <div class="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800">
          <AlertCircle class="mr-2 inline h-5 w-5" /> Checkout cancelado. Voce pode tentar novamente quando o checkout Svelte/Phoenix estiver ativo.
        </div>
      {/if}

      {#if subscription && currentPlan}
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
          {#if isSafeRedirect(redirectPath) && subscription.status === "active"}
            <div class="mt-4"><a href={redirectPath ?? "/anuncios"}><Button>Continuar</Button></a></div>
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
          Voce ainda nao possui uma assinatura ativa. Escolha um plano abaixo ou peca uma concessao manual a um admin durante a migracao.
        </section>
      {/if}

      <div class="mb-8">
        <GrantedAddonsSection />
      </div>

      <section>
        <h2 class="mb-6 text-center text-2xl font-semibold">Planos disponiveis</h2>
        <div class="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {#each tiers as tier}
            {@const apiPlan = planFor(tier.slug)}
            {@const current = currentPlan?.slug === tier.slug}
            <article class={`relative flex flex-col rounded-md border bg-app-surface p-6 ${current ? "border-app-action border-2 shadow-sm" : "border-app-border"}`}>
              {#if current}
                <span class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-app-action px-3 py-1 text-xs font-bold text-app-fg">Seu plano</span>
              {/if}
              <div class="text-center">
                <h3 class="text-2xl font-bold">{tier.name}</h3>
                <p class="mt-2 text-app-muted">{tier.description}</p>
                <div class="mt-4">
                  <span class="text-4xl font-bold">{formatPrice(apiPlan, tier.fallbackPrice)}</span>
                  <span class="ml-2 text-sm text-app-muted">/mes</span>
                </div>
              </div>
              <ul class="mt-6 flex-1 space-y-3">
                {#each tier.features as feature}
                  <li class="flex items-start gap-2 text-sm text-app-muted">
                    <Check class="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
                    <span>{feature}</span>
                  </li>
                {/each}
              </ul>
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
                  Assinar
                {:else}
                  Checkout em breve
                {/if}
              </button>
              {#if tier.slug === "plus" && apiPlan && !apiPlan.stripePriceId}
                <p class="mt-3 text-center text-xs text-app-muted">Plano sem Stripe Price ID configurado.</p>
              {/if}
            </article>
          {/each}
        </div>
      </section>
    {/if}
  </section>
</main>
