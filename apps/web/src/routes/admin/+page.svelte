<script lang="ts">
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
</script>

<PageScaffold title="Admin" description="Usuarios, assinaturas, addons e reconciliacao Stripe.">
  <div class="rounded-md border border-app-border bg-app-surface p-5 text-sm leading-6 text-app-muted">
    Recriar os endpoints admin em Phoenix com checagem de `isAdmin` derivada da sessao/JWT.
  </div>
</PageScaffold>
