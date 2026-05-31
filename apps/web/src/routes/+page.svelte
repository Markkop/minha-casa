<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
</script>

<svelte:head>
  <title>Minha Casa</title>
  <meta
    name="description"
    content="Ferramentas inteligentes para ajudar na jornada de compra de imoveis."
  />
</svelte:head>

<main class="min-h-screen bg-app-bg text-app-fg">
  <section class="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-8 px-6 py-16">
    <div class="max-w-3xl">
      <p class="mb-4 text-sm font-medium uppercase tracking-wide text-app-muted">Minha Casa</p>
      <h1 class="text-4xl font-semibold leading-tight sm:text-5xl">
        Compare, analise e organize imoveis em um workspace unico.
      </h1>
      <p class="mt-5 max-w-2xl text-base leading-7 text-app-muted">
        A migracao SvelteKit esta preparada para assumir a experiencia atual com Phoenix como API principal.
      </p>
    </div>

    <div class="flex flex-wrap gap-3">
      <a href="/signup"><Button>Criar conta</Button></a>
      <a href="/login"><Button variant="secondary">Entrar</Button></a>
      <a href="/planos"><Button variant="ghost">Ver planos</Button></a>
    </div>
  </section>
</main>
