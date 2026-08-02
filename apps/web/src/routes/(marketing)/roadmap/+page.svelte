<script lang="ts">
  import "@fontsource-variable/space-grotesk";

  type Milestone = {
    label: string;
    title: string;
    description: string;
    accent: "cyan" | "violet" | "emerald";
  };

  const milestones: Milestone[] = [
    {
      label: "// Emails",
      title: "Envio de e-mails",
      description:
        "Recuperação de senha, e-mail de boas-vindas, notificações e avisos da plataforma.",
      accent: "cyan"
    },
    {
      label: "// Aluguel",
      title: "Imóveis para alugar",
      description:
        "Suporte para adicionar, comparar, analisar e planejar imóveis alugados.",
      accent: "emerald"
    },
    {
      label: "// Chatbot",
      title: "Conversas com IA",
      description:
        "Painel de conversa com um modelo de IA para tirar dúvidas, fazer análises e gerenciar as coleções de imóveis.",
      accent: "violet"
    },
    {
      label: "// App",
      title: "Aplicativo para celular",
      description:
        "Notificações, compartilhamento direto de arquivos, widgets e interface nativa.",
      accent: "cyan"
    }
  ];

  const accentStyles: Record<Milestone["accent"], { node: string; glow: string }> = {
    cyan: {
      node: "roadmap-node--cyan",
      glow: "roadmap-card__glow--cyan"
    },
    violet: {
      node: "roadmap-node--violet",
      glow: "roadmap-card__glow--violet"
    },
    emerald: {
      node: "roadmap-node--emerald",
      glow: "roadmap-card__glow--emerald"
    }
  };
</script>

<svelte:head>
  <title>Roadmap | Prisma</title>
  <meta
    name="description"
    content="O que vem por aí no Prisma: e-mails, chatbot, app mobile e imóveis para aluguel."
  />
</svelte:head>

<div class="roadmap-page">
  <div class="roadmap-bg" aria-hidden="true">
    <div class="roadmap-grid"></div>
    <div class="roadmap-glow roadmap-glow--left"></div>
    <div class="roadmap-glow roadmap-glow--right"></div>
  </div>

  <main class="roadmap-shell">
    <header class="roadmap-header">
      <p class="roadmap-eyebrow">Roadmap</p>
      <h1 class="roadmap-title">O futuro da plataforma</h1>
      <p class="roadmap-subtitle">
        Próximos passos em desenvolvimento pela equipe.
      </p>
    </header>

    <ol class="roadmap-list">
      {#each milestones as milestone, index (milestone.label)}
        {@const styles = accentStyles[milestone.accent]}
        <li class="roadmap-item">
          <div class="roadmap-rail" aria-hidden="true">
            {#if index > 0}
              <span class="roadmap-line roadmap-line--top"></span>
            {/if}
            <span class="roadmap-node {styles.node}">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <!-- Compact bi-pyramid: upright + mirrored, Lucide pyramid geometry scaled to fit -->
                <path
                  d="M12 3.2 6.5 11.6a.7.7 0 0 0-.05.78L12 15.1l5.55-2.72a.7.7 0 0 0-.05-.78Z"
                />
                <path
                  d="M12 20.8 6.5 12.4a.7.7 0 0 1-.05-.78L12 8.9l5.55 2.72a.7.7 0 0 1-.05.78Z"
                />
                <path d="M12 3.2v17.6" />
              </svg>
            </span>
            {#if index < milestones.length - 1}
              <span class="roadmap-line roadmap-line--bottom"></span>
            {/if}
          </div>

          <article class="roadmap-card">
            <div class="roadmap-card__glow {styles.glow}" aria-hidden="true"></div>
            <p class="roadmap-card__label">{milestone.label}</p>
            <h2 class="roadmap-card__title">{milestone.title}</h2>
            <p class="roadmap-card__description">{milestone.description}</p>
          </article>
        </li>
      {/each}
    </ol>
  </main>
</div>

<style>
  .roadmap-page {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    background: var(--app-bg);
    color: var(--app-fg);
    font-family: "Space Grotesk Variable", Inter, ui-sans-serif, system-ui, sans-serif;
  }

  .roadmap-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .roadmap-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(color-mix(in srgb, var(--app-cyan) 7%, transparent) 1px, transparent 1px),
      linear-gradient(90deg, color-mix(in srgb, var(--app-cyan) 7%, transparent) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(circle at 50% 20%, black 10%, transparent 72%);
  }

  .roadmap-glow {
    position: absolute;
    border-radius: 9999px;
    filter: blur(80px);
    opacity: 0.55;
  }

  .roadmap-glow--left {
    top: 8%;
    left: -8%;
    width: 28rem;
    height: 28rem;
    background: color-mix(in srgb, var(--app-cyan) 22%, transparent);
  }

  .roadmap-glow--right {
    right: -10%;
    bottom: 10%;
    width: 32rem;
    height: 32rem;
    background: color-mix(in srgb, var(--app-purple) 18%, transparent);
  }

  .roadmap-shell {
    position: relative;
    z-index: 1;
    margin: 0 auto;
    max-width: 72rem;
    padding: clamp(3rem, 8vw, 5rem) clamp(1.25rem, 4vw, 2.5rem) 5rem;
  }

  .roadmap-header {
    margin-bottom: clamp(2.5rem, 6vw, 4rem);
    max-width: 40rem;
  }

  .roadmap-eyebrow {
    margin: 0 0 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--app-cyan);
  }

  .roadmap-title {
    margin: 0;
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -0.03em;
    color: var(--app-fg);
  }

  .roadmap-subtitle {
    margin: 1rem 0 0;
    max-width: 34rem;
    font-size: clamp(1rem, 2vw, 1.125rem);
    line-height: 1.6;
    color: var(--app-muted);
  }

  .roadmap-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 0;
  }

  .roadmap-item {
    display: grid;
    grid-template-columns: 4.5rem minmax(0, 1fr);
    gap: 1.25rem;
    align-items: stretch;
  }

  .roadmap-rail {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100%;
  }

  .roadmap-line {
    width: 2px;
    flex: 1;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--app-cyan) 5%, transparent) 0%,
      color-mix(in srgb, var(--app-cyan) 55%, transparent) 50%,
      color-mix(in srgb, var(--app-cyan) 5%, transparent) 100%
    );
  }

  .roadmap-line--top {
    min-height: 1.25rem;
  }

  .roadmap-line--bottom {
    min-height: 1.25rem;
  }

  .roadmap-node {
    position: relative;
    z-index: 1;
    display: flex;
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
  }

  .roadmap-node svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .roadmap-node--cyan {
    color: var(--app-cyan);
    filter: drop-shadow(0 0 10px color-mix(in srgb, var(--app-cyan) 75%, transparent));
  }

  .roadmap-node--violet {
    color: var(--app-purple);
    filter: drop-shadow(0 0 10px color-mix(in srgb, var(--app-purple) 70%, transparent));
  }

  .roadmap-node--emerald {
    color: var(--app-green);
    filter: drop-shadow(0 0 10px color-mix(in srgb, var(--app-green) 65%, transparent));
  }

  .roadmap-card {
    position: relative;
    margin: 0 0 1.75rem;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--app-cyan) 20%, var(--app-border));
    border-radius: 1.25rem;
    background: color-mix(in srgb, var(--app-surface) 86%, transparent);
    padding: clamp(1.25rem, 3vw, 1.75rem);
    backdrop-filter: blur(12px);
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--app-fg) 3%, transparent) inset,
      0 24px 48px -24px color-mix(in srgb, var(--app-fg) 30%, transparent);
  }

  .roadmap-card__glow {
    position: absolute;
    top: 0;
    right: 0;
    width: 14rem;
    height: 14rem;
    border-radius: 9999px;
    opacity: 0.35;
    pointer-events: none;
  }

  .roadmap-card__glow--cyan {
    background: linear-gradient(
      to bottom right,
      color-mix(in srgb, var(--app-cyan) 40%, transparent),
      color-mix(in srgb, var(--app-cyan) 10%, transparent),
      transparent
    );
  }

  .roadmap-card__glow--violet {
    background: linear-gradient(
      to bottom right,
      color-mix(in srgb, var(--app-purple) 40%, transparent),
      color-mix(in srgb, var(--app-purple) 10%, transparent),
      transparent
    );
  }

  .roadmap-card__glow--emerald {
    background: linear-gradient(
      to bottom right,
      color-mix(in srgb, var(--app-green) 40%, transparent),
      color-mix(in srgb, var(--app-green) 10%, transparent),
      transparent
    );
  }

  .roadmap-card__label {
    position: relative;
    margin: 0 0 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: var(--app-cyan);
    font-family: "JetBrains Mono", ui-monospace, monospace;
  }

  .roadmap-card__title {
    position: relative;
    margin: 0;
    font-size: clamp(1.25rem, 2.5vw, 1.75rem);
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.02em;
    color: var(--app-fg);
  }

  .roadmap-card__description {
    position: relative;
    margin: 0.75rem 0 0;
    max-width: 42rem;
    font-size: 1rem;
    line-height: 1.65;
    color: var(--app-muted);
  }

  @media (max-width: 640px) {
    .roadmap-item {
      grid-template-columns: 3.25rem minmax(0, 1fr);
      gap: 0.75rem;
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    .roadmap-node {
      animation: roadmap-pulse 3.5s ease-in-out infinite;
    }

    .roadmap-item:nth-child(2) .roadmap-node {
      animation-delay: 0.4s;
    }

    .roadmap-item:nth-child(3) .roadmap-node {
      animation-delay: 0.8s;
    }

    .roadmap-item:nth-child(4) .roadmap-node {
      animation-delay: 1.2s;
    }
  }

  @keyframes roadmap-pulse {
    0%,
    100% {
      transform: scale(1);
    }

    50% {
      transform: scale(1.04);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .roadmap-node {
      animation: none !important;
    }
  }
</style>
