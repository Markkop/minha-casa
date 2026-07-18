<script lang="ts">
  import DemoListingsSection from "$lib/components/home/DemoListingsSection.svelte";
  import DemoFinanciamentoSection from "$lib/components/home/DemoFinanciamentoSection.svelte";
  import DemoFloodSection from "$lib/components/home/DemoFloodSection.svelte";

  interface Feature {
    href: string;
    icon: string;
    title: string;
    description: string;
    highlights: string[];
  }

  const allFeatures: Feature[] = [];

  const features = allFeatures;
</script>

<svelte:head>
  <title>Minha Casa</title>
  <meta
    name="description"
    content="Ferramentas inteligentes para ajudar na jornada de compra de imóveis."
  />
</svelte:head>

<div class="min-h-[calc(100vh-var(--nav-height,2.75rem))] bg-app-bg text-app-fg">
  <main class="mx-auto max-w-5xl px-4 py-16 sm:py-24">
    <div class="mb-16 text-center">
      <h1 class="mb-4 text-4xl font-bold text-app-fg sm:text-5xl">
        <span>Minha Casa</span>
      </h1>
      <p class="mx-auto max-w-2xl text-lg text-app-muted sm:text-xl">
        Ferramentas inteligentes para ajudar na sua jornada de compra do imóvel dos sonhos.
      </p>
    </div>

    <div
      class={`grid grid-cols-1 ${features.length > 1 ? "md:grid-cols-2" : "mx-auto max-w-xl"} gap-6`}
    >
      {#each features as feature (feature.href)}
        <a
          href={feature.href}
          class="group block rounded-xl border border-app-border bg-app-surface p-6 transition-all duration-300 hover:border-app-border-strong hover:shadow-sm"
        >
          <div class="flex items-start gap-4">
            <span class="text-4xl">{feature.icon}</span>
            <div class="flex-1">
              <h2
                class="mb-2 text-xl font-bold text-app-fg transition-colors group-hover:text-app-fg"
              >
                {feature.title}
              </h2>
              <p class="mb-4 text-sm leading-relaxed text-app-muted">
                {feature.description}
              </p>
              <div class="flex flex-wrap gap-2">
                {#each feature.highlights as highlight (highlight)}
                  <span
                    class="rounded-full bg-app-surface-muted px-2 py-1 text-xs text-app-muted"
                  >
                    {highlight}
                  </span>
                {/each}
              </div>
            </div>
          </div>
          <div
            class="mt-4 flex items-center text-sm text-app-fg opacity-0 transition-opacity group-hover:opacity-100"
          >
            <span>Acessar</span>
            <span class="ml-1">→</span>
          </div>
        </a>
      {/each}
    </div>

    <DemoListingsSection />
    <DemoFinanciamentoSection />
    <DemoFloodSection />

    <div class="mt-20 text-center">
      <div class="inline-flex items-center gap-2 text-xs text-app-subtle">
        <span class="h-px w-8 bg-app-border"></span>
        <span>Seus dados sincronizados com seguranca</span>
        <span class="h-px w-8 bg-app-border"></span>
      </div>
    </div>
  </main>
</div>
