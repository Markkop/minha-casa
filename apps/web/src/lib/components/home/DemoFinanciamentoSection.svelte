<script lang="ts">
  import { ArrowDown, ArrowUp } from "@lucide/svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import CardContent from "$lib/components/ui/CardContent.svelte";
  import CardHeader from "$lib/components/ui/CardHeader.svelte";
  import CardTitle from "$lib/components/ui/CardTitle.svelte";
  import Label from "$lib/components/ui/Label.svelte";
  import Slider from "$lib/components/ui/Slider.svelte";
  import CurrencyInput from "$lib/components/financiamento/currency-input.svelte";
  import PercentInput from "$lib/components/financiamento/percent-input.svelte";
  import {
    formatCurrency,
    formatCurrencyCompact,
    gerarMatrizCenarios,
    type CenarioCompleto
  } from "$lib/financiamento/calculations";
  import { cn } from "$lib/utils";

  const formatCurrencyK = (value: number): string => `R$ ${(value / 1000).toFixed(1)}k`;

  const DEMO_DEFAULTS = {
    valorImovel: 1200000,
    taxaAnual: 0.105,
    trMensal: 0.001,
    prazoMeses: 360,
    capitalDisponivel: 500000,
    valorApartamento: 550000,
    haircut: 0.15,
    aporteExtra: 2000,
    rendaMensal: 30000,
    seguros: 175,
    custoCondominioMensal: 1000
  };

  const PERCENTAGE_OPTIONS = [
    { value: 1.0, label: "Original" },
    { value: 0.95, label: "-5%" },
    { value: 0.9, label: "-10%" }
  ] as const;

  type Estrategia = "permuta" | "venda_posterior";
  type SortKey =
    | "valorImovel"
    | "valorApartamento"
    | "valorFinanciado"
    | "totalMes"
    | "comprometimento"
    | "prazoReal"
    | "jurosOtimizado"
    | "custoTotal";
  type SortDirection = "asc" | "desc";

  interface SortState {
    key: SortKey;
    direction: SortDirection;
  }

  let valorImovel = $state(DEMO_DEFAULTS.valorImovel);
  let taxaAnual = $state(DEMO_DEFAULTS.taxaAnual);
  let trMensal = $state(DEMO_DEFAULTS.trMensal);
  let capitalDisponivel = $state(DEMO_DEFAULTS.capitalDisponivel);
  let valorApartamento = $state(DEMO_DEFAULTS.valorApartamento);
  let aporteExtra = $state(DEMO_DEFAULTS.aporteExtra);
  let imovelMultipliers = $state<number[]>([1.0]);
  let aptoMultipliers = $state<number[]>([1.0]);
  let estrategias = $state<Estrategia[]>(["permuta", "venda_posterior"]);
  let sort = $state<SortState>({ key: "jurosOtimizado", direction: "asc" });

  function handleSort(key: SortKey) {
    sort = {
      key,
      direction: sort.key === key && sort.direction === "desc" ? "asc" : "desc"
    };
  }

  const cenarios = $derived.by(() => {
    const valoresImovel = imovelMultipliers.map((m) => Math.round(valorImovel * m));
    const valoresApto = aptoMultipliers.map((m) => Math.round(valorApartamento * m));

    return gerarMatrizCenarios({
      valoresImovel,
      valoresApartamento: valoresApto,
      capitalDisponivel,
      reservaEmergencia: 0,
      haircut: DEMO_DEFAULTS.haircut,
      taxaAnual,
      trMensal,
      prazoMeses: DEMO_DEFAULTS.prazoMeses,
      aporteExtra,
      rendaMensal: DEMO_DEFAULTS.rendaMensal,
      custoCondominioMensal: DEMO_DEFAULTS.custoCondominioMensal,
      seguros: DEMO_DEFAULTS.seguros
    }).filter((c) => estrategias.includes(c.estrategia));
  });

  const sortedCenarios = $derived.by(() => {
    return [...cenarios].sort((a, b) => {
      const getValue = (cenario: CenarioCompleto, key: SortKey): number => {
        const paths: Record<SortKey, number> = {
          valorImovel: cenario.valorImovel,
          valorApartamento: cenario.valorApartamento,
          valorFinanciado: cenario.financiamento.valorFinanciado,
          totalMes: cenario.aporteExtra + cenario.tabelaPadrao.primeiraParcelar,
          comprometimento: cenario.comprometimento.percentual,
          prazoReal: cenario.cenarioOtimizado.prazoReal,
          jurosOtimizado: cenario.cenarioOtimizado.totalJuros,
          custoTotal: cenario.custoTotalOtimizado
        };
        return paths[key] ?? 0;
      };

      const aVal = getValue(a, sort.key);
      const bVal = getValue(b, sort.key);
      return sort.direction === "asc" ? aVal - bVal : bVal - aVal;
    });
  });

  function toggleImovelMult(m: number) {
    imovelMultipliers = imovelMultipliers.includes(m)
      ? imovelMultipliers.length > 1
        ? imovelMultipliers.filter((x) => x !== m)
        : imovelMultipliers
      : [...imovelMultipliers, m];
  }

  function toggleAptoMult(m: number) {
    aptoMultipliers = aptoMultipliers.includes(m)
      ? aptoMultipliers.length > 1
        ? aptoMultipliers.filter((x) => x !== m)
        : aptoMultipliers
      : [...aptoMultipliers, m];
  }

  function toggleEstrategia(e: Estrategia) {
    estrategias = estrategias.includes(e)
      ? estrategias.length > 1
        ? estrategias.filter((x) => x !== e)
        : estrategias
      : [...estrategias, e];
  }
</script>

{#snippet sortableHeader(
  label: string,
  sortKey: SortKey,
  align: "left" | "right" = "left"
)}
  {@const isActive = sort.key === sortKey}
  {@const isAsc = isActive && sort.direction === "asc"}
  <th
    class={cn(
      "cursor-pointer px-3 py-2 text-xs font-medium text-app-muted transition-colors hover:bg-app-surface-muted",
      align === "right" ? "text-right" : "text-left"
    )}
    onclick={() => handleSort(sortKey)}
  >
    <div class={cn("flex items-center gap-1", align === "right" && "justify-end")}>
      <span>{label}</span>
      {#if isActive}
        {#if isAsc}
          <ArrowUp class="h-3 w-3 text-app-fg" />
        {:else}
          <ArrowDown class="h-3 w-3 text-app-fg" />
        {/if}
      {/if}
    </div>
  </th>
{/snippet}

<section class="mt-16 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
  <div
    class="flex flex-col justify-between gap-4 border-b border-app-border pb-4 md:flex-row md:items-center"
  >
    <div>
      <h2 class="flex items-center gap-2 text-2xl font-bold text-app-fg">
        <span>🏠</span>
        <span>Simulador de Financiamento</span>
        <span
          class="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800"
        >
          <span>🚀</span>
          Em Breve
        </span>
      </h2>
      <p class="text-sm text-app-muted">
        Sistema SAC com análise de cenários e estratégias permuta vs venda.
      </p>
    </div>
  </div>

  <Card class="border-app-border bg-app-surface">
    <CardContent class="px-4 pb-4 pt-4">
      <div class="space-y-6">
        <div class="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          <div class="space-y-1">
            <Label class="text-xs text-app-muted">Valor do Imóvel alvo</Label>
            <Slider
              bind:value={valorImovel}
              min={500000}
              max={3000000}
              step={50000}
              class="py-1"
            />
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
            <Slider
              bind:value={valorApartamento}
              min={200000}
              max={2000000}
              step={50000}
              class="py-1"
            />
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
            <Slider
              bind:value={capitalDisponivel}
              min={100000}
              max={2000000}
              step={50000}
              class="py-1"
            />
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

        <div class="space-y-4">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <Label class="text-xs text-app-muted">Simular com Valores Variados (Imóvel Alvo)</Label>
              <div class="flex flex-wrap gap-2">
                {#each PERCENTAGE_OPTIONS as { value, label } (value)}
                  <button
                    type="button"
                    onclick={() => toggleImovelMult(value)}
                    class={cn(
                      "flex flex-col items-center gap-0.5 rounded-md border px-3 py-1.5 text-xs transition-all",
                      imovelMultipliers.includes(value)
                        ? "border-app-action bg-app-action text-app-action-foreground"
                        : "border-app-border bg-app-bg text-app-muted"
                    )}
                  >
                    <span class="font-semibold">{label}</span>
                    <span class="text-[10px] opacity-75"
                      >{formatCurrency(Math.round(valorImovel * value))}</span
                    >
                  </button>
                {/each}
              </div>
            </div>

            <div class="space-y-2">
              <Label class="text-xs text-app-muted">Simular com Valores Variados (Imóvel Existente)</Label>
              <div class="flex flex-wrap gap-2">
                {#each PERCENTAGE_OPTIONS as { value, label } (value)}
                  <button
                    type="button"
                    onclick={() => toggleAptoMult(value)}
                    class={cn(
                      "flex flex-col items-center gap-0.5 rounded-md border px-3 py-1.5 text-xs transition-all",
                      aptoMultipliers.includes(value)
                        ? "border-rose-600 bg-rose-50 text-rose-700"
                        : "border-app-border bg-app-bg text-app-muted"
                    )}
                  >
                    <span class="font-semibold">{label}</span>
                    <span class="text-[10px] opacity-75"
                      >{formatCurrency(Math.round(valorApartamento * value))}</span
                    >
                  </button>
                {/each}
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <Label class="text-xs text-app-muted">Estratégias</Label>
            <div class="flex gap-2">
              <button
                type="button"
                onclick={() => toggleEstrategia("permuta")}
                class={cn(
                  "rounded-md border px-3 py-1.5 text-xs transition-all",
                  estrategias.includes("permuta")
                    ? "border-rose-600 bg-rose-50 text-rose-700"
                    : "border-app-border bg-app-bg text-app-muted"
                )}
              >
                Permuta
              </button>
              <button
                type="button"
                onclick={() => toggleEstrategia("venda_posterior")}
                class={cn(
                  "rounded-md border px-3 py-1.5 text-xs transition-all",
                  estrategias.includes("venda_posterior")
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-app-border bg-app-bg text-app-muted"
                )}
              >
                Venda Posterior
              </button>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>

  <Card class="border-app-border bg-app-surface">
    <CardHeader class="px-4 pb-2 pt-4">
      <CardTitle class="text-sm">Tabela Comparativa</CardTitle>
    </CardHeader>
    <CardContent class="p-0">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-app-border bg-app-bg">
              <th class="w-8 px-2 py-2"></th>
              {@render sortableHeader("Alvo", "valorImovel")}
              {@render sortableHeader("Apto", "valorApartamento")}
              <th class="px-3 py-2 text-left text-xs font-medium text-app-muted">Estratégia</th>
              {@render sortableHeader("Financiado", "valorFinanciado", "right")}
              {@render sortableHeader("Total/mês", "totalMes", "right")}
              {@render sortableHeader("Prazo", "prazoReal", "right")}
              {@render sortableHeader("Juros", "jurosOtimizado", "right")}
              {@render sortableHeader("Custo Total", "custoTotal", "right")}
            </tr>
          </thead>
          <tbody>
            {#each sortedCenarios.slice(0, 12) as c (c.id)}
              <tr
                class={cn(
                  "border-b border-app-border transition-colors hover:bg-app-bg",
                  c.isBest && "bg-app-action/20"
                )}
              >
                <td class="w-8 px-2 py-2 text-center">
                  {#if c.isBest}
                    <span class="text-app-accent">✓</span>
                  {/if}
                </td>
                <td class="whitespace-nowrap px-3 py-2 font-mono text-app-fg">
                  {formatCurrencyCompact(c.valorImovel)}
                </td>
                <td class="whitespace-nowrap px-3 py-2 font-mono text-rose-700">
                  {formatCurrencyCompact(
                    c.estrategia === "permuta"
                      ? c.financiamento.valorApartamentoUsado
                      : c.valorApartamento
                  )}
                </td>
                <td class="px-3 py-2">
                  <span
                    class={cn(
                      "rounded border px-2 py-0.5 text-xs",
                      c.estrategia === "permuta"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    )}
                  >
                    {#if c.estrategia === "permuta"}
                      Permuta
                    {:else}
                      <span class="md:hidden">Posterior</span>
                      <span class="hidden md:inline">Venda Posterior</span>
                    {/if}
                  </span>
                </td>
                <td class="whitespace-nowrap px-3 py-2 text-right font-mono">
                  {formatCurrencyCompact(c.financiamento.valorFinanciado)}
                </td>
                <td
                  class="whitespace-nowrap px-3 py-2 text-right font-mono text-sm font-bold text-app-fg"
                >
                  {formatCurrencyK(c.aporteExtra + c.tabelaPadrao.primeiraParcelar)}
                </td>
                <td class="px-3 py-2 text-right font-mono text-sm text-app-fg">
                  {(c.cenarioOtimizado.prazoReal / 12) % 1 === 0
                    ? `${Math.round(c.cenarioOtimizado.prazoReal / 12)}a`
                    : `${(c.cenarioOtimizado.prazoReal / 12).toFixed(1)}a`}
                </td>
                <td
                  class="whitespace-nowrap px-3 py-2 text-right font-mono text-sm font-bold text-rose-700"
                >
                  {formatCurrencyK(c.cenarioOtimizado.totalJuros)}
                </td>
                <td class="whitespace-nowrap px-3 py-2 text-right font-mono">
                  {formatCurrencyCompact(c.custoTotalOtimizado)}
                </td>
              </tr>
            {/each}
            {#if sortedCenarios.length === 0}
              <tr>
                <td colspan={9} class="px-3 py-8 text-center text-app-muted">
                  Selecione pelo menos um filtro e uma estratégia
                </td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
</section>
