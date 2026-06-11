<script lang="ts">
  import { formatCurrencyCompact } from "$lib/financiamento/calculations";

  let {
    finalBalance,
    minimumBalance,
    criticalMonthLabel
  }: {
    finalBalance: number;
    minimumBalance: number;
    criticalMonthLabel: string;
  } = $props();
</script>

<div
  class="grid shrink-0 grid-cols-3 divide-x divide-app-border border-t border-app-border bg-app-surface text-xs"
>
  <div class="px-3 py-2">
    <span class="block text-app-muted">Saldo final</span>
    <strong class="mt-0.5 block font-mono text-sm text-app-fg">
      {formatCurrencyCompact(finalBalance)}
    </strong>
  </div>
  <div class="px-3 py-2">
    <span class="block text-app-muted">Menor saldo</span>
    <strong
      class={[
        "mt-0.5 block font-mono text-sm",
        minimumBalance < 0 ? "text-app-danger" : "text-app-fg"
      ]}
    >
      {formatCurrencyCompact(minimumBalance)}
    </strong>
  </div>
  <div class="px-3 py-2">
    <span class="block text-app-muted">Mês crítico</span>
    <strong class="mt-0.5 block text-sm text-app-fg">{criticalMonthLabel}</strong>
  </div>
</div>
