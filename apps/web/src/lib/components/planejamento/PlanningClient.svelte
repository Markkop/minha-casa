<script lang="ts">
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import WorkspaceRightSidebarContent from "$lib/components/layout/WorkspaceRightSidebarContent.svelte";
  import PlanningSidebar from "$lib/components/planejamento/PlanningSidebar.svelte";
  import PlanningSummary from "$lib/components/planejamento/PlanningSummary.svelte";
  import PlanningFreeBalanceChart from "$lib/components/planejamento/PlanningFreeBalanceChart.svelte";
  import type { CanvasEvent, CanvasTrack } from "$lib/components/planejamento/planning-canvas-types";
  import PlanningTimeline from "$lib/components/planejamento/PlanningTimeline.svelte";
  import PlanningToolbar from "$lib/components/planejamento/PlanningToolbar.svelte";
  import PlanningTotalBalanceChart from "$lib/components/planejamento/PlanningTotalBalanceChart.svelte";
  import ChartGroup from "$lib/components/financiamento/charts/ChartGroup.svelte";
  import { LISTINGS_SECTION_CLASS } from "$lib/anuncios/listings-panel-layout";
  import { WORKSPACE_CONTENT_CLASS, WORKSPACE_STACK_CLASS } from "$lib/workspace-chrome";
  import {
    clampViewport,
    panViewport,
    zoomViewport,
    type TimeAxisViewport
  } from "$lib/components/planejamento/time-axis";
  import { createDefaultPlanningDocument } from "$lib/planejamento/defaults";
  import { createPlanningId, eventEndMonth } from "$lib/planejamento/helpers";
  import { importSimulatorParamsToPlanning } from "$lib/planejamento/import-financeiro";
  import { simulatePlanning } from "$lib/planejamento/simulation";
  import {
    loadPlanningDocument,
    savePlanningDocument
  } from "$lib/planejamento/storage";
  import type { PlanningDocument, PlanningEvent, PlanningTrack } from "$lib/planejamento/types";
  import { loadSimulatorParams } from "$lib/financiamento/simulator-params-storage";
  import { formatCurrencyCompact } from "$lib/financiamento/calculations";
  import { getWorkspaceRightSidebarContext } from "$lib/workspace-right-sidebar.svelte";

  const sidebar = getWorkspaceRightSidebarContext();

  function initialDocument(): PlanningDocument {
    return browser ? loadPlanningDocument() : createDefaultPlanningDocument();
  }

  function initialVisibleMonths(document: PlanningDocument): number {
    if (document.zoom === "year") return Math.min(document.horizonMonths, 360);
    if (document.zoom === "quarter") return Math.min(document.horizonMonths, 120);
    return Math.min(document.horizonMonths, 36);
  }

  const loadedDocument = initialDocument();
  let document = $state<PlanningDocument>(loadedDocument);
  let selectedEventId = $state<string | null>(null);
  let viewport = $state<TimeAxisViewport>({
    startMonth: 0,
    visibleMonths: initialVisibleMonths(loadedDocument),
    totalMonths: loadedDocument.horizonMonths
  });
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let chartHoverMonth = $state<number | null>(null);

  const simulation = $derived(simulatePlanning(document));
  const selectedEvent = $derived(
    document.events.find((event) => event.id === selectedEventId) ?? null
  );
  const sortedTracks = $derived(
    [...document.tracks].filter((track) => track.visible).sort((a, b) => a.order - b.order)
  );
  const issueEventIds = $derived(
    new Set(simulation.issues.filter((issue) => issue.eventId).map((issue) => issue.eventId))
  );
  const canvasTracks = $derived<CanvasTrack[]>(
    sortedTracks.map((track) => ({ id: track.id, name: track.name }))
  );
  const canvasEvents = $derived<CanvasEvent[]>(
    document.events
      .filter((event) => event.enabled)
      .map((event) => ({
        id: event.id,
        trackId: event.trackId,
        name: event.name,
        type: event.type,
        startMonth: event.startMonth,
        endMonth: Math.min(document.horizonMonths - 1, eventEndMonth(event)),
        resizable:
          event.type === "monthly-income" ||
          event.type === "monthly-expense" ||
          event.type === "custom" ||
          (event.type === "extra-amortization" && event.frequency === "monthly"),
        invalid: issueEventIds.has(event.id),
        breakdown: eventBreakdown(event)
      }))
  );
  function commit(next: PlanningDocument, immediate = false) {
    document = next;
    viewport = clampViewport({ ...viewport, totalMonths: next.horizonMonths });
    if (!browser) return;
    if (saveTimer) clearTimeout(saveTimer);
    if (immediate) {
      savePlanningDocument(next);
      saveTimer = null;
      return;
    }
    saveTimer = setTimeout(() => {
      savePlanningDocument(document);
      saveTimer = null;
    }, 250);
  }

  function eventBreakdown(event: PlanningEvent): Array<{ label: string; value: string }> {
    const period = [
      { label: "Início", value: monthLabel(event.startMonth) },
      ...(eventEndMonth(event) !== event.startMonth
        ? [{ label: "Fim", value: monthLabel(Math.min(document.horizonMonths - 1, eventEndMonth(event))) }]
        : [])
    ];
    switch (event.type) {
      case "financing":
        return [
          ...period,
          { label: "Imóvel", value: formatCurrencyCompact(event.propertyValue) },
          { label: "Entrada", value: formatCurrencyCompact(event.downPayment) },
          { label: "Financiado", value: formatCurrencyCompact(event.financedAmount) },
          { label: "Prazo", value: `${event.termMonths} meses` },
          { label: "Taxa", value: `${(event.annualInterestRate * 100).toFixed(2)}% a.a.` }
        ];
      case "custom":
        return [
          ...period,
          ...(event.initialIncome > 0
            ? [{ label: "Receita inicial", value: formatCurrencyCompact(event.initialIncome) }]
            : []),
          ...(event.initialExpense > 0
            ? [{ label: "Despesa inicial", value: formatCurrencyCompact(event.initialExpense) }]
            : []),
          ...(event.monthlyIncome > 0
            ? [{ label: "Receita mensal", value: formatCurrencyCompact(event.monthlyIncome) }]
            : []),
          ...(event.monthlyExpense > 0
            ? [{ label: "Despesa mensal", value: formatCurrencyCompact(event.monthlyExpense) }]
            : [])
        ];
      case "extra-amortization":
        return [
          ...period,
          { label: "Valor", value: formatCurrencyCompact(event.amount) },
          { label: "Frequência", value: event.frequency === "monthly" ? "Mensal" : "Única" },
          {
            label: "Estratégia",
            value: event.strategy === "reduce-term" ? "Reduzir prazo" : "Reduzir parcela"
          }
        ];
      case "one-time-income":
      case "one-time-expense":
      case "monthly-income":
      case "monthly-expense":
        return [...period, { label: "Valor", value: formatCurrencyCompact(event.amount) }];
    }
  }

  function defaultTrackId(type: PlanningEvent["type"]): string {
    void type;
    return sortedTracks[0]?.id ?? document.tracks[0]?.id ?? "";
  }

  function createEvent(
    type: PlanningEvent["type"],
    month = Math.round(viewport.startMonth + viewport.visibleMonths / 2),
    trackId = defaultTrackId(type)
  ): PlanningEvent {
    const base = {
      id: createPlanningId(type),
      trackId,
      startMonth: Math.max(0, Math.min(document.horizonMonths - 1, month)),
      enabled: true
    };
    switch (type) {
      case "financing":
        return {
          ...base,
          type,
          name: "Financiamento da casa",
          propertyValue: 500_000,
          downPayment: 100_000,
          financedAmount: 400_000,
          termMonths: 360,
          annualInterestRate: 0.115,
          monthlyTrRate: 0,
          monthlyInsurance: 175
        };
      case "extra-amortization":
        return {
          ...base,
          type,
          name: "Amortização extra",
          financingEventId:
            document.events.find((event) => event.type === "financing")?.id ?? "",
          amount: 5_000,
          frequency: "once",
          strategy: "reduce-term"
        };
      case "one-time-income":
        return { ...base, type, name: "Receita única", amount: 50_000 };
      case "one-time-expense":
        return { ...base, type, name: "Despesa única", amount: 20_000 };
      case "monthly-income":
        return {
          ...base,
          type,
          name: "Receita mensal",
          amount: 10_000,
          endMonth: Math.min(document.horizonMonths - 1, base.startMonth + 24)
        };
      case "monthly-expense":
        return {
          ...base,
          type,
          name: "Despesa mensal",
          amount: 5_000,
          endMonth: Math.min(document.horizonMonths - 1, base.startMonth + 24)
        };
      case "custom":
        return {
          ...base,
          type,
          name: "Evento customizado",
          initialIncome: 0,
          initialExpense: 30_000,
          monthlyIncome: 0,
          monthlyExpense: 5_000,
          endMonth: Math.min(document.horizonMonths - 1, base.startMonth + 6)
        };
    }
  }

  function addEvent(type: PlanningEvent["type"], month?: number, trackId?: string) {
    const event = createEvent(type, month, trackId);
    commit({ ...document, events: [...document.events, event] }, true);
    selectedEventId = event.id;
  }

  function updateEvent(next: PlanningEvent) {
    commit({
      ...document,
      events: document.events.map((event) => (event.id === next.id ? next : event))
    });
  }

  function moveEvent(
    eventId: string,
    startMonth: number,
    endMonth: number,
    trackId: string,
    options?: { persist?: boolean }
  ) {
    const event = document.events.find((item) => item.id === eventId);
    if (!event) return;
    const duration = Math.max(0, endMonth - startMonth);
    let next: PlanningEvent = { ...event, startMonth, trackId };
    if (
      next.type === "monthly-income" ||
      next.type === "monthly-expense" ||
      next.type === "custom"
    ) {
      next = { ...next, endMonth: startMonth + duration };
    } else if (next.type === "extra-amortization" && next.frequency === "monthly") {
      next = { ...next, endMonth: startMonth + duration };
    } else if (next.type === "financing" && duration !== next.termMonths - 1) {
      next = { ...next, termMonths: Math.max(1, duration + 1) };
    }
    commit(
      {
        ...document,
        events: document.events.map((item) => (item.id === eventId ? next : item))
      },
      options?.persist ?? true
    );
  }

  function duplicateEvent(eventId: string) {
    const source = document.events.find((event) => event.id === eventId);
    if (!source) return;
    const copy = {
      ...source,
      id: createPlanningId(source.type),
      name: `${source.name} (cópia)`,
      startMonth: Math.min(document.horizonMonths - 1, source.startMonth + 1)
    } as PlanningEvent;
    commit({ ...document, events: [...document.events, copy] }, true);
    selectedEventId = copy.id;
  }

  function deleteEvent(eventId: string) {
    if (browser && !window.confirm("Excluir este evento do planejamento?")) return;
    commit(
      { ...document, events: document.events.filter((event) => event.id !== eventId) },
      true
    );
    selectedEventId = null;
  }

  function addTrack() {
    const track: PlanningTrack = {
      id: createPlanningId("track"),
      name: `Linha ${document.tracks.length + 1}`,
      order: document.tracks.length,
      visible: true
    };
    commit({ ...document, tracks: [...document.tracks, track] }, true);
  }

  function renameTrack(trackId: string, name: string) {
    commit({
      ...document,
      tracks: document.tracks.map((track) => (track.id === trackId ? { ...track, name } : track))
    });
  }

  function moveTrack(trackId: string, direction: -1 | 1) {
    const ordered = [...document.tracks].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((track) => track.id === trackId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    commit(
      {
        ...document,
        tracks: ordered.map((track, order) => ({ ...track, order }))
      },
      true
    );
  }

  function deleteTrack(trackId: string) {
    if (document.tracks.length <= 1) return;
    const fallback = [...document.tracks]
      .sort((a, b) => a.order - b.order)
      .find((track) => track.id !== trackId);
    if (!fallback) return;
    const occupied = document.events.some((event) => event.trackId === trackId);
    if (
      occupied &&
      browser &&
      !window.confirm(`Mover os eventos desta linha para "${fallback.name}" e excluir?`)
    ) {
      return;
    }
    const tracks = document.tracks
      .filter((track) => track.id !== trackId)
      .sort((a, b) => a.order - b.order)
      .map((track, order) => ({ ...track, order }));
    const events = document.events.map((event) =>
      event.trackId === trackId ? { ...event, trackId: fallback.id } : event
    );
    commit({ ...document, tracks, events }, true);
  }

  function importFinanceiro() {
    const params = loadSimulatorParams();
    if (!params) {
      window.alert("Nenhum dado salvo foi encontrado no simulador financeiro.");
      return;
    }
    if (!window.confirm("Substituir o planejamento atual pelos dados do simulador?")) return;
    const propertyStrategy =
      params.temImovelParaNegociar &&
      window.confirm("Usar o imóvel atual como permuta? Clique em Cancelar para considerar venda posterior.")
        ? "permuta"
        : "venda_posterior";
    const next = importSimulatorParamsToPlanning(params, { propertyStrategy });
    commit(next, true);
    viewport = {
      startMonth: 0,
      visibleMonths: initialVisibleMonths(next),
      totalMonths: next.horizonMonths
    };
    selectedEventId = null;
  }

  function currentMonthIndex(): number {
    const [year, month] = document.startMonth.split("-").map(Number);
    const now = new Date();
    return Math.max(0, (now.getFullYear() - year) * 12 + now.getMonth() - (month - 1));
  }

  function monthLabel(index: number): string {
    const [year, month] = document.startMonth.split("-").map(Number);
    const date = new Date(year, month - 1 + index, 1);
    return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(date);
  }

  function applyViewport(next: TimeAxisViewport) {
    viewport = clampViewport(next);
    const zoom =
      viewport.visibleMonths <= 48
        ? "month"
        : viewport.visibleMonths <= 180
          ? "quarter"
          : "year";
    if (zoom !== document.zoom) commit({ ...document, zoom });
  }

  onMount(() => {
    return () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
        savePlanningDocument(document);
      }
    };
  });
</script>

<div
  class="flex h-[calc(100svh-var(--nav-height,2.75rem))] min-h-0 flex-col overflow-hidden bg-app-bg text-app-fg"
>
  <WorkspaceRightSidebarContent title={selectedEvent ? "Editar evento" : "Adicionar eventos"}>
    <PlanningSidebar
      {document}
      {selectedEvent}
      issues={simulation.issues}
      onCreate={addEvent}
      onUpdateDocument={(next) => commit(next)}
      onUpdateEvent={updateEvent}
      onDuplicateEvent={duplicateEvent}
      onDeleteEvent={deleteEvent}
      onCloseInspector={() => (selectedEventId = null)}
      onRenameTrack={renameTrack}
      onMoveTrack={moveTrack}
      onDeleteTrack={deleteTrack}
    />
  </WorkspaceRightSidebarContent>

  <PlanningToolbar
    name={document.name}
    onNameChange={(name) => commit({ ...document, name })}
    onZoomIn={() => applyViewport(zoomViewport(viewport, 0.75))}
    onZoomOut={() => applyViewport(zoomViewport(viewport, 1.35))}
    onToday={() =>
      applyViewport(
        panViewport(
          viewport,
          currentMonthIndex() - Math.round(viewport.visibleMonths / 2) - viewport.startMonth
        )
      )}
    onFit={() =>
      applyViewport({
          startMonth: 0,
          visibleMonths: document.horizonMonths,
          totalMonths: document.horizonMonths
        })}
    onImport={importFinanceiro}
    onOpenSidebar={sidebar.toggle}
  />

  <main
    class="{WORKSPACE_CONTENT_CLASS} {WORKSPACE_STACK_CLASS} min-h-0 flex-1 overflow-y-auto overscroll-contain"
  >
    <div class="flex flex-col gap-4">
      <ChartGroup title="Saldos">
        <div class="grid gap-4 lg:grid-cols-2">
          <section class="{LISTINGS_SECTION_CLASS} overflow-visible">
            <PlanningFreeBalanceChart
              months={simulation.months}
              {viewport}
              startDate={`${document.startMonth}-01`}
              breakdownAnchorSide="left"
              onHoverMonth={(monthIndex) => (chartHoverMonth = monthIndex)}
            />
          </section>
          <section class="{LISTINGS_SECTION_CLASS} overflow-visible">
            <PlanningTotalBalanceChart
              months={simulation.months}
              {viewport}
              startDate={`${document.startMonth}-01`}
              breakdownAnchorSide="right"
              onHoverMonth={(monthIndex) => (chartHoverMonth = monthIndex)}
            />
          </section>
        </div>
      </ChartGroup>

      <section class="{LISTINGS_SECTION_CLASS} overflow-hidden">
        <PlanningTimeline
          startDate={`${document.startMonth}-01`}
          {viewport}
          tracks={canvasTracks}
          events={canvasEvents}
          {selectedEventId}
          highlightMonth={chartHoverMonth}
          onViewportChange={applyViewport}
          onSelectEvent={(eventId) => (selectedEventId = eventId)}
          onMoveEvent={moveEvent}
          onCreateEvent={(type, month, trackId) =>
            addEvent(type as PlanningEvent["type"], month, trackId)}
          onAddTrack={addTrack}
        />
        <PlanningSummary
          finalBalance={simulation.summary.finalBalance}
          minimumBalance={simulation.summary.minimumBalance}
          criticalMonthLabel={monthLabel(simulation.summary.minimumBalanceMonth)}
        />
      </section>
    </div>
  </main>
</div>
