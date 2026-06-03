<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    Image as KonvaImage,
    Layer,
    Line,
    Rect,
    Stage,
    Text,
    Transformer,
    type KonvaDragTransformEvent,
    type KonvaPointerEvent,
    type KonvaWheelEvent
  } from "svelte-konva";
  import type Konva from "konva";
  import { cn } from "$lib/utils";
  import {
    createShapeId,
    getSelectableShapeIdsInBounds,
    getShapeBounds,
    normalizeBounds,
    zoomAtPoint,
    type Bounds
  } from "$lib/components/planta/state";
  import { buildGridLines } from "$lib/components/planta/grid-lines";
  import { buildAllMeasurementOverlays } from "$lib/components/planta/measurements";
  import { snapPointer, snapRectShape, snapShape, snapSquareRect } from "$lib/components/planta/snap";
  import type {
    PlantaDocument,
    PlantaShape,
    PlantaTool
  } from "$lib/components/planta/types";

  const SCALE_BY = 1.05;
  const MARQUEE_MIN_SIZE = 4;
  const MEASUREMENT_FONT_SIZE = 12;
  const MEASUREMENT_LINE_STROKE = "#64748b";
  const MEASUREMENT_FADED_OPACITY = 0.28;
  const MEASUREMENT_LINE_DASH = [6, 4];
  const SHAPE_STROKE = "#1d5f9e";
  const SHAPE_FILL = "rgba(157, 212, 255, 0.16)";

  let {
    planner = $bindable<PlantaDocument>(),
    tool,
    spacePressed = false,
    blueprintHandActive = false,
    selectedShapeIds = $bindable<string[]>([]),
    canvasWidth = $bindable(0),
    canvasHeight = $bindable(0),
    recordUndo = () => {}
  }: {
    planner: PlantaDocument;
    tool: PlantaTool;
    spacePressed?: boolean;
    blueprintHandActive?: boolean;
    selectedShapeIds?: string[];
    canvasWidth?: number;
    canvasHeight?: number;
    recordUndo?: () => void;
  } = $props();

  let host: HTMLDivElement | null = $state(null);
  let stageRef: ReturnType<typeof Stage> | undefined = $state();
  let transformerRef: ReturnType<typeof Transformer> | undefined = $state();
  let blueprintImage: HTMLImageElement | null = $state(null);
  let draftShape: PlantaShape | null = $state(null);
  let isDrawing = $state(false);
  let isPanning = $state(false);
  let isDraggingBlueprint = $state(false);
  let isMarqueeSelecting = $state(false);
  let drawStart = $state({ x: 0, y: 0 });
  let marqueeStart = $state({ x: 0, y: 0 });
  let marqueeRect: Bounds | null = $state(null);
  let marqueeShiftKey = $state(false);
  let marqueeBaseSelection = $state<string[]>([]);
  let panPointerId = $state<number | null>(null);
  let panOrigin = $state({ x: 0, y: 0 });
  let panViewportStart = $state({ x: 0, y: 0 });
  let blueprintDragStart = $state({ x: 0, y: 0 });
  let liveShapeGeometry = $state<Record<string, PlantaShape>>({});

  const gridLines = $derived.by(() => {
    if (canvasWidth <= 0 || canvasHeight <= 0) return [];

    const size = planner.grid.size;
    const left = (-planner.viewport.x / planner.viewport.scale) - size;
    const top = (-planner.viewport.y / planner.viewport.scale) - size;
    const right = (canvasWidth - planner.viewport.x) / planner.viewport.scale + size;
    const bottom = (canvasHeight - planner.viewport.y) / planner.viewport.scale + size;

    return buildGridLines({
      visible: planner.grid.visible,
      size,
      left,
      top,
      right,
      bottom
    });
  });

  const allShapes = $derived(draftShape ? [...planner.shapes, draftShape] : planner.shapes);
  const shapesForMeasurements = $derived(
    allShapes.map((shape) => liveShapeGeometry[shape.id] ?? shape)
  );
  const measurementFontSize = $derived(MEASUREMENT_FONT_SIZE / planner.viewport.scale);
  const measurementStrokeWidth = $derived(1 / planner.viewport.scale);
  const measurementOverlays = $derived(
    buildAllMeasurementOverlays(shapesForMeasurements, planner.grid)
  );

  function estimateTextOffset(text: string, fontSize: number) {
    return {
      x: text.length * fontSize * 0.29,
      y: fontSize / 2
    };
  }

  function measurementOverlayOpacity(shapeId: string) {
    if (selectedShapeIds.length === 0) return 1;
    return selectedShapeIds.includes(shapeId) ? 1 : MEASUREMENT_FADED_OPACITY;
  }

  function rectDragBound(pos: { x: number; y: number }) {
    return snapPointer(pos, planner.grid);
  }
  const isDrawTool = $derived(tool === "line" || tool === "rect" || tool === "square");
  const isSingleSelection = $derived(selectedShapeIds.length === 1);
  const shapeDraggable = $derived(
    (tool === "select" || isDrawTool) &&
      isSingleSelection &&
      !spacePressed &&
      !blueprintHandActive &&
      !isPanning &&
      !isDrawing &&
      !isMarqueeSelecting
  );
  const panCursorActive = $derived(tool === "pan" || spacePressed || isPanning);
  const blueprintHandCursorActive = $derived(
    blueprintHandActive && planner.blueprint !== null && !spacePressed && tool !== "pan"
  );

  export function cancelDraft() {
    draftShape = null;
    isDrawing = false;
    finishMarquee();
    endPointerSession();
  }

  onMount(() => {
    updateCanvasSize();
    const observer = new ResizeObserver(updateCanvasSize);
    if (host) observer.observe(host);
    return () => {
      observer.disconnect();
      endPointerSession();
    };
  });

  $effect(() => {
    const source = planner.blueprint?.dataUrl;
    if (!source) {
      blueprintImage = null;
      return;
    }

    let cancelled = false;
    const image = document.createElement("img");
    image.onload = () => {
      if (!cancelled) blueprintImage = image;
    };
    image.src = source;

    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    void attachTransformer(
      selectedShapeIds,
      tool,
      spacePressed,
      blueprintHandActive,
      isPanning,
      isDrawing,
      isMarqueeSelecting
    );
  });

  function updateCanvasSize() {
    if (!host) return;
    canvasWidth = Math.max(320, Math.round(host.clientWidth));
    canvasHeight = Math.max(320, Math.round(host.clientHeight));
  }

  async function attachTransformer(
    shapeIds: string[],
    currentTool: PlantaTool,
    spaceHeld: boolean,
    blueprintHand: boolean,
    panning: boolean,
    drawing: boolean,
    marqueeSelecting: boolean
  ) {
    await tick();
    const canTransform =
      currentTool !== "pan" &&
      !blueprintHand &&
      !spaceHeld &&
      !panning &&
      !drawing &&
      !marqueeSelecting;
    if (!canTransform || !transformerRef || !stageRef || shapeIds.length === 0) {
      transformerRef?.node.nodes([]);
      return;
    }

    const nodes = shapeIds
      .map((shapeId) => {
        const shape = planner.shapes.find((current) => current.id === shapeId);
        if (!shape || shape.locked || shape.visible === false) return null;
        return stageRef?.node.findOne(`#${konvaShapeId(shapeId)}`) ?? null;
      })
      .filter((node): node is Konva.Node => node !== null);

    transformerRef.node.nodes(nodes);
  }

  function konvaShapeId(shapeId: string) {
    return `planta-shape-${shapeId}`;
  }

  function setViewport(viewport: PlantaDocument["viewport"]) {
    planner = { ...planner, viewport };
  }

  function setBlueprintPosition(x: number, y: number, options?: { recordUndo?: boolean }) {
    if (!planner.blueprint) return;
    if (options?.recordUndo) recordUndo();
    planner = {
      ...planner,
      blueprint: {
        ...planner.blueprint,
        x,
        y
      }
    };
  }

  function setShapes(shapes: PlantaShape[], options?: { recordUndo?: boolean }) {
    if (options?.recordUndo !== false) recordUndo();
    planner = { ...planner, shapes };
  }

  function updateShape(shape: PlantaShape, options?: { recordUndo?: boolean }) {
    if (options?.recordUndo !== false) recordUndo();
    planner = {
      ...planner,
      shapes: planner.shapes.map((current) => (current.id === shape.id ? shape : current))
    };
  }

  function setSelection(ids: string[]) {
    selectedShapeIds = ids;
  }

  function toggleSelection(shapeId: string) {
    setSelection(
      selectedShapeIds.includes(shapeId)
        ? selectedShapeIds.filter((id) => id !== shapeId)
        : [...selectedShapeIds, shapeId]
    );
  }

  function getWorldPointerFromClient(clientX: number, clientY: number) {
    if (!host) return null;
    const rect = host.getBoundingClientRect();
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;

    return {
      x: (pointerX - planner.viewport.x) / planner.viewport.scale,
      y: (pointerY - planner.viewport.y) / planner.viewport.scale
    };
  }

  function getWorldPointer() {
    if (!stageRef) return null;
    const pointer = stageRef.node.getPointerPosition();
    if (!pointer) return null;

    return {
      x: (pointer.x - planner.viewport.x) / planner.viewport.scale,
      y: (pointer.y - planner.viewport.y) / planner.viewport.scale
    };
  }

  function shouldStartPan(event: PointerEvent) {
    if (isDrawing || isMarqueeSelecting || isDraggingBlueprint) return false;
    return spacePressed || tool === "pan" || event.button === 1;
  }

  function shouldStartBlueprintDrag(event: PointerEvent) {
    if (!blueprintHandActive || !planner.blueprint) return false;
    if (isDrawing || isMarqueeSelecting || isPanning || isDraggingBlueprint) return false;
    if (spacePressed || tool === "pan" || event.button !== 0) return false;
    return true;
  }

  function beginPointerSession() {
    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);
  }

  function endPointerSession() {
    window.removeEventListener("pointermove", handleWindowPointerMove);
    window.removeEventListener("pointerup", handleWindowPointerUp);
    window.removeEventListener("pointercancel", handleWindowPointerUp);

    if (panPointerId !== null && host) {
      try {
        host.releasePointerCapture(panPointerId);
      } catch {
        // Pointer may already be released.
      }
    }

    panPointerId = null;
    isPanning = false;
    isDraggingBlueprint = false;
  }

  function finishMarquee() {
    isMarqueeSelecting = false;
    marqueeRect = null;
    marqueeShiftKey = false;
    marqueeBaseSelection = [];
  }

  function applyMarqueeSelection(rect: Bounds) {
    const ids = getSelectableShapeIdsInBounds(planner.shapes, rect);
    setSelection(marqueeShiftKey ? [...new Set([...marqueeBaseSelection, ...ids])] : ids);
  }

  function startBlueprintDrag(event: PointerEvent) {
    if (!planner.blueprint) return;

    recordUndo();
    isDraggingBlueprint = true;
    panPointerId = event.pointerId;
    panOrigin = { x: event.clientX, y: event.clientY };
    blueprintDragStart = { x: planner.blueprint.x, y: planner.blueprint.y };

    host?.setPointerCapture(event.pointerId);
    beginPointerSession();
  }

  function startPan(event: PointerEvent) {
    if (event.button === 1) event.preventDefault();

    isPanning = true;
    panPointerId = event.pointerId;
    panOrigin = { x: event.clientX, y: event.clientY };
    panViewportStart = { x: planner.viewport.x, y: planner.viewport.y };

    if (tool === "pan" || spacePressed) {
      setSelection([]);
    }

    host?.setPointerCapture(event.pointerId);
    beginPointerSession();
  }

  function handleHostPointerDown(event: PointerEvent) {
    if (shouldStartBlueprintDrag(event)) {
      startBlueprintDrag(event);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (!shouldStartPan(event)) return;

    startPan(event);
    event.preventDefault();
    event.stopPropagation();
  }

  function handleWheel(event: KonvaWheelEvent) {
    event.evt.preventDefault();
    if (!stageRef) return;

    const pointer = stageRef.node.getPointerPosition();
    if (!pointer) return;

    const oldScale = planner.viewport.scale;
    let direction = event.evt.deltaY > 0 ? -1 : 1;
    if (event.evt.ctrlKey) direction = -direction;

    const nextScale = direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY;
    setViewport(zoomAtPoint(planner.viewport, pointer.x, pointer.y, nextScale));
  }

  function startMarquee(event: KonvaPointerEvent, pointer: { x: number; y: number }) {
    marqueeShiftKey = event.evt.shiftKey;
    marqueeBaseSelection = marqueeShiftKey ? [...selectedShapeIds] : [];
    if (!marqueeShiftKey) setSelection([]);

    marqueeStart = pointer;
    marqueeRect = normalizeBounds(pointer, pointer);
    isMarqueeSelecting = true;
    panPointerId = event.evt.pointerId;
    host?.setPointerCapture(event.evt.pointerId);
    beginPointerSession();
  }

  function handleStagePointerDown(event: KonvaPointerEvent) {
    if (shouldStartPan(event.evt) || shouldStartBlueprintDrag(event.evt)) return;

    const isStageClick = event.target === stageRef?.node;

    if (tool === "select") {
      if (!isStageClick) return;

      const pointer = getWorldPointer();
      if (!pointer) return;

      startMarquee(event, pointer);
      return;
    }

    if (tool === "pan") return;

    if (!isStageClick) return;

    const pointer = getWorldPointer();
    if (!pointer) return;

    setSelection([]);
    drawStart = snapPointer(pointer, planner.grid);
    isDrawing = true;
    draftShape = createDraftShape(tool, drawStart, drawStart);
    panPointerId = event.evt.pointerId;
    host?.setPointerCapture(event.evt.pointerId);
    beginPointerSession();
  }

  function handleWindowPointerMove(event: PointerEvent) {
    if (isDraggingBlueprint && event.pointerId === panPointerId && planner.blueprint) {
      const dx = (event.clientX - panOrigin.x) / planner.viewport.scale;
      const dy = (event.clientY - panOrigin.y) / planner.viewport.scale;
      setBlueprintPosition(blueprintDragStart.x + dx, blueprintDragStart.y + dy);
      return;
    }

    if (isPanning && event.pointerId === panPointerId) {
      setViewport({
        ...planner.viewport,
        x: panViewportStart.x + (event.clientX - panOrigin.x),
        y: panViewportStart.y + (event.clientY - panOrigin.y)
      });
      return;
    }

    if (isMarqueeSelecting && event.pointerId === panPointerId) {
      const pointer = getWorldPointerFromClient(event.clientX, event.clientY);
      if (!pointer) return;

      const rect = normalizeBounds(marqueeStart, pointer);
      marqueeRect = rect;

      if (rect.width >= MARQUEE_MIN_SIZE || rect.height >= MARQUEE_MIN_SIZE) {
        applyMarqueeSelection(rect);
      } else if (!marqueeShiftKey) {
        setSelection([]);
      }

      return;
    }

    if (!isDrawing || !draftShape || event.pointerId !== panPointerId) return;

    const pointer = getWorldPointerFromClient(event.clientX, event.clientY);
    if (!pointer) return;
    draftShape = createDraftShape(
      tool,
      drawStart,
      snapPointer(pointer, planner.grid),
      draftShape.id
    );
  }

  function handleWindowPointerUp(event: PointerEvent) {
    if (isDraggingBlueprint && event.pointerId === panPointerId) {
      endPointerSession();
      return;
    }

    if (isPanning && event.pointerId === panPointerId) {
      endPointerSession();
      return;
    }

    if (isMarqueeSelecting && event.pointerId === panPointerId) {
      const rect = marqueeRect;
      if (rect && (rect.width >= MARQUEE_MIN_SIZE || rect.height >= MARQUEE_MIN_SIZE)) {
        applyMarqueeSelection(rect);
      } else if (!marqueeShiftKey) {
        setSelection([]);
      } else {
        setSelection(marqueeBaseSelection);
      }

      finishMarquee();
      endPointerSession();
      return;
    }

    if (!isDrawing || event.pointerId !== panPointerId) return;
    finishDrawing();
  }

  function finishDrawing() {
    if (!isDrawing || !draftShape) {
      endPointerSession();
      return;
    }

    const bounds = getShapeBounds(draftShape);
    if (bounds.width >= MARQUEE_MIN_SIZE || bounds.height >= MARQUEE_MIN_SIZE) {
      const committed = snapShape(draftShape, planner.grid);
      setShapes([...planner.shapes, committed], { recordUndo: true });
      setSelection([committed.id]);
    }

    draftShape = null;
    isDrawing = false;
    endPointerSession();
  }

  function createDraftShape(
    currentTool: PlantaTool,
    start: { x: number; y: number },
    end: { x: number; y: number },
    id = createShapeId()
  ): PlantaShape {
    if (currentTool === "line") {
      return snapShape(
        {
          id,
          type: "line",
          points: [start.x, start.y, end.x, end.y],
          name: `Linha ${planner.shapes.length + 1}`,
          visible: true,
          locked: false,
          stroke: SHAPE_STROKE,
          strokeWidth: 3
        },
        planner.grid
      );
    }

    const width = end.x - start.x;
    const height = end.y - start.y;
    const size =
      currentTool === "square"
        ? Math.max(Math.abs(width), Math.abs(height)) * (width < 0 ? -1 : 1)
        : width;
    const squareHeight =
      currentTool === "square"
        ? Math.max(Math.abs(width), Math.abs(height)) * (height < 0 ? -1 : 1)
        : height;

    const rect: Extract<PlantaShape, { type: "rect" }> = {
      id,
      type: "rect",
      name: `Retangulo ${planner.shapes.length + 1}`,
      visible: true,
      locked: false,
      x: size < 0 ? start.x + size : start.x,
      y: squareHeight < 0 ? start.y + squareHeight : start.y,
      width: Math.abs(size),
      height: Math.abs(squareHeight),
      stroke: SHAPE_STROKE,
      strokeWidth: 2,
      fill: SHAPE_FILL
    };
    return currentTool === "square"
      ? snapSquareRect(rect, planner.grid)
      : snapRectShape(rect, planner.grid);
  }

  function handleShapePointerDown(event: KonvaPointerEvent, shapeId: string) {
    if (spacePressed || isPanning || tool === "pan" || blueprintHandActive) return;
    const shape = planner.shapes.find((current) => current.id === shapeId);
    if (shape?.locked || shape?.visible === false || shape?.id === draftShape?.id) return;

    event.cancelBubble = true;

    if (tool === "select" && event.evt.shiftKey) {
      toggleSelection(shapeId);
      return;
    }

    setSelection([shapeId]);
  }

  function setLiveShape(shape: PlantaShape) {
    liveShapeGeometry = { ...liveShapeGeometry, [shape.id]: shape };
  }

  function clearLiveShape(shapeId: string) {
    if (!liveShapeGeometry[shapeId]) return;
    const next = { ...liveShapeGeometry };
    delete next[shapeId];
    liveShapeGeometry = next;
  }

  function getRectGeometryFromNode(
    node: Konva.Node,
    shape: Extract<PlantaShape, { type: "rect" }>
  ): Extract<PlantaShape, { type: "rect" }> {
    return snapRectShape(
      {
        ...shape,
        x: node.x(),
        y: node.y(),
        width: Math.max(MARQUEE_MIN_SIZE, shape.width * node.scaleX()),
        height: Math.max(MARQUEE_MIN_SIZE, shape.height * node.scaleY())
      },
      planner.grid
    );
  }

  function getLineGeometryFromNode(
    node: Konva.Node,
    shape: Extract<PlantaShape, { type: "line" }>
  ): Extract<PlantaShape, { type: "line" }> {
    const lineNode = node as Konva.Line;
    const scaleX = lineNode.scaleX();
    const scaleY = lineNode.scaleY();
    const x = lineNode.x();
    const y = lineNode.y();

    return snapShape(
      {
        ...shape,
        points: [
          shape.points[0] * scaleX + x,
          shape.points[1] * scaleY + y,
          shape.points[2] * scaleX + x,
          shape.points[3] * scaleY + y
        ]
      },
      planner.grid
    ) as Extract<PlantaShape, { type: "line" }>;
  }

  function syncRectShapeFromNode(node: Konva.Node, shape: Extract<PlantaShape, { type: "rect" }>) {
    const nextShape = getRectGeometryFromNode(node, shape);
    node.scale({ x: 1, y: 1 });
    updateShape(nextShape);
  }

  function syncLineShapeFromNode(node: Konva.Node, shape: Extract<PlantaShape, { type: "line" }>) {
    const lineNode = node as Konva.Line;
    const nextShape = getLineGeometryFromNode(node, shape);
    lineNode.position({ x: 0, y: 0 });
    lineNode.scale({ x: 1, y: 1 });
    updateShape(nextShape);
  }

  function handleRectDragMove(
    event: KonvaDragTransformEvent,
    shape: Extract<PlantaShape, { type: "rect" }>
  ) {
    const position = snapPointer({ x: event.target.x(), y: event.target.y() }, planner.grid);
    if (planner.grid.snapToGrid) {
      event.target.position(position);
    }
    setLiveShape({ ...shape, ...position });
  }

  function handleRectDragEnd(event: KonvaDragTransformEvent, shape: Extract<PlantaShape, { type: "rect" }>) {
    const position = snapPointer({ x: event.target.x(), y: event.target.y() }, planner.grid);
    if (planner.grid.snapToGrid) {
      event.target.position(position);
    }
    updateShape({
      ...shape,
      ...position
    });
    clearLiveShape(shape.id);
  }

  function handleRectTransform(
    event: KonvaDragTransformEvent,
    shape: Extract<PlantaShape, { type: "rect" }>
  ) {
    setLiveShape(getRectGeometryFromNode(event.target, shape));
  }

  function handleRectTransformEnd(
    event: KonvaDragTransformEvent,
    shape: Extract<PlantaShape, { type: "rect" }>
  ) {
    syncRectShapeFromNode(event.target, shape);
    clearLiveShape(shape.id);
  }

  function handleLineDragMove(
    event: KonvaDragTransformEvent,
    shape: Extract<PlantaShape, { type: "line" }>
  ) {
    setLiveShape(getLineGeometryFromNode(event.target, shape));
  }

  function handleLineDragEnd(event: KonvaDragTransformEvent, shape: Extract<PlantaShape, { type: "line" }>) {
    const dx = event.target.x();
    const dy = event.target.y();
    event.target.position({ x: 0, y: 0 });
    updateShape(
      snapShape(
        {
          ...shape,
          points: [
            shape.points[0] + dx,
            shape.points[1] + dy,
            shape.points[2] + dx,
            shape.points[3] + dy
          ]
        },
        planner.grid
      )
    );
    clearLiveShape(shape.id);
  }

  function handleLineTransform(
    event: KonvaDragTransformEvent,
    shape: Extract<PlantaShape, { type: "line" }>
  ) {
    setLiveShape(getLineGeometryFromNode(event.target, shape));
  }

  function handleLineTransformEnd(
    event: KonvaDragTransformEvent,
    shape: Extract<PlantaShape, { type: "line" }>
  ) {
    syncLineShapeFromNode(event.target, shape);
    clearLiveShape(shape.id);
  }
</script>

<div
  bind:this={host}
  onpointerdowncapture={handleHostPointerDown}
  class={cn(
    "relative min-h-[560px] flex-1 overflow-hidden rounded-lg border border-app-border bg-[#f9fbff] shadow-sm",
    isPanning
      ? "cursor-grabbing"
      : isDraggingBlueprint
        ? "cursor-grabbing"
        : panCursorActive
          ? "cursor-grab"
          : blueprintHandCursorActive
            ? "cursor-grab"
            : tool === "select"
              ? "cursor-default"
              : "cursor-crosshair"
  )}
>
  {#if canvasWidth > 0 && canvasHeight > 0}
    <Stage
      width={canvasWidth}
      height={canvasHeight}
      x={planner.viewport.x}
      y={planner.viewport.y}
      scaleX={planner.viewport.scale}
      scaleY={planner.viewport.scale}
      bind:this={stageRef}
      onwheel={handleWheel}
      onpointerdown={handleStagePointerDown}
      divWrapperProps={{ class: "h-full w-full" }}
    >
      <Layer listening={false}>
        {#if planner.blueprint && blueprintImage}
          <KonvaImage
            image={blueprintImage}
            x={planner.blueprint.x}
            y={planner.blueprint.y}
            width={planner.blueprint.naturalWidth}
            height={planner.blueprint.naturalHeight}
            scaleX={planner.blueprint.scale}
            scaleY={planner.blueprint.scale}
            opacity={planner.blueprint.opacity}
            listening={false}
          />
        {/if}
      </Layer>

      <Layer>
        {#each gridLines as gridLine (gridLine.id)}
          <Line
            points={gridLine.points}
            stroke={gridLine.strong ? "#91a3b8" : "#d7e0ec"}
            strokeWidth={gridLine.strong ? 1.5 : 1}
            strokeScaleEnabled={false}
            listening={false}
          />
        {/each}

        {#each allShapes as shape (shape.id)}
          {#if shape.visible !== false}
            {#if shape.type === "rect"}
              <Rect
                id={konvaShapeId(shape.id)}
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                fill={shape.fill}
                stroke={shape.stroke}
                strokeWidth={shape.strokeWidth}
                strokeScaleEnabled={false}
                draggable={shapeDraggable && shape.id !== draftShape?.id && !shape.locked && selectedShapeIds.includes(shape.id)}
                dragBoundFunc={planner.grid.snapToGrid ? rectDragBound : undefined}
                onpointerdown={(event) => handleShapePointerDown(event, shape.id)}
                ondragmove={(event) => handleRectDragMove(event, shape)}
                ondragend={(event) => handleRectDragEnd(event, shape)}
                ontransform={(event) => handleRectTransform(event, shape)}
                ontransformend={(event) => handleRectTransformEnd(event, shape)}
              />
            {:else}
              <Line
                id={konvaShapeId(shape.id)}
                points={shape.points}
                stroke={shape.stroke}
                strokeWidth={shape.strokeWidth}
                strokeScaleEnabled={false}
                lineCap="round"
                lineJoin="round"
                draggable={shapeDraggable && shape.id !== draftShape?.id && !shape.locked && selectedShapeIds.includes(shape.id)}
                onpointerdown={(event) => handleShapePointerDown(event, shape.id)}
                ondragmove={(event) => handleLineDragMove(event, shape)}
                ondragend={(event) => handleLineDragEnd(event, shape)}
                ontransform={(event) => handleLineTransform(event, shape)}
                ontransformend={(event) => handleLineTransformEnd(event, shape)}
              />
            {/if}
          {/if}
        {/each}

        {#each measurementOverlays as overlay (overlay.shapeId)}
          {@const overlayOpacity = measurementOverlayOpacity(overlay.shapeId)}
          {#each overlay.lines as line, lineIndex (`${overlay.shapeId}-line-${lineIndex}`)}
            <Line
              points={line.points}
              stroke={MEASUREMENT_LINE_STROKE}
              strokeWidth={measurementStrokeWidth}
              dash={MEASUREMENT_LINE_DASH}
              opacity={overlayOpacity}
              strokeScaleEnabled={false}
              listening={false}
            />
          {/each}
          {#each overlay.texts as textSpec, textIndex (`${overlay.shapeId}-text-${textIndex}`)}
            {@const textOffset = estimateTextOffset(textSpec.text, measurementFontSize)}
            <Text
              x={textSpec.x}
              y={textSpec.y}
              text={textSpec.text}
              fontSize={measurementFontSize}
              fontFamily="system-ui, -apple-system, sans-serif"
              fill={textSpec.kind === "area" ? "#475569" : "#334155"}
              rotation={textSpec.rotation ?? 0}
              offsetX={textOffset.x}
              offsetY={textOffset.y}
              opacity={overlayOpacity}
              listening={false}
            />
          {/each}
        {/each}

        {#if marqueeRect && (marqueeRect.width >= MARQUEE_MIN_SIZE || marqueeRect.height >= MARQUEE_MIN_SIZE)}
          <Rect
            x={marqueeRect.x}
            y={marqueeRect.y}
            width={marqueeRect.width}
            height={marqueeRect.height}
            fill="rgba(29, 95, 158, 0.08)"
            stroke="#1d5f9e"
            dash={[4, 4]}
            strokeWidth={1}
            strokeScaleEnabled={false}
            listening={false}
          />
        {/if}

        <Transformer
          bind:this={transformerRef}
          rotateEnabled={false}
          keepRatio={false}
          anchorStroke="#1d5f9e"
          anchorFill="#fcfdff"
          anchorSize={8}
          borderStroke="#1d5f9e"
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]}
        />
      </Layer>
    </Stage>
  {/if}

  {#if planner.shapes.length === 0 && !planner.blueprint}
    <div class="pointer-events-none absolute inset-x-4 top-4 rounded-md border border-dashed border-app-border bg-app-surface/85 px-3 py-2 text-sm text-app-muted shadow-sm">
      Comece com a grade em branco ou envie uma planta para desenhar por cima.
    </div>
  {/if}
</div>
