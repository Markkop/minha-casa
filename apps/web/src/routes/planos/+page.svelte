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
      {
        nome: "Free",
        preco: 0,
        descricao: "Pra organizar e aprender",
        features: [
          "3 coleções",
          "Até 25 anúncios salvos",
          "Parser de anúncio (texto) limitado/dia",
          "Simulador básico (1 cenário salvo)",
          "Mapa e comparador"
        ]
      },
      {
        nome: "Plus",
        preco: 20,
        descricao: "Pra decidir compra de verdade",
        features: [
          "10 coleções",
          "200 anúncios",
          "Parser multimodal (texto + conversa)",
          "Simulador completo (cenários ilimitados + amortização extra)",
          "Alerta de mudança (manual ou por lembrete)",
          "Export PDF/print (pra enviar pra família)"
        ],
        destaque: true
      },
      {
        nome: "Pro Comprador",
        preco: 50,
        descricao: "Pra usuário pesado",
        features: [
          "Anúncios ilimitados",
          "IA mais forte (resumo + checklist + riscos)",
          "Score automático 'bom negócio vs caro'",
          "Histórico de visitas e decisões",
          "Compartilhamento privado com família"
        ]
      }
    ],
    vendedor: [
      {
        nome: "Free",
        preco: 0,
        descricao: "Comece a vender",
        features: [
          "1 imóvel",
          "Checklist vendedor básico",
          "Gerador de descrição (1 versão)",
          "Link compartilhável do anúncio"
        ]
      },
      {
        nome: "Plus",
        preco: 20,
        descricao: "Venda mais rápido",
        features: [
          "Até 3 imóveis",
          "Gerador de anúncio 'multi-canal' (portal + insta + whatsapp)",
          "Organizador de leads simples (nome + status + notas)",
          "Checklist com etapas + prazos",
          "'Kit do anúncio': texto + fotos + pontos fortes"
        ],
        destaque: true
      },
      {
        nome: "Pro Vendedor",
        preco: 50,
        descricao: "Profissionalize sua venda",
        features: [
          "Leads ilimitados",
          "Acompanhamento de concorrentes (comparáveis manuais)",
          "Histórico de mudanças (preço, descrição)",
          "'Assistente de negociação' (scripts + respostas)"
        ]
      }
    ],
    corretor: [
      {
        nome: "Free (solo)",
        preco: 0,
        descricao: "Comece como corretor",
        features: [
          "Até 30 leads",
          "10 anúncios próprios",
          "Funil simples",
          "Parser de anúncio (texto)"
        ]
      },
      {
        nome: "Pro",
        preco: 99,
        descricao: "CRM completo para corretores",
        features: [
          "Leads ilimitados",
          "Funil customizável",
          "Tarefas, lembretes, SLA de resposta",
          "'Briefing do cliente' automático (preferências)",
          "Anúncios próprios ilimitados + páginas públicas",
          "Export pronto p/ portais",
          "Extensão Chrome (captura 1 clique)"
        ],
        destaque: true
      },
      {
        nome: "Imobiliária",
        preco: 199,
        descricao: "Para equipes e imobiliárias",
        features: [
          "Múltiplos usuários + permissões",
          "Distribuição de leads (fila / regras)",
          "Dashboard do time",
          "Templates por corretor",
          "Biblioteca condomínio/bairro compartilhada",
          "Integrações (Zapier/RD Station depois)"
        ]
      }
    ]
  };


</script>

<main class="min-h-[calc(100vh-var(--nav-height,2.75rem))] bg-app-bg text-app-fg">
  <section class="mx-auto max-w-7xl px-4 py-16 sm:py-24">
    <div class="mb-12 text-center">
      <h1 class="mb-4 text-4xl font-bold text-app-fg sm:text-5xl">Planos</h1>
      <p class="mx-auto max-w-3xl text-lg text-app-muted sm:text-xl">
        Escolha o plano ideal para o seu perfil. De comprador iniciante a imobiliária completa.
      </p>
    </div>

    <div class="mb-8 flex justify-center">
      <div class="flex rounded-md border border-app-border bg-app-surface p-1">
        {#each ["comprador", "vendedor", "corretor"] as audience}
          <button
            type="button"
            class={`h-10 rounded px-4 text-sm font-medium ${active === audience ? "bg-app-action text-app-action-foreground" : "text-app-muted hover:text-app-fg"}`}
            onclick={() => (active = audience as Audience)}
          >
            {audience === "comprador" ? "Comprador" : audience === "vendedor" ? "Vendedor" : "Corretor"}
          </button>
        {/each}
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
      {#each planos[active] as plano (plano.nome)}
        <article
          class={`relative flex flex-col rounded-md border bg-app-surface ${plano.destaque ? "border-app-action border-2 shadow-sm" : "border-app-border"}`}
        >
          {#if plano.destaque}
            <div class="absolute -top-3 left-1/2 -translate-x-1/2">
              <span class="rounded-full bg-app-action px-3 py-1 text-xs font-bold text-app-fg">Popular</span>
            </div>
          {/if}
          <div class="pb-4 text-center">
            <h2 class="text-2xl font-bold text-app-fg">{plano.nome}</h2>
            <p class="mt-2 text-app-muted">{plano.descricao}</p>
            <div class="mt-4">
              <span class="text-4xl font-bold text-app-fg">
                {plano.preco === 0 ? "Grátis" : `R$ ${plano.preco}`}
              </span>
              {#if plano.preco > 0}
                <span class="ml-2 text-sm text-app-muted">/mês</span>
              {/if}
            </div>
          </div>
          <div class="flex-1 px-6">
            <ul class="space-y-3">
              {#each plano.features as feature}
                <li class="flex items-start gap-2">
                  <Check class="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
                  <span class="text-sm text-app-muted">{feature}</span>
                </li>
              {/each}
            </ul>
          </div>
          <div class="p-6 pt-0">
            <button
              type="button"
              class={`w-full rounded-lg py-3 font-medium transition-all ${
                plano.destaque
                  ? "bg-app-action text-app-action-foreground hover:bg-app-action-hover"
                  : "border border-app-border bg-app-surface-muted text-app-muted"
              }`}
              disabled
            >
              Em breve
            </button>
          </div>
        </article>
      {/each}
    </div>

    <div class="mt-8 text-center">
      <p class="text-sm text-app-muted">
        {#if active === "comprador"}
          O comprador paga quando você vira <span class="font-medium text-app-fg">&quot;minha central de decisão imobiliária&quot;</span>, não só uma lista.
        {:else if active === "vendedor"}
          O vendedor paga quando você resolve <span class="font-medium text-app-fg">&quot;como criar um anúncio que vende e não perder interessados&quot;</span>.
        {:else}
          CRM completo com <span class="font-medium text-app-fg">integração com portais</span> e <span class="font-medium text-app-fg">gestão de leads</span> profissional.
        {/if}
      </p>
    </div>
  </section>
</main>
