<script lang="ts">
  import type { NearbySection } from "$lib/property-analysis/types";

  let { data }: { data?: NearbySection | null } = $props();
</script>

{#if data?.skipped}
  <div class="space-y-1 text-sm text-app-muted">
    <p>
      {#if data.reason === "google_billing_required"}
        Google Places indisponível — ative faturamento e a Places API no projeto da chave.
      {:else if data.reason === "no_coordinates"}
        Defina o endereço ou pin no mapa do imóvel para ver proximidades.
      {:else if data.reason === "google_not_configured"}
        Chave Google Maps ausente no servidor.
      {:else}
        Proximidades não disponíveis.
      {/if}
    </p>
    {#if data.hint && typeof data.hint === "string"}
      <p class="text-xs">{data.hint}</p>
    {/if}
  </div>
{:else if data && (data.categories ?? []).length === 0}
  <p class="text-sm text-app-muted">Nenhum lugar encontrado.</p>
{/if}
