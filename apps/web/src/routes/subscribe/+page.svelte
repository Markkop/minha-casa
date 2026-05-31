<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
</script>

<main class="grid min-h-screen place-items-center bg-app-bg px-4 text-app-fg">
  <section class="w-full max-w-xl rounded-md border border-app-border bg-app-surface p-6">
    <h1 class="text-2xl font-semibold">Assinatura necessaria</h1>
    <p class="mt-3 text-sm leading-6 text-app-muted">
      A migracao Svelte deve recriar o fluxo de checkout/portal em Phoenix antes do corte final.
    </p>
    <div class="mt-6 flex gap-3">
      <a href="/planos"><Button>Ver planos</Button></a>
      <a href="/anuncios"><Button variant="secondary">Voltar</Button></a>
    </div>
  </section>
</main>
