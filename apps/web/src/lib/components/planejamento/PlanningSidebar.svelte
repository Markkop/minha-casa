<script lang="ts">
  import {
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    CalendarRange,
    CircleDollarSign,
    Copy,
    Landmark,
    Plus,
    Receipt,
    Trash2,
    TrendingDown,
    TrendingUp,
    WalletCards
  } from "@lucide/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import CurrencyInput from "$lib/components/financiamento/currency-input.svelte";
  import PercentInput from "$lib/components/financiamento/percent-input.svelte";
  import type {
    PlanningDocument,
    PlanningEvent,
    PlanningValidationIssue
  } from "$lib/planejamento/types";

  type LibraryItem = {
    type: PlanningEvent["type"];
    label: string;
    description: string;
    icon: typeof Landmark;
  };

  const libraryGroups: Array<{ label: string; items: LibraryItem[] }> = [
    {
      label: "Casa",
      items: [
        {
          type: "financing",
          label: "Financiamento",
          description: "Compra financiada pelo sistema SAC",
          icon: Landmark
        },
        {
          type: "extra-amortization",
          label: "Amortização extra",
          description: "Reduza prazo ou parcela",
          icon: TrendingDown
        }
      ]
    },
    {
      label: "Fluxo de caixa",
      items: [
        {
          type: "one-time-income",
          label: "Receita única",
          description: "Venda, herança ou bônus",
          icon: TrendingUp
        },
        {
          type: "one-time-expense",
          label: "Despesa única",
          description: "Compra ou pagamento pontual",
          icon: Receipt
        },
        {
          type: "monthly-income",
          label: "Receita mensal",
          description: "Aumento temporário da renda",
          icon: CircleDollarSign
        },
        {
          type: "monthly-expense",
          label: "Despesa mensal",
          description: "Aumento temporário dos custos",
          icon: WalletCards
        }
      ]
    },
    {
      label: "Flexível",
      items: [
        {
          type: "custom",
          label: "Evento customizado",
          description: "Valores iniciais e mensais",
          icon: CalendarRange
        }
      ]
    }
  ];

  let {
    document,
    selectedEvent,
    issues,
    onCreate,
    onUpdateDocument,
    onUpdateEvent,
    onDuplicateEvent,
    onDeleteEvent,
    onCloseInspector,
    onRenameTrack,
    onMoveTrack,
    onDeleteTrack
  }: {
    document: PlanningDocument;
    selectedEvent: PlanningEvent | null;
    issues: PlanningValidationIssue[];
    onCreate: (type: PlanningEvent["type"]) => void;
    onUpdateDocument: (document: PlanningDocument) => void;
    onUpdateEvent: (event: PlanningEvent) => void;
    onDuplicateEvent: (eventId: string) => void;
    onDeleteEvent: (eventId: string) => void;
    onCloseInspector: () => void;
    onRenameTrack: (trackId: string, name: string) => void;
    onMoveTrack: (trackId: string, direction: -1 | 1) => void;
    onDeleteTrack: (trackId: string) => void;
  } = $props();

  const eventIssues = $derived(
    selectedEvent ? issues.filter((issue) => issue.eventId === selectedEvent.id) : []
  );
  const financingEvents = $derived(
    document.events.filter((event) => event.type === "financing")
  );

  function monthKey(index: number): string {
    const [year, month] = document.startMonth.split("-").map(Number);
    const date = new Date(year, month - 1 + index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function monthIndex(value: string): number {
    const [startYear, startMonth] = document.startMonth.split("-").map(Number);
    const [year, month] = value.split("-").map(Number);
    return Math.max(0, Math.min(document.horizonMonths - 1, (year - startYear) * 12 + month - startMonth));
  }

  function updateBase<K extends "name" | "trackId" | "startMonth" | "enabled">(
    field: K,
    value: PlanningEvent[K]
  ) {
    if (!selectedEvent) return;
    onUpdateEvent({ ...selectedEvent, [field]: value } as PlanningEvent);
  }

  function dragStart(event: DragEvent, type: PlanningEvent["type"]) {
    event.dataTransfer?.setData("application/x-planning-event", type);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
  }
</script>

{#if selectedEvent}
  <div class="flex min-h-full flex-col">
    <div class="flex items-center gap-2 border-b border-app-border px-3 py-2">
      <Button variant="ghost" size="icon" title="Voltar para eventos" onclick={onCloseInspector}>
        <ArrowLeft class="size-4" />
      </Button>
      <div class="min-w-0 flex-1">
        <span class="block text-[10px] font-semibold uppercase tracking-wide text-app-muted">
          Editar evento
        </span>
        <strong class="block truncate text-sm text-app-fg">{selectedEvent.name}</strong>
      </div>
    </div>

    <div class="flex-1 space-y-4 p-3">
      {#if eventIssues.length > 0}
        <div class="space-y-1 rounded-md border border-app-warning/40 bg-app-warning/10 p-2 text-xs">
          {#each eventIssues as issue}
            <p class={issue.severity === "error" ? "text-app-danger" : "text-app-warning"}>
              {issue.message}
            </p>
          {/each}
        </div>
      {/if}

      <label class="block space-y-1 text-xs font-medium text-app-muted">
        <span>Nome</span>
        <Input
          value={selectedEvent.name}
          class="h-9"
          oninput={(event) => updateBase("name", event.currentTarget.value)}
        />
      </label>

      <label class="block space-y-1 text-xs font-medium text-app-muted">
        <span>Linha</span>
        <select
          class="h-9 w-full rounded-md border border-app-border bg-app-surface px-2 text-sm text-app-fg"
          value={selectedEvent.trackId}
          onchange={(event) => updateBase("trackId", event.currentTarget.value)}
        >
          {#each document.tracks as track (track.id)}
            <option value={track.id}>{track.name}</option>
          {/each}
        </select>
      </label>

      <label class="block space-y-1 text-xs font-medium text-app-muted">
        <span>Início</span>
        <Input
          type="month"
          value={monthKey(selectedEvent.startMonth)}
          class="h-9"
          onchange={(event) => updateBase("startMonth", monthIndex(event.currentTarget.value))}
        />
      </label>

      {#if selectedEvent.type === "financing"}
        <label class="block space-y-1 text-xs font-medium text-app-muted">
          <span>Valor do imóvel</span>
          <CurrencyInput
            value={selectedEvent.propertyValue}
            class="h-9"
            onchange={(value) =>
              onUpdateEvent({
                ...selectedEvent,
                propertyValue: value,
                financedAmount: Math.max(0, value - selectedEvent.downPayment)
              })}
          />
        </label>
        <label class="block space-y-1 text-xs font-medium text-app-muted">
          <span>Entrada</span>
          <CurrencyInput
            value={selectedEvent.downPayment}
            class="h-9"
            onchange={(value) =>
              onUpdateEvent({
                ...selectedEvent,
                downPayment: value,
                financedAmount: Math.max(0, selectedEvent.propertyValue - value)
              })}
          />
        </label>
        <label class="block space-y-1 text-xs font-medium text-app-muted">
          <span>Valor financiado</span>
          <CurrencyInput
            value={selectedEvent.financedAmount}
            class="h-9"
            onchange={(value) => onUpdateEvent({ ...selectedEvent, financedAmount: value })}
          />
        </label>
        <label class="block space-y-1 text-xs font-medium text-app-muted">
          <span>Prazo em meses</span>
          <Input
            type="number"
            min="1"
            max="1200"
            value={selectedEvent.termMonths}
            class="h-9"
            onchange={(event) =>
              onUpdateEvent({
                ...selectedEvent,
                termMonths: Math.max(1, Number(event.currentTarget.value) || 1)
              })}
          />
        </label>
        <label class="block space-y-1 text-xs font-medium text-app-muted">
          <span>Taxa anual</span>
          <PercentInput
            value={selectedEvent.annualInterestRate}
            class="h-9"
            onchange={(value) => onUpdateEvent({ ...selectedEvent, annualInterestRate: value })}
          />
        </label>
        <label class="block space-y-1 text-xs font-medium text-app-muted">
          <span>TR mensal</span>
          <PercentInput
            value={selectedEvent.monthlyTrRate}
            class="h-9"
            onchange={(value) => onUpdateEvent({ ...selectedEvent, monthlyTrRate: value })}
          />
        </label>
        <label class="block space-y-1 text-xs font-medium text-app-muted">
          <span>Seguro mensal</span>
          <CurrencyInput
            value={selectedEvent.monthlyInsurance}
            class="h-9"
            onchange={(value) => onUpdateEvent({ ...selectedEvent, monthlyInsurance: value })}
          />
        </label>
      {:else if selectedEvent.type === "extra-amortization"}
        <label class="block space-y-1 text-xs font-medium text-app-muted">
          <span>Financiamento associado</span>
          <select
            class="h-9 w-full rounded-md border border-app-border bg-app-surface px-2 text-sm text-app-fg"
            value={selectedEvent.financingEventId}
            onchange={(event) =>
              onUpdateEvent({ ...selectedEvent, financingEventId: event.currentTarget.value })}
          >
            <option value="">Selecione</option>
            {#each financingEvents as financing (financing.id)}
              <option value={financing.id}>{financing.name}</option>
            {/each}
          </select>
        </label>
        <label class="block space-y-1 text-xs font-medium text-app-muted">
          <span>Valor</span>
          <CurrencyInput
            value={selectedEvent.amount}
            class="h-9"
            onchange={(value) => onUpdateEvent({ ...selectedEvent, amount: value })}
          />
        </label>
        <label class="block space-y-1 text-xs font-medium text-app-muted">
          <span>Frequência</span>
          <select
            class="h-9 w-full rounded-md border border-app-border bg-app-surface px-2 text-sm text-app-fg"
            value={selectedEvent.frequency}
            onchange={(event) =>
              onUpdateEvent({
                ...selectedEvent,
                frequency: event.currentTarget.value === "monthly" ? "monthly" : "once",
                endMonth:
                  event.currentTarget.value === "monthly"
                    ? selectedEvent.endMonth ?? selectedEvent.startMonth + 12
                    : undefined
              })}
          >
            <option value="once">Única</option>
            <option value="monthly">Mensal</option>
          </select>
        </label>
        <label class="block space-y-1 text-xs font-medium text-app-muted">
          <span>Estratégia</span>
          <select
            class="h-9 w-full rounded-md border border-app-border bg-app-surface px-2 text-sm text-app-fg"
            value={selectedEvent.strategy}
            onchange={(event) =>
              onUpdateEvent({
                ...selectedEvent,
                strategy:
                  event.currentTarget.value === "reduce-installment"
                    ? "reduce-installment"
                    : "reduce-term"
              })}
          >
            <option value="reduce-term">Reduzir prazo</option>
            <option value="reduce-installment">Reduzir parcela</option>
          </select>
        </label>
      {:else if selectedEvent.type === "custom"}
        <label class="block space-y-1 text-xs font-medium text-app-muted">
          <span>Receita inicial</span>
          <CurrencyInput value={selectedEvent.initialIncome} class="h-9" onchange={(value) => onUpdateEvent({ ...selectedEvent, initialIncome: value })} />
        </label>
        <label class="block space-y-1 text-xs font-medium text-app-muted">
          <span>Despesa inicial</span>
          <CurrencyInput value={selectedEvent.initialExpense} class="h-9" onchange={(value) => onUpdateEvent({ ...selectedEvent, initialExpense: value })} />
        </label>
        <label class="block space-y-1 text-xs font-medium text-app-muted">
          <span>Receita mensal</span>
          <CurrencyInput value={selectedEvent.monthlyIncome} class="h-9" onchange={(value) => onUpdateEvent({ ...selectedEvent, monthlyIncome: value })} />
        </label>
        <label class="block space-y-1 text-xs font-medium text-app-muted">
          <span>Despesa mensal</span>
          <CurrencyInput value={selectedEvent.monthlyExpense} class="h-9" onchange={(value) => onUpdateEvent({ ...selectedEvent, monthlyExpense: value })} />
        </label>
      {:else}
        <label class="block space-y-1 text-xs font-medium text-app-muted">
          <span>Valor</span>
          <CurrencyInput
            value={selectedEvent.amount}
            class="h-9"
            onchange={(value) => onUpdateEvent({ ...selectedEvent, amount: value })}
          />
        </label>
      {/if}

      {#if selectedEvent.type === "monthly-income" ||
      selectedEvent.type === "monthly-expense" ||
      selectedEvent.type === "custom" ||
      (selectedEvent.type === "extra-amortization" && selectedEvent.frequency === "monthly")}
        <label class="block space-y-1 text-xs font-medium text-app-muted">
          <span>Fim</span>
          <Input
            type="month"
            value={monthKey(selectedEvent.endMonth ?? document.horizonMonths - 1)}
            class="h-9"
            onchange={(event) =>
              onUpdateEvent({
                ...selectedEvent,
                endMonth: monthIndex(event.currentTarget.value)
              } as PlanningEvent)}
          />
        </label>
      {/if}

      <label class="flex items-center justify-between gap-3 rounded-md border border-app-border p-2 text-sm">
        <span class="text-app-fg">Incluir na simulação</span>
        <input
          type="checkbox"
          checked={selectedEvent.enabled}
          onchange={(event) => updateBase("enabled", event.currentTarget.checked)}
        />
      </label>
    </div>

    <div class="grid grid-cols-2 gap-2 border-t border-app-border p-3">
      <Button variant="outline" size="sm" onclick={() => onDuplicateEvent(selectedEvent.id)}>
        <Copy class="size-3.5" />
        Duplicar
      </Button>
      <Button variant="danger" size="sm" onclick={() => onDeleteEvent(selectedEvent.id)}>
        <Trash2 class="size-3.5" />
        Excluir
      </Button>
    </div>
  </div>
{:else}
  <div class="space-y-5 p-3">
    {#each libraryGroups as group}
      <section>
        <h3 class="mb-2 text-[10px] font-semibold uppercase tracking-wider text-app-muted">
          {group.label}
        </h3>
        <div class="space-y-1.5">
          {#each group.items as item (item.type)}
            <button
              type="button"
              draggable="true"
              class="flex w-full items-center gap-2 rounded-md border border-app-border bg-app-surface p-2 text-left transition hover:border-app-accent hover:bg-app-bg"
              ondragstart={(event) => dragStart(event, item.type)}
              onclick={() => onCreate(item.type)}
            >
              <span class="grid size-8 shrink-0 place-items-center rounded bg-app-surface-muted text-app-accent">
                <item.icon class="size-4" />
              </span>
              <span class="min-w-0">
                <strong class="block text-xs text-app-fg">{item.label}</strong>
                <span class="block truncate text-[10px] text-app-muted">{item.description}</span>
              </span>
              <Plus class="ml-auto size-3.5 shrink-0 text-app-muted" />
            </button>
          {/each}
        </div>
      </section>
    {/each}

    <section class="space-y-2 border-t border-app-border pt-4">
      <h3 class="text-[10px] font-semibold uppercase tracking-wider text-app-muted">
        Simulação
      </h3>
      <label class="block space-y-1 text-xs font-medium text-app-muted">
        <span>Saldo inicial</span>
        <CurrencyInput
          value={document.initialBalance}
          class="h-9"
          onchange={(value) => onUpdateDocument({ ...document, initialBalance: value })}
        />
      </label>
      <label class="block space-y-1 text-xs font-medium text-app-muted">
        <span>Renda mensal base</span>
        <CurrencyInput
          value={document.baseMonthlyIncome}
          class="h-9"
          onchange={(value) => onUpdateDocument({ ...document, baseMonthlyIncome: value })}
        />
      </label>
      <label class="block space-y-1 text-xs font-medium text-app-muted">
        <span>Custo mensal base</span>
        <CurrencyInput
          value={document.baseMonthlyCost}
          class="h-9"
          onchange={(value) => onUpdateDocument({ ...document, baseMonthlyCost: value })}
        />
      </label>
      <label class="block space-y-1 text-xs font-medium text-app-muted">
        <span>Mês inicial</span>
        <Input
          type="month"
          value={document.startMonth}
          class="h-9"
          onchange={(event) => onUpdateDocument({ ...document, startMonth: event.currentTarget.value })}
        />
      </label>
      <label class="block space-y-1 text-xs font-medium text-app-muted">
        <span>Horizonte em meses</span>
        <Input
          type="number"
          min="12"
          max="1200"
          value={document.horizonMonths}
          class="h-9"
          onchange={(event) =>
            onUpdateDocument({
              ...document,
              horizonMonths: Math.max(12, Number(event.currentTarget.value) || 360)
            })}
        />
      </label>
    </section>

    <section class="space-y-2 border-t border-app-border pt-4">
      <h3 class="text-[10px] font-semibold uppercase tracking-wider text-app-muted">
        Linhas
      </h3>
      {#each [...document.tracks].sort((a, b) => a.order - b.order) as track, index (track.id)}
        <div class="flex items-center gap-1">
          <Input
            value={track.name}
            class="h-8 min-w-0 flex-1"
            oninput={(event) => onRenameTrack(track.id, event.currentTarget.value)}
          />
          <Button variant="ghost" size="icon" title="Mover linha para cima" disabled={index === 0} onclick={() => onMoveTrack(track.id, -1)}>
            <ArrowUp class="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" title="Mover linha para baixo" disabled={index === document.tracks.length - 1} onclick={() => onMoveTrack(track.id, 1)}>
            <ArrowDown class="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" title="Excluir linha vazia" disabled={document.tracks.length <= 1} onclick={() => onDeleteTrack(track.id)}>
            <Trash2 class="size-3.5" />
          </Button>
        </div>
      {/each}
    </section>
  </div>
{/if}
