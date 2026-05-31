<script lang="ts">
  import { Check } from "@lucide/svelte";

  type Audience = "comprador" | "vendedor" | "corretor";
  type Plano = {
    nome: string;
    preco: number;
    descricao: string;
    features: string[];
    destaque?: boolean;
  };

  let active = $state<Audience>("comprador");

  const planos: Record<Audience, Plano[]> = {
    comprador: [
      { nome: "Free", preco: 0, descricao: "Pra organizar e aprender", features: ["3 coleções", "Até 25 anúncios salvos", "Parser de anúncio limitado/dia", "Simulador básico", "Mapa e comparador"] },
      { nome: "Plus", preco: 20, descricao: "Pra decidir compra de verdade", destaque: true, features: ["10 coleções", "200 anúncios", "Parser multimodal", "Simulador completo", "Export PDF/print"] },
      { nome: "Pro Comprador", preco: 50, descricao: "Pra usuário pesado", features: ["Anúncios ilimitados", "IA mais forte", "Score automático", "Histórico de visitas", "Compartilhamento privado"] }
    ],
    vendedor: [
      { nome: "Free", preco: 0, descricao: "Comece a vender", features: ["1 imóvel", "Checklist vendedor básico", "Gerador de descrição", "Link compartilhável"] },
      { nome: "Plus", preco: 20, descricao: "Venda mais rápido", destaque: true, features: ["Até 3 imóveis", "Gerador multi-canal", "Organizador de leads", "Checklist com prazos", "Kit do anúncio"] },
      { nome: "Pro Vendedor", preco: 50, descricao: "Profissionalize sua venda", features: ["Leads ilimitados", "Concorrentes comparáveis", "Histórico de mudanças", "Assistente de negociação"] }
    ],
    corretor: [
      { nome: "Free (solo)", preco: 0, descricao: "Comece como corretor", features: ["Até 30 leads", "10 anúncios próprios", "Funil simples", "Parser de anúncio"] },
      { nome: "Pro", preco: 99, descricao: "CRM completo para corretores", destaque: true, features: ["Leads ilimitados", "Funil customizável", "Tarefas e SLA", "Briefing automático", "Páginas públicas"] },
      { nome: "Imobiliária", preco: 199, descricao: "Para equipes e imobiliárias", features: ["Múltiplos usuários", "Distribuição de leads", "Dashboard do time", "Templates", "Integrações futuras"] }
    ]
  };
</script>

<main class="min-h-screen bg-app-bg text-app-fg">
  <section class="mx-auto max-w-7xl px-4 py-16 sm:py-24">
    <div class="mb-12 text-center">
      <h1 class="mb-4 text-4xl font-bold sm:text-5xl">Planos</h1>
      <p class="mx-auto max-w-3xl text-lg text-app-muted sm:text-xl">
        Escolha o plano ideal para o seu perfil. De comprador iniciante a imobiliária completa.
      </p>
    </div>

    <div class="mb-8 flex justify-center">
      <div class="flex rounded-md border border-app-border bg-app-surface p-1">
        {#each ["comprador", "vendedor", "corretor"] as audience}
          <button
            class={`h-10 rounded px-4 text-sm font-medium ${active === audience ? "bg-app-action text-app-action-foreground" : "text-app-muted hover:text-app-fg"}`}
            onclick={() => (active = audience as Audience)}
          >
            {audience === "comprador" ? "Comprador" : audience === "vendedor" ? "Vendedor" : "Corretor"}
          </button>
        {/each}
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
      {#each planos[active] as plano}
        <article class={`relative flex flex-col rounded-md border bg-app-surface p-6 ${plano.destaque ? "border-app-action border-2 shadow-sm" : "border-app-border"}`}>
          {#if plano.destaque}
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-app-action px-3 py-1 text-xs font-bold text-app-fg">Popular</div>
          {/if}
          <div class="text-center">
            <h2 class="text-2xl font-bold">{plano.nome}</h2>
            <p class="mt-2 text-app-muted">{plano.descricao}</p>
            <div class="mt-4">
              <span class="text-4xl font-bold">{plano.preco === 0 ? "Grátis" : `R$ ${plano.preco}`}</span>
              {#if plano.preco > 0}<span class="ml-2 text-sm text-app-muted">/mês</span>{/if}
            </div>
          </div>
          <ul class="mt-6 flex-1 space-y-3">
            {#each plano.features as feature}
              <li class="flex items-start gap-2">
                <Check class="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
                <span class="text-sm text-app-muted">{feature}</span>
              </li>
            {/each}
          </ul>
          <button class={`mt-6 w-full rounded-md py-3 font-medium ${plano.destaque ? "bg-app-action text-app-action-foreground" : "border border-app-border bg-app-surface-muted text-app-muted"}`} disabled>
            Em breve
          </button>
        </article>
      {/each}
    </div>
  </section>
</main>
