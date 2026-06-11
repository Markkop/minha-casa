<script lang="ts">
  import { AlertTriangle, GripVertical } from "@lucide/svelte";
  import type { CanvasEvent, CanvasTrack } from "$lib/components/planejamento/planning-canvas-types";
  import {
    buildAxisTicks,
    monthToX,
    panViewport,
    PLANNING_TIMELINE_AXIS_HEIGHT,
    PLANNING_TIMELINE_BOTTOM_PADDING,
    PLANNING_TIMELINE_GUTTER,
    PLANNING_TIMELINE_RIGHT_PADDING,
    PLANNING_TIMELINE_TRACK_GAP,
    PLANNING_TIMELINE_TRACK_HEIGHT,
    xToMonth,
    zoomViewport,
    type TimeAxisViewport
  } from "$lib/components/planejamento/time-axis";

  type DragMode = "move" | "start" | "end";

  type DragState = {
    pointerId: number;
    eventId: string;
    mode: DragMode;
    originX: number;
    originY: number;
    startMonth: number;
    endMonth: number;
    trackId: string;
    previewStart: number;
    previewEnd: number;
    previewTrackId: string;
  };

  let {
    startDate,
    viewport,
    tracks,
    events,
    selectedEventId,
    highlightMonth = null,
    onViewportChange,
    onSelectEvent,
    onMoveEvent,
    onCreateEvent,
    onAddTrack
  }: {
    startDate: string;
    viewport: TimeAxisViewport;
    tracks: CanvasTrack[];
    events: CanvasEvent[];
    selectedEventId: string | null;
    highlightMonth?: number | null;
    onViewportChange: (viewport: TimeAxisViewport) => void;
    onSelectEvent: (eventId: string | null) => void;
    onMoveEvent: (
      eventId: string,
      startMonth: number,
      endMonth: number,
      trackId: string,
      options?: { persist?: boolean }
    ) => void;
    onCreateEvent: (type: string, month: number, trackId: string) => void;
    onAddTrack: () => void;
  } = $props();

  let container = $state<HTMLDivElement | null>(null);
  let containerWidth = $state(900);
  let hoverMonth = $state<number | null>(null);
  let hoverX = $state(0);
  let hoverY = $state(0);
  let hoveredEventId = $state<string | null>(null);
  let drag = $state<DragState | null>(null);

  const plotWidth = $derived(
    Math.max(240, containerWidth - PLANNING_TIMELINE_GUTTER - PLANNING_TIMELINE_RIGHT_PADDING)
  );
  const tracksY = PLANNING_TIMELINE_AXIS_HEIGHT;
  const totalHeight = $derived(
    PLANNING_TIMELINE_AXIS_HEIGHT +
      tracks.length * (PLANNING_TIMELINE_TRACK_HEIGHT + PLANNING_TIMELINE_TRACK_GAP) +
      PLANNING_TIMELINE_BOTTOM_PADDING
  );
  const playheadMonth = $derived(highlightMonth ?? hoverMonth);
  const calendarStartSerialMonth = $derived.by(() => {
    const date = new Date(`${startDate}T12:00:00`);
    return date.getFullYear() * 12 + date.getMonth();
  });
  const axisTicks = $derived(
    buildAxisTicks(viewport, plotWidth, calendarStartSerialMonth)
  );
  const hoveredEvent = $derived(
    hoveredEventId === null
      ? null
      : events.find((event) => event.id === hoveredEventId) ?? null
  );

  function formatAxisMonth(month: number, labelStep: number): string {
    const date = new Date(`${startDate}T12:00:00`);
    date.setMonth(date.getMonth() + month);
    const numericMonth = String(date.getMonth() + 1).padStart(2, "0");
    if (labelStep >= 12) return String(date.getFullYear());
    return date.getMonth() === 0
      ? `${numericMonth}/${String(date.getFullYear()).slice(-2)}`
      : numericMonth;
  }

  function trackLabel(name: string): string {
    return name.length > 16 ? `${name.slice(0, 15)}…` : name;
  }

  function eventTypeLabel(type: string): string {
    return {
      financing: "Financiamento",
      "extra-amortization": "Amortização extra",
      "one-time-income": "Receita única",
      "one-time-expense": "Despesa única",
      "monthly-income": "Receita mensal",
      "monthly-expense": "Despesa mensal",
      custom: "Evento customizado"
    }[type] ?? type;
  }

  function eventPopoverPosition(item: CanvasEvent): { left: number; top: number } {
    const gap = 16;
    const padding = 8;
    const width = 256;
    const height = Math.max(88, 62 + item.breakdown.length * 22);
    const right = containerWidth - hoverX - gap - padding;
    const left = hoverX - gap - padding;
    const bottom = totalHeight - hoverY - gap - padding;
    const top = hoverY - gap - padding;
    const side =
      right >= width ? "right"
      : left >= width ? "left"
      : bottom >= height ? "bottom"
      : top >= height ? "top"
      : right >= left ? "right"
      : "left";

    if (side === "right" || side === "left") {
      return {
        left: side === "right" ? hoverX + gap : hoverX - width - gap,
        top: Math.max(padding, Math.min(totalHeight - height - padding, hoverY - height / 2))
      };
    }
    return {
      left: Math.max(padding, Math.min(containerWidth - width - padding, hoverX - width / 2)),
      top: side === "bottom" ? hoverY + gap : hoverY - height - gap
    };
  }

  function visibleEventRect(item: CanvasEvent): {
    left: number;
    width: number;
    startEdgeVisible: boolean;
    endEdgeVisible: boolean;
  } | null {
    const viewportStart = viewport.startMonth;
    const viewportEnd = viewport.startMonth + viewport.visibleMonths;
    const eventEndExclusive = item.endMonth + 1;
    if (eventEndExclusive <= viewportStart || item.startMonth >= viewportEnd) return null;

    const visibleStart = Math.max(item.startMonth, viewportStart);
    const visibleEnd = Math.min(eventEndExclusive, viewportEnd);
    const localLeft = Math.max(0, monthToX(visibleStart, viewport, plotWidth));
    const availableWidth = Math.max(0, plotWidth - localLeft);
    const rawWidth =
      monthToX(visibleEnd, viewport, plotWidth) -
      monthToX(visibleStart, viewport, plotWidth);

    return {
      left: PLANNING_TIMELINE_GUTTER + localLeft,
      width: Math.min(availableWidth, Math.max(Math.min(26, availableWidth), rawWidth)),
      startEdgeVisible: item.startMonth >= viewportStart,
      endEdgeVisible: eventEndExclusive <= viewportEnd
    };
  }

  function trackIndexAtClientY(clientY: number): number {
    if (!container) return 0;
    const localY = clientY - container.getBoundingClientRect().top - tracksY;
    return Math.max(
      0,
      Math.min(
        tracks.length - 1,
        Math.floor(localY / (PLANNING_TIMELINE_TRACK_HEIGHT + PLANNING_TIMELINE_TRACK_GAP))
      )
    );
  }

  function monthAtClientX(clientX: number): number {
    if (!container) return 0;
    const localX =
      clientX - container.getBoundingClientRect().left - PLANNING_TIMELINE_GUTTER;
    return Math.max(0, Math.min(viewport.totalMonths, xToMonth(localX, viewport, plotWidth)));
  }

  function isInsidePlot(localX: number, localY: number): boolean {
    return (
      localX >= PLANNING_TIMELINE_GUTTER &&
      localX <= containerWidth - PLANNING_TIMELINE_RIGHT_PADDING &&
      localY >= 0 &&
      localY < totalHeight - PLANNING_TIMELINE_BOTTOM_PADDING + 8
    );
  }

  function handlePointerMove(event: PointerEvent) {
    if (container) {
      const bounds = container.getBoundingClientRect();
      const localX = event.clientX - bounds.left;
      const localY = event.clientY - bounds.top;
      hoverX = localX;
      hoverY = localY;
      hoverMonth =
        isInsidePlot(localX, localY) && hoveredEventId === null && highlightMonth === null
          ? monthAtClientX(event.clientX)
          : null;
    }
    if (!drag) return;
    if ((event.buttons & 1) === 0) {
      finishDragFromLostRelease();
      return;
    }

    const deltaMonth =
      monthAtClientX(event.clientX) - monthAtClientX(drag.originX);
    let previewStart = drag.startMonth;
    let previewEnd = drag.endMonth;
    if (drag.mode === "move") {
      const duration = drag.endMonth - drag.startMonth;
      previewStart = Math.max(0, Math.min(viewport.totalMonths - duration, drag.startMonth + deltaMonth));
      previewEnd = previewStart + duration;
    } else if (drag.mode === "start") {
      previewStart = Math.max(0, Math.min(drag.endMonth, drag.startMonth + deltaMonth));
    } else {
      previewEnd = Math.max(drag.startMonth, Math.min(viewport.totalMonths, drag.endMonth + deltaMonth));
    }
    const trackIndex = trackIndexAtClientY(event.clientY);
    const previewTrackId =
      drag.mode === "move" && Math.abs(event.clientY - drag.originY) > 12
        ? tracks[trackIndex]?.id ?? drag.trackId
        : drag.trackId;
    if (
      previewStart === drag.previewStart &&
      previewEnd === drag.previewEnd &&
      previewTrackId === drag.previewTrackId
    ) {
      return;
    }
    drag = { ...drag, previewStart, previewEnd, previewTrackId };
    onMoveEvent(drag.eventId, previewStart, previewEnd, previewTrackId, { persist: false });
  }

  function beginDrag(event: PointerEvent, item: CanvasEvent, mode: DragMode) {
    event.preventDefault();
    event.stopPropagation();
    hoveredEventId = null;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag = {
      pointerId: event.pointerId,
      eventId: item.id,
      mode,
      originX: event.clientX,
      originY: event.clientY,
      startMonth: item.startMonth,
      endMonth: item.endMonth,
      trackId: item.trackId,
      previewStart: item.startMonth,
      previewEnd: item.endMonth,
      previewTrackId: item.trackId
    };
    onSelectEvent(item.id);
  }

  function finishDrag(event: PointerEvent) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    onMoveEvent(drag.eventId, drag.previewStart, drag.previewEnd, drag.previewTrackId, {
      persist: true
    });
    drag = null;
  }

  function finishDragFromLostRelease() {
    if (!drag) return;
    onMoveEvent(drag.eventId, drag.previewStart, drag.previewEnd, drag.previewTrackId, {
      persist: true
    });
    drag = null;
  }

  function cancelDrag() {
    if (!drag) return;
    onMoveEvent(drag.eventId, drag.startMonth, drag.endMonth, drag.trackId, { persist: false });
    drag = null;
  }

  function shownEvent(item: CanvasEvent): CanvasEvent {
    if (!drag || drag.eventId !== item.id) return item;
    return {
      ...item,
      startMonth: drag.previewStart,
      endMonth: drag.previewEnd,
      trackId: drag.previewTrackId
    };
  }

  function handleWheel(event: WheelEvent) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const anchor = monthAtClientX(event.clientX);
      onViewportChange(zoomViewport(viewport, event.deltaY > 0 ? 1.2 : 0.8, anchor));
      return;
    }
    const horizontalDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.shiftKey
          ? event.deltaY
          : 0;
    if (horizontalDelta === 0) return;
    event.preventDefault();
    const monthsPerPixel = viewport.visibleMonths / Math.max(1, plotWidth);
    onViewportChange(panViewport(viewport, Math.round(horizontalDelta * monthsPerPixel)));
  }

  function handleNativeDrop(event: DragEvent) {
    event.preventDefault();
    const type = event.dataTransfer?.getData("application/x-planning-event");
    if (!type || tracks.length === 0) return;
    const track = tracks[trackIndexAtClientY(event.clientY)];
    if (!track) return;
    onCreateEvent(type, monthAtClientX(event.clientX), track.id);
  }

  $effect(() => {
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry?.contentRect.width) containerWidth = entry.contentRect.width;
    });
    observer.observe(container);
    containerWidth = container.clientWidth || containerWidth;
    return () => observer.disconnect();
  });
</script>

<svelte:window
  onpointermove={handlePointerMove}
  onpointerup={finishDrag}
  onmouseup={finishDragFromLostRelease}
  onpointercancel={cancelDrag}
  onblur={cancelDrag}
/>

<div
  bind:this={container}
  class="relative shrink-0 select-none overflow-hidden bg-app-surface"
  style={`height:${totalHeight}px;min-height:${totalHeight}px`}
  role="application"
  aria-label="Linha do tempo do planejamento financeiro"
  onpointermove={handlePointerMove}
  onpointerleave={() => {
    if (!drag) hoverMonth = null;
  }}
  onpointerup={finishDrag}
  onwheel={handleWheel}
  ondragover={(event) => event.preventDefault()}
  ondrop={handleNativeDrop}
>
  <svg
    class="pointer-events-none absolute inset-0 h-full w-full"
    viewBox={`0 0 ${containerWidth} ${totalHeight}`}
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    {#each axisTicks.ticks as tick (tick.month)}
      {@const x = PLANNING_TIMELINE_GUTTER + monthToX(tick.month, viewport, plotWidth)}
      <line
        {x}
        x1={x}
        x2={x}
        y1="0"
        y2={totalHeight - PLANNING_TIMELINE_BOTTOM_PADDING}
        class="stroke-app-border/70"
      />
      {#if tick.showLabel}
        <text
          {x}
          y={PLANNING_TIMELINE_AXIS_HEIGHT - 12}
          text-anchor="middle"
          class="fill-app-muted text-[10px]"
        >
          {formatAxisMonth(tick.month, axisTicks.labelStep)}
        </text>
      {/if}
    {/each}

    <line
      x1={PLANNING_TIMELINE_GUTTER}
      x2={containerWidth - PLANNING_TIMELINE_RIGHT_PADDING}
      y1={PLANNING_TIMELINE_AXIS_HEIGHT}
      y2={PLANNING_TIMELINE_AXIS_HEIGHT}
      class="stroke-app-border-strong"
    />

    {#each tracks as track, index (track.id)}
      {@const y = tracksY + index * (PLANNING_TIMELINE_TRACK_HEIGHT + PLANNING_TIMELINE_TRACK_GAP)}
      <rect
        x="0"
        {y}
        width={containerWidth}
        height={PLANNING_TIMELINE_TRACK_HEIGHT}
        class={index % 2 === 0 ? "fill-app-bg/55" : "fill-app-surface"}
      />
      <line
        x1="0"
        x2={containerWidth}
        y1={y + PLANNING_TIMELINE_TRACK_HEIGHT}
        y2={y + PLANNING_TIMELINE_TRACK_HEIGHT}
        class="stroke-app-border/60"
      />
      <text
        x={PLANNING_TIMELINE_GUTTER - 8}
        y={y + PLANNING_TIMELINE_TRACK_HEIGHT / 2 + 4}
        text-anchor="end"
        class="fill-app-muted text-[10px] font-medium"
      >
        {trackLabel(track.name)}
        <title>{track.name}</title>
      </text>
    {/each}

    {#if playheadMonth !== null}
      {@const x = PLANNING_TIMELINE_GUTTER + monthToX(playheadMonth, viewport, plotWidth)}
      <line
        x1={x}
        x2={x}
        y1="0"
        y2={totalHeight - PLANNING_TIMELINE_BOTTOM_PADDING}
        class="stroke-app-accent"
        stroke-width="1"
      />
    {/if}
  </svg>

  <button
    type="button"
    class="absolute inset-0 z-0 cursor-default bg-transparent"
    aria-label="Desselecionar evento"
    onclick={() => onSelectEvent(null)}
  ></button>

  {#each events as original (original.id)}
    {@const item = shownEvent(original)}
    {@const trackIndex = tracks.findIndex((track) => track.id === item.trackId)}
    {@const rect = visibleEventRect(item)}
    {#if trackIndex >= 0 && rect}
      <button
        type="button"
        class={[
          "group absolute flex h-8 items-center overflow-hidden rounded-md border px-2 text-left text-xs shadow-sm transition",
          selectedEventId === item.id
            ? "z-20 border-app-accent bg-app-action text-app-action-foreground ring-2 ring-app-accent/20"
            : item.invalid
              ? "z-10 border-app-danger bg-app-surface text-app-danger"
              : "z-10 border-app-border-strong bg-app-surface text-app-fg hover:border-app-accent",
          drag?.eventId === item.id ? "cursor-grabbing opacity-90" : "cursor-grab"
        ]}
        style={`left:${rect.left}px;top:${tracksY + trackIndex * (PLANNING_TIMELINE_TRACK_HEIGHT + PLANNING_TIMELINE_TRACK_GAP) + 7}px;width:${rect.width}px`}
        aria-label={item.name}
        onpointerenter={(event) => {
          if (!drag) {
            if (container) {
              const bounds = container.getBoundingClientRect();
              hoverX = event.clientX - bounds.left;
              hoverY = event.clientY - bounds.top;
            }
            hoveredEventId = item.id;
            hoverMonth = null;
          }
        }}
        onpointerleave={() => {
          if (!drag && hoveredEventId === item.id) hoveredEventId = null;
        }}
        onpointerdown={(event) => beginDrag(event, item, "move")}
        onpointerup={finishDrag}
        onclick={(event) => {
          event.stopPropagation();
          onSelectEvent(item.id);
        }}
      >
        <GripVertical class="mr-1 size-3 shrink-0 opacity-50" />
        <span class="min-w-0 flex-1 truncate font-medium">{item.name}</span>
        {#if item.invalid}
          <AlertTriangle class="ml-1 size-3 shrink-0" />
        {/if}
        {#if item.resizable && rect.startEdgeVisible}
          <span
            role="slider"
            aria-label={`Alterar início de ${item.name}`}
            aria-valuemin="0"
            aria-valuemax={viewport.totalMonths}
            aria-valuenow={item.startMonth}
            tabindex="0"
            class="absolute inset-y-0 left-0 w-2 cursor-ew-resize"
            onpointerdown={(event) => beginDrag(event, item, "start")}
          ></span>
        {/if}
        {#if item.resizable && rect.endEdgeVisible}
          <span
            role="slider"
            aria-label={`Alterar fim de ${item.name}`}
            aria-valuemin="0"
            aria-valuemax={viewport.totalMonths}
            aria-valuenow={item.endMonth}
            tabindex="0"
            class="absolute inset-y-0 right-0 w-2 cursor-ew-resize"
            onpointerdown={(event) => beginDrag(event, item, "end")}
          ></span>
        {/if}
      </button>
    {/if}
  {/each}

  {#if hoveredEvent && !drag}
    {@const popoverPosition = eventPopoverPosition(hoveredEvent)}
    <div
      class="pointer-events-none absolute z-40 w-64 rounded-md border border-app-border bg-app-surface p-3 text-xs shadow-xl"
      style={`left:${popoverPosition.left}px;top:${popoverPosition.top}px`}
      role="tooltip"
    >
      <strong class="block truncate text-sm text-app-fg">{hoveredEvent.name}</strong>
      <span class="mt-0.5 block text-[10px] uppercase tracking-wide text-app-muted">
        {eventTypeLabel(hoveredEvent.type)}
      </span>
      <dl class="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5">
        {#each hoveredEvent.breakdown as row (row.label)}
          <dt class="truncate text-app-muted">{row.label}</dt>
          <dd class="max-w-36 truncate text-right font-medium text-app-fg">{row.value}</dd>
        {/each}
      </dl>
    </div>
  {/if}

  <button
    type="button"
    class="absolute bottom-2 left-2 z-10 rounded-md border border-dashed border-app-border-strong bg-app-surface/90 px-2 py-1 text-[10px] font-medium text-app-muted hover:border-app-accent hover:text-app-fg"
    onclick={onAddTrack}
  >
    + Adicionar linha
  </button>
</div>
