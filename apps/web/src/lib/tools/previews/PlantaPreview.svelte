<script lang="ts">
  import { onMount } from "svelte";
  import { Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from "svelte-konva";
  import type Konva from "konva";
  import { buildGridLines } from "$lib/components/planta/grid-lines";
  import {
    buildAllMeasurementOverlays,
    estimateTextGapWorld
  } from "$lib/components/planta/measurements";
  import type { PlantaRectShape } from "$lib/components/planta/types";
  import {
    PLANTA_PREVIEW_FRAME,
    PLANTA_PREVIEW_GRID,
    PLANTA_PREVIEW_GRID_SIZE,
    PLANTA_PREVIEW_GRID_STROKE,
    PLANTA_PREVIEW_GRID_STROKE_STRONG,
    PLANTA_PREVIEW_IMAGE_OPACITY,
    PLANTA_PREVIEW_IMAGE_SRC,
    PLANTA_PREVIEW_SHAPE_FILL,
    PLANTA_PREVIEW_SHAPE_STROKE,
    PLANTA_PREVIEW_SHAPES,
    PLANTA_PREVIEW_STAGE_BG,
    PLANTA_PREVIEW_STAGE_HEIGHT,
    PLANTA_PREVIEW_STAGE_WIDTH,
    previewShapeToRect,
    type PlantaPreviewShape
  } from "$lib/tools/previews/planta-preview-data";

  const MEASUREMENT_LINE_STROKE = "#64748b";
  const MEASUREMENT_LINE_DASH = [6, 4];
  const measurementStrokeWidth = 1;
  const measurementFontSize = 11;

  let host = $state<HTMLDivElement | null>(null);
  let width = $state(0);
  let height = $state(0);
  let floorPlanImage = $state<HTMLImageElement | null>(null);
  let shapes = $state<PlantaPreviewShape[]>(PLANTA_PREVIEW_SHAPES.map((shape) => ({ ...shape })));
  let selectedId = $state<string | null>(PLANTA_PREVIEW_SHAPES[0]?.id ?? null);
  let transformerRef = $state<ReturnType<typeof Transformer> | undefined>();

  const scale = $derived(
    Math.min(width / PLANTA_PREVIEW_STAGE_WIDTH, height / PLANTA_PREVIEW_STAGE_HEIGHT, 1.35)
  );
  const offsetX = $derived((width - PLANTA_PREVIEW_STAGE_WIDTH * scale) / 2);
  const offsetY = $derived((height - PLANTA_PREVIEW_STAGE_HEIGHT * scale) / 2);

  const gridLines = $derived(
    buildGridLines({
      visible: PLANTA_PREVIEW_GRID.visible,
      size: PLANTA_PREVIEW_GRID_SIZE,
      left: 0,
      top: 0,
      right: PLANTA_PREVIEW_STAGE_WIDTH,
      bottom: PLANTA_PREVIEW_STAGE_HEIGHT
    })
  );

  const rectShapes = $derived(shapes.map(previewShapeToRect));

  const measurementOverlays = $derived(
    buildAllMeasurementOverlays(rectShapes, PLANTA_PREVIEW_GRID)
  );

  function konvaId(id: string) {
    return `planta-preview-${id}`;
  }

  function estimateTextOffset(text: string, fontSize: number) {
    const gap = estimateTextGapWorld(text);
    return { x: gap / 2, y: fontSize * 0.35 };
  }

  function selectShape(id: string) {
    selectedId = id;
    queueMicrotask(() => attachTransformer());
  }

  async function attachTransformer() {
    const transformer = transformerRef?.node;
    const stage = transformer?.getStage();
    if (!transformer || !stage || !selectedId) {
      transformer?.nodes([]);
      return;
    }
    const node = stage.findOne(`#${konvaId(selectedId)}`);
    if (node) {
      transformer.nodes([node as Konva.Node]);
      transformer.getLayer()?.batchDraw();
    } else {
      transformer.nodes([]);
    }
  }

  function applySnappedShape(shape: PlantaPreviewShape, rect: PlantaRectShape) {
    shapes = shapes.map((item) =>
      item.id === shape.id
        ? { ...item, x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        : item
    );
  }

  function syncShapeFromNode(shape: PlantaPreviewShape, node: Konva.Rect) {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rect = previewShapeToRect({
      ...shape,
      x: node.x(),
      y: node.y(),
      width: Math.max(24, node.width() * scaleX),
      height: Math.max(24, node.height() * scaleY)
    });
    node.scaleX(1);
    node.scaleY(1);
    applySnappedShape(shape, rect);
  }

  function handleDragEnd(shape: PlantaPreviewShape, event: { target: Konva.Node }) {
    syncShapeFromNode(shape, event.target as Konva.Rect);
  }

  function handleTransformEnd(shape: PlantaPreviewShape, event: { target: Konva.Node }) {
    syncShapeFromNode(shape, event.target as Konva.Rect);
  }

  function loadFloorPlanImage() {
    const image = new Image();
    image.src = PLANTA_PREVIEW_IMAGE_SRC;
    image.onload = () => {
      floorPlanImage = image;
    };
  }

  onMount(() => {
    loadFloorPlanImage();
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => {
      width = Math.floor(entry.contentRect.width);
      height = Math.floor(entry.contentRect.height);
    });
    observer.observe(host);
    width = host.clientWidth;
    height = host.clientHeight;
    void attachTransformer();
    return () => observer.disconnect();
  });

  $effect(() => {
    selectedId;
    width;
    height;
    void attachTransformer();
  });
</script>

<div
  bind:this={host}
  class="relative aspect-video min-h-[180px] overflow-hidden bg-[#f9fbff]"
  aria-label="Pre-visualizacao de planta baixa"
>
  {#if width > 0 && height > 0}
    <Stage
      {width}
      {height}
      x={offsetX}
      y={offsetY}
      scaleX={scale}
      scaleY={scale}
      divWrapperProps={{ class: "h-full w-full" }}
    >
      <Layer listening={false}>
        <Rect
          x={PLANTA_PREVIEW_FRAME.x}
          y={PLANTA_PREVIEW_FRAME.y}
          width={PLANTA_PREVIEW_FRAME.width}
          height={PLANTA_PREVIEW_FRAME.height}
          fill={PLANTA_PREVIEW_STAGE_BG}
        />
        {#if floorPlanImage}
          <KonvaImage
            image={floorPlanImage}
            x={PLANTA_PREVIEW_FRAME.x}
            y={PLANTA_PREVIEW_FRAME.y}
            width={PLANTA_PREVIEW_FRAME.width}
            height={PLANTA_PREVIEW_FRAME.height}
            opacity={PLANTA_PREVIEW_IMAGE_OPACITY}
            listening={false}
          />
        {/if}
      </Layer>

      <Layer>
        {#each gridLines as gridLine (gridLine.id)}
          <Line
            points={gridLine.points}
            stroke={gridLine.strong ? PLANTA_PREVIEW_GRID_STROKE_STRONG : PLANTA_PREVIEW_GRID_STROKE}
            strokeWidth={gridLine.strong ? 1.5 : 1}
            strokeScaleEnabled={false}
            listening={false}
          />
        {/each}

        {#each shapes as shape (shape.id)}
          <Rect
            id={konvaId(shape.id)}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            fill={PLANTA_PREVIEW_SHAPE_FILL}
            stroke={PLANTA_PREVIEW_SHAPE_STROKE}
            strokeWidth={2}
            strokeScaleEnabled={false}
            draggable={true}
            onpointerdown={() => selectShape(shape.id)}
            ondragend={(event) => handleDragEnd(shape, event)}
            ontransformend={(event) => handleTransformEnd(shape, event)}
          />
        {/each}

        {#each measurementOverlays as overlay (overlay.shapeId)}
          {#each overlay.lines as line, lineIndex (`${overlay.shapeId}-line-${lineIndex}`)}
            <Line
              points={line.points}
              stroke={MEASUREMENT_LINE_STROKE}
              strokeWidth={measurementStrokeWidth}
              dash={MEASUREMENT_LINE_DASH}
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
              listening={false}
            />
          {/each}
        {/each}

        <Transformer
          bind:this={transformerRef}
          rotateEnabled={false}
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
            "middle-left",
            "middle-right",
            "top-center",
            "bottom-center"
          ]}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < PLANTA_PREVIEW_GRID_SIZE || newBox.height < PLANTA_PREVIEW_GRID_SIZE) {
              return oldBox;
            }
            return newBox;
          }}
        />
      </Layer>
    </Stage>
  {/if}
</div>
