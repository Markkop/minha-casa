<script lang="ts">
  import { Calculator, CircleDollarSign, Clock, Percent } from "@lucide/svelte";
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";

  type SacRow = {
    mes: number;
    saldo: number;
    amortizacao: number;
    juros: number;
    parcela: number;
  };

  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let valorImovel = $state(1_200_000);
  let entrada = $state(300_000);
  let prazoMeses = $state(360);
  let taxaAnual = $state(10.5);
  let trMensal = $state(0);
  let seguros = $state(120);
  let aporteExtra = $state(2_000);
  let rendaMensal = $state(25_000);

  const valorFinanciado = $derived(Math.max(valorImovel - entrada, 0));
  const taxaMensal = $derived(Math.pow(1 + taxaAnual / 100, 1 / 12) - 1 + trMensal / 100);
  const tabela = $derived(calcularSac(valorFinanciado, prazoMeses, taxaMensal, seguros, 0));
  const tabelaComAporte = $derived(calcularSac(valorFinanciado, prazoMeses, taxaMensal, seguros, aporteExtra));
  const primeiraParcela = $derived(tabela[0]?.parcela ?? 0);
  const ultimaParcela = $derived(tabela.at(-1)?.parcela ?? 0);
  const totalJuros = $derived(tabela.reduce((sum, row) => sum + row.juros, 0));
  const totalJurosComAporte = $derived(tabelaComAporte.reduce((sum, row) => sum + row.juros, 0));
  const mesesEconomizados = $derived(Math.max(prazoMeses - tabelaComAporte.length, 0));
  const comprometimento = $derived(rendaMensal > 0 ? primeiraParcela / rendaMensal : 0);
  const rendaNecessaria = $derived(primeiraParcela / 0.3);

  function calcularSac(
    principal: number,
    prazo: number,
    taxa: number,
    seguroMensal: number,
    aporte: number
  ): SacRow[] {
    if (principal <= 0 || prazo <= 0) return [];
    const rows: SacRow[] = [];
    const amortizacaoBase = principal / prazo;
    let saldo = principal;
    let mes = 1;

    while (saldo > 1 && mes <= prazo) {
      const juros = saldo * taxa;
      const amortizacao = Math.min(amortizacaoBase + aporte, saldo);
      rows.push({
        mes,
        saldo,
        amortizacao,
        juros,
        parcela: amortizacaoBase + juros + seguroMensal + aporte
      });
      saldo -= amortizacao;
      mes += 1;
    }

    return rows;
  }

  function money(value: number): string {
    return brl.format(Math.max(value, 0));
  }
</script>

<PageScaffold title="Financiamento" description="Simulador SAC com entrada, taxa, renda e amortizacao extra." status="Svelte port">
  <section class="grid gap-4 lg:grid-cols-[360px_1fr]">
    <form class="rounded-md border border-app-border bg-app-surface p-4">
      <h2 class="mb-4 text-sm font-semibold text-app-fg">Parametros</h2>
      <div class="grid gap-3">
        {#each [
          { label: "Valor do imovel", value: "valorImovel", min: 0, step: 10000 },
          { label: "Entrada", value: "entrada", min: 0, step: 10000 },
          { label: "Prazo (meses)", value: "prazoMeses", min: 12, step: 12 },
          { label: "Taxa anual (%)", value: "taxaAnual", min: 0, step: 0.1 },
          { label: "TR mensal (%)", value: "trMensal", min: 0, step: 0.01 },
          { label: "Seguros/taxas mensais", value: "seguros", min: 0, step: 10 },
          { label: "Aporte extra mensal", value: "aporteExtra", min: 0, step: 100 },
          { label: "Renda mensal", value: "rendaMensal", min: 0, step: 1000 }
        ] as field}
          <label class="flex flex-col gap-2 text-sm font-medium">
            {field.label}
            {#if field.value === "valorImovel"}
              <input class="h-10 rounded-md border border-app-border bg-white px-3" type="number" min={field.min} step={field.step} bind:value={valorImovel} />
            {:else if field.value === "entrada"}
              <input class="h-10 rounded-md border border-app-border bg-white px-3" type="number" min={field.min} step={field.step} bind:value={entrada} />
            {:else if field.value === "prazoMeses"}
              <input class="h-10 rounded-md border border-app-border bg-white px-3" type="number" min={field.min} step={field.step} bind:value={prazoMeses} />
            {:else if field.value === "taxaAnual"}
              <input class="h-10 rounded-md border border-app-border bg-white px-3" type="number" min={field.min} step={field.step} bind:value={taxaAnual} />
            {:else if field.value === "trMensal"}
              <input class="h-10 rounded-md border border-app-border bg-white px-3" type="number" min={field.min} step={field.step} bind:value={trMensal} />
            {:else if field.value === "seguros"}
              <input class="h-10 rounded-md border border-app-border bg-white px-3" type="number" min={field.min} step={field.step} bind:value={seguros} />
            {:else if field.value === "aporteExtra"}
              <input class="h-10 rounded-md border border-app-border bg-white px-3" type="number" min={field.min} step={field.step} bind:value={aporteExtra} />
            {:else}
              <input class="h-10 rounded-md border border-app-border bg-white px-3" type="number" min={field.min} step={field.step} bind:value={rendaMensal} />
            {/if}
          </label>
        {/each}
      </div>
    </form>

    <div class="flex flex-col gap-4">
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {#each [
          { label: "Financiado", value: money(valorFinanciado), icon: CircleDollarSign },
          { label: "Taxa mensal", value: pct.format(taxaMensal), icon: Percent },
          { label: "Primeira parcela", value: money(primeiraParcela), icon: Calculator },
          { label: "Prazo com aporte", value: `${tabelaComAporte.length} meses`, icon: Clock }
        ] as item}
          {@const Icon = item.icon}
          <article class="rounded-md border border-app-border bg-app-surface p-4">
            <div class="flex items-center justify-between gap-2 text-app-muted">
              <span class="text-sm">{item.label}</span>
              <Icon class="h-4 w-4" />
            </div>
            <div class="mt-2 text-2xl font-semibold text-app-fg">{item.value}</div>
          </article>
        {/each}
      </section>

      <section class="grid gap-4 lg:grid-cols-2">
        <article class="rounded-md border border-app-border bg-app-surface p-4">
          <h2 class="text-sm font-semibold">Cenario padrao</h2>
          <dl class="mt-3 grid gap-2 text-sm">
            <div class="flex justify-between gap-3"><dt class="text-app-muted">Ultima parcela</dt><dd>{money(ultimaParcela)}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-app-muted">Total de juros</dt><dd>{money(totalJuros)}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-app-muted">Renda minima 30%</dt><dd>{money(rendaNecessaria)}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-app-muted">Comprometimento</dt><dd>{pct.format(comprometimento)}</dd></div>
          </dl>
        </article>

        <article class="rounded-md border border-app-border bg-app-surface p-4">
          <h2 class="text-sm font-semibold">Com amortizacao extra</h2>
          <dl class="mt-3 grid gap-2 text-sm">
            <div class="flex justify-between gap-3"><dt class="text-app-muted">Meses economizados</dt><dd>{mesesEconomizados}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-app-muted">Juros com aporte</dt><dd>{money(totalJurosComAporte)}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-app-muted">Economia de juros</dt><dd>{money(totalJuros - totalJurosComAporte)}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-app-muted">Primeira parcela + aporte</dt><dd>{money(tabelaComAporte[0]?.parcela ?? 0)}</dd></div>
          </dl>
        </article>
      </section>

      <section class="overflow-x-auto rounded-md border border-app-border bg-app-surface">
        <table class="w-full min-w-[640px] border-collapse text-sm">
          <thead class="bg-app-surface-muted text-left text-xs uppercase text-app-muted">
            <tr>
              <th class="px-3 py-2 font-medium">Mes</th>
              <th class="px-3 py-2 font-medium">Saldo</th>
              <th class="px-3 py-2 font-medium">Amortizacao</th>
              <th class="px-3 py-2 font-medium">Juros</th>
              <th class="px-3 py-2 font-medium">Parcela</th>
            </tr>
          </thead>
          <tbody>
            {#each tabela.slice(0, 12) as row}
              <tr class="border-t border-app-border">
                <td class="px-3 py-2">{row.mes}</td>
                <td class="px-3 py-2">{money(row.saldo)}</td>
                <td class="px-3 py-2">{money(row.amortizacao)}</td>
                <td class="px-3 py-2">{money(row.juros)}</td>
                <td class="px-3 py-2 font-medium">{money(row.parcela)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>
    </div>
  </section>
</PageScaffold>
