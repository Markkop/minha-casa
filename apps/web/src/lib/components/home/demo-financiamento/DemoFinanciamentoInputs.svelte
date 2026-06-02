<script lang="ts">
  import Label from "$lib/components/ui/Label.svelte";
  import Slider from "$lib/components/ui/Slider.svelte";
  import CurrencyInput from "$lib/components/financiamento/currency-input.svelte";
  import PercentInput from "$lib/components/financiamento/percent-input.svelte";

  let {
    valorImovel = $bindable(),
    taxaAnual = $bindable(),
    trMensal = $bindable(),
    capitalDisponivel = $bindable(),
    valorApartamento = $bindable(),
    aporteExtra = $bindable()
  } = $props<{
    valorImovel: number;
    taxaAnual: number;
    trMensal: number;
    capitalDisponivel: number;
    valorApartamento: number;
    aporteExtra: number;
  }>();
</script>

<div class="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
  <div class="space-y-1">
    <Label class="text-xs text-app-muted">Valor do Imóvel alvo</Label>
    <Slider bind:value={valorImovel} min={500000} max={3000000} step={50000} class="py-1" />
    <CurrencyInput value={valorImovel} onchange={(v) => (valorImovel = v)} class="h-8 text-sm" />
  </div>

  <div class="space-y-1">
    <Label class="text-xs text-app-muted">Taxa de Juros Anual</Label>
    <Slider
      value={taxaAnual * 100}
      onValueChange={(v) => (taxaAnual = v / 100)}
      min={8}
      max={15}
      step={0.1}
      class="py-1"
    />
    <PercentInput value={taxaAnual} onchange={(v) => (taxaAnual = v)} class="h-8 text-sm" />
  </div>

  <div class="space-y-1">
    <Label class="text-xs text-app-muted">Imóvel Existente</Label>
    <Slider bind:value={valorApartamento} min={200000} max={2000000} step={50000} class="py-1" />
    <CurrencyInput
      value={valorApartamento}
      onchange={(v) => (valorApartamento = v)}
      class="h-8 text-sm"
    />
  </div>

  <div class="space-y-1">
    <Label class="text-xs text-app-muted">TR Mensal</Label>
    <Slider
      value={trMensal * 100}
      onValueChange={(v) => (trMensal = v / 100)}
      min={0}
      max={0.3}
      step={0.01}
      class="py-1"
    />
    <PercentInput value={trMensal} onchange={(v) => (trMensal = v)} class="h-8 text-sm" />
  </div>

  <div class="space-y-1">
    <Label class="text-xs text-app-muted">Capital Disponível (Entrada)</Label>
    <Slider bind:value={capitalDisponivel} min={100000} max={2000000} step={50000} class="py-1" />
    <CurrencyInput
      value={capitalDisponivel}
      onchange={(v) => (capitalDisponivel = v)}
      class="h-8 text-sm"
    />
  </div>

  <div class="space-y-1">
    <Label class="text-xs text-app-muted">Aporte Extra Mensal</Label>
    <Slider bind:value={aporteExtra} min={0} max={30000} step={500} class="py-1" />
    <CurrencyInput value={aporteExtra} onchange={(v) => (aporteExtra = v)} class="h-8 text-sm" />
  </div>
</div>
