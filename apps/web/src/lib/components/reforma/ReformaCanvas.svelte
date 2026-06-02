<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    Image as KonvaImage,
    Layer,
    Line,
    Rect,
    Stage,
    Transformer,
    type KonvaDragTransformEvent,
    type KonvaPointerEvent,
    type KonvaWheelEvent
  } from "svelte-konva";
  import type Konva from "konva";
  import { cn } from "$lib/utils";
  import {
    createShapeId,
    getShapeBounds
  } from "$lib/components/reforma/state";
  import type {
    ReformaDocument,
    ReformaShape,
    ReformaTool
  } from "$lib/components/reforma/types";

  const MIN_SCALE = 0.2;
  const MAX_SCALE = 4;
  const SCALE_BY = 1.05;
  const SHAPE_STROKE = "#1d5f9e";
  const SHAPE_FILL = "rgba(157, 212, 255, 0.16)";

  let {
    planner = $bindable<ReformaDocument>(),
    tool,
    activeShapeId = $bindable<string | null>(null),
    canvasWidth = $bindable(0),
    canvasHeight = $bindable(0)
  }: {
    planner: ReformaDocument;
    tool: ReformaTool;
    activeShapeId?: string | null;
    canvasWidth?: number;
    canvasHeight?: number;
  } = $props();

  let host: HTMLDivElement | null = $state(null);
  let stageRef: ReturnType<typeof Stage> | undefined = $state();
  let transformerRef: ReturnType<typeof Transformer> | undefined = $state();
  let blueprintImage: HTMLImageElement | null = $state(null);
  let draftShape: ReformaShape | null = $state(null);
  let isDrawing = $state(false);
  let drawStart = $state({ x: 0, y: 0 });

  const gridLines = $derived.by(() => {
    if (!planner.grid.visible || canvasWidth <= 0 || canvasHeight <= 0) return [];

    const size = planner.grid.size;
    const left = (-planner.viewport.x / planner.viewport.scale) - size;
    const top = (-planner.viewport.y / planner.viewport.scale) - size;
    const right = (canvasWidth - planner.viewport.x) / planner.viewport.scale + size;
    const bottom = (canvasHeight - planner.viewport.y) / planner.viewport.scale + size;
    const startX = Math.floor(left / size) * size;
    const startY = Math.floor(top / size) * size;
    const lines: Array<{ id: string; points: number[]; strong: boolean }> = [];

    for (let x = startX; x <= right; x += size) {
      lines.push({ id: `v-${x}`, points: [x, top, x, bottom], strong: x === 0 });
    }
    for (let y = startY; y <= bottom; y += size) {
      lines.push({ id: `h-${y}`, points: [left, y, right, y], strong: y === 0 });
    }

    return lines;
  });

  const allShapes = $derived(draftShape ? [...planner.shapes, draftShape] : planner.shapes);
  const stageDraggable = $derived(tool === "pan" && !isDrawing);

  onMount(() => {
    updateCanvasSize();
    const observer = new ResizeObserver(updateCanvasSize);
    if (host) observer.observe(host);
    return () => observer.disconnect();
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
    void attachTransformer(activeShapeId);
  });

  function updateCanvasSize() {
    if (!host) return;
    canvasWidth = Math.max(320, Math.round(host.clientWidth));
    canvasHeight = Math.max(320, Math.round(host.clientHeight));
  }

  async function attachTransformer(shapeId: string | null) {
    await tick();
    if (!transformerRef || !stageRef || !shapeId) {
      transformerRef?.node.nodes([]);
      return;
    }

    const node = stageRef.node.findOne(`#${konvaShapeId(shapeId)}`);
    transformerRef.node.nodes(node ? [node] : []);
  }

  function konvaShapeId(shapeId: string) {
    return `reforma-shape-${shapeId}`;
  }

  function setViewport(viewport: ReformaDocument["viewport"]) {
    planner = { ...planner, viewport };
  }

  function setShapes(shapes: ReformaShape[]) {
    planner = { ...planner, shapes };
  }

  function updateShape(shape: ReformaShape) {
    setShapes(planner.shapes.map((current) => (current.id === shape.id ? shape : current)));
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

  function handleWheel(event: KonvaWheelEvent) {
    event.evt.preventDefault();
    if (!stageRef) return;

    const pointer = stageRef.node.getPointerPosition();
    if (!pointer) return;

    const oldScale = planner.viewport.scale;
    const mousePointTo = {
      x: (pointer.x - planner.viewport.x) / oldScale,
      y: (pointer.y - planner.viewport.y) / oldScale
    };
    let direction = event.evt.deltaY > 0 ? -1 : 1;
    if (event.evt.ctrlKey) direction = -direction;

    const scale = clampScale(direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY);
    setViewport({
      x: pointer.x - mousePointTo.x * scale,
      y: pointer.y - mousePointTo.y * scale,
      scale
    });
  }

  function handleStagePointerDown(event: KonvaPointerEvent) {
    if (tool === "pan") {
      activeShapeId = null;
      return;
    }

    const isStageClick = event.target === stageRef?.node;
    if (tool === "select") {
      if (isStageClick) activeShapeId = null;
      return;
    }

    const pointer = getWorldPointer();
    if (!pointer) return;

    activeShapeId = null;
    drawStart = pointer;
    isDrawing = true;
    draftShape = createDraftShape(tool, pointer, pointer);
  }

  function handleStagePointerMove() {
    if (!isDrawing || !draftShape) return;
    const pointer = getWorldPointer();
    if (!pointer) return;
    draftShape = createDraftShape(tool, drawStart, pointer, draftShape.id);
  }

  function handleStagePointerUp() {
    if (!isDrawing || !draftShape) return;

    const bounds = getShapeBounds(draftShape);
    if (bounds.width >= 4 || bounds.height >= 4) {
      const committed = draftShape;
      setShapes([...planner.shapes, committed]);
      activeShapeId = committed.id;
    }

    draftShape = null;
    isDrawing = false;
  }

  function createDraftShape(
    currentTool: ReformaTool,
    start: { x: number; y: number },
    end: { x: number; y: number },
    id = createShapeId()
  ): ReformaShape {
    if (currentTool === "line") {
      return {
        id,
        type: "line",
        points: [start.x, start.y, end.x, end.y],
        stroke: SHAPE_STROKE,
        strokeWidth: 3
      };
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

    return {
      id,
      type: "rect",
      x: size < 0 ? start.x + size : start.x,
      y: squareHeight < 0 ? start.y + squareHeight : start.y,
      width: Math.abs(size),
      height: Math.abs(squareHeight),
      stroke: SHAPE_STROKE,
      strokeWidth: 2,
      fill: SHAPE_FILL
    };
  }

  function handleStageDragEnd(event: KonvaDragTransformEvent) {
    if (tool !== "pan") return;
    setViewport({
      ...planner.viewport,
      x: event.target.x(),
      y: event.target.y()
    });
  }

  function handleShapePointerDown(event: KonvaPointerEvent, shapeId: string) {
    if (tool !== "select") return;
    event.cancelBubble = true;
    activeShapeId = shapeId;
  }

  function handleRectDragEnd(event: KonvaDragTransformEvent, shape: Extract<ReformaShape, { type: "rect" }>) {
    updateShape({
      ...shape,
      x: event.target.x(),
      y: event.target.y()
    });
  }

  function handleRectTransformEnd(
    event: KonvaDragTransformEvent,
    shape: Extract<ReformaShape, { type: "rect" }>
  ) {
    const node = event.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scale({ x: 1, y: 1 });
    updateShape({
      ...shape,
      x: node.x(),
      y: node.y(),
      width: Math.max(4, shape.width * scaleX),
      height: Math.max(4, shape.height * scaleY)
    });
  }

  function handleLineDragEnd(event: KonvaDragTransformEvent, shape: Extract<ReformaShape, { type: "line" }>) {
    const dx = event.target.x();
    const dy = event.target.y();
    event.target.position({ x: 0, y: 0 });
    updateShape({
      ...shape,
      points: [
        shape.points[0] + dx,
        shape.points[1] + dy,
        shape.points[2] + dx,
        shape.points[3] + dy
      ]
    });
  }

  function handleLineTransformEnd(
    event: KonvaDragTransformEvent,
    shape: Extract<ReformaShape, { type: "line" }>
  ) {
    const node = event.target as Konva.Line;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const x = node.x();
    const y = node.y();
    node.position({ x: 0, y: 0 });
    node.scale({ x: 1, y: 1 });

    updateShape({
      ...shape,
      points: [
        shape.points[0] * scaleX + x,
        shape.points[1] * scaleY + y,
        shape.points[2] * scaleX + x,
        shape.points[3] * scaleY + y
      ]
    });
  }

  function clampScale(value: number) {
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));
  }
</script>

<div
  bind:this={host}
  class={cn(
    "relative min-h-[560px] flex-1 overflow-hidden rounded-lg border border-app-border bg-[#f9fbff] shadow-sm",
    tool === "pan" ? "cursor-grab" : tool === "select" ? "cursor-default" : "cursor-crosshair"
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
      draggable={stageDraggable}
      bind:this={stageRef}
      onwheel={handleWheel}
      onpointerdown={handleStagePointerDown}
      onpointermove={handleStagePointerMove}
      onpointerup={handleStagePointerUp}
      ondragend={handleStageDragEnd}
      divWrapperProps={{ class: "h-full w-full" }}
    >
      <Layer>
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
              draggable={tool === "select" && shape.id !== draftShape?.id}
              onpointerdown={(event) => handleShapePointerDown(event, shape.id)}
              ondragend={(event) => handleRectDragEnd(event, shape)}
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
              draggable={tool === "select" && shape.id !== draftShape?.id}
              onpointerdown={(event) => handleShapePointerDown(event, shape.id)}
              ondragend={(event) => handleLineDragEnd(event, shape)}
              ontransformend={(event) => handleLineTransformEnd(event, shape)}
            />
          {/if}
        {/each}

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

