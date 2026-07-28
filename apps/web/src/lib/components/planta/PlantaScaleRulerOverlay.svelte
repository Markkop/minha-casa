<script lang="ts">
  import { Circle, Group, Line, Text, type KonvaDragTransformEvent, type KonvaPointerEvent } from "svelte-konva";
  import {
    getScaleRulerLength,
    MAX_METERS_PER_CELL,
    MIN_METERS_PER_CELL,
    metersPerCellFromScaleRulerLength,
    moveScaleRuler
  } from "$lib/components/planta/scale-ruler";
  import type { PlantaDocument, PlantaScaleRuler } from "$lib/components/planta/types";

  const STROKE = "#d97706";
  const LABEL = "1,00 m";

  let {
    planner = $bindable<PlantaDocument>(),
    interactionDisabled = false
  }: {
    planner: PlantaDocument;
    interactionDisabled?: boolean;
  } = $props();

  let dragStart: PlantaScaleRuler | null = $state(null);

  const presentation = $derived.by(() => {
    if (!planner.scaleRuler) return null;
    const [x1, y1, x2, y2] = planner.scaleRuler.points;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const labelGap = 14 / planner.viewport.scale;
    const angleDeg = (angle * 180) / Math.PI;
    return {
      x1,
      y1,
      x2,
      y2,
      midX: (x1 + x2) / 2 - Math.sin(angle) * labelGap,
      midY: (y1 + y2) / 2 + Math.cos(angle) * labelGap,
      angleDeg: angleDeg > 90 || angleDeg < -90 ? angleDeg + 180 : angleDeg
    };
  });
  const handleRadius = $derived(5 / planner.viewport.scale);
  const fontSize = $derived(12 / planner.viewport.scale);

  function setScaleRuler(scaleRuler: PlantaScaleRuler, metersPerCell?: number) {
    planner = {
      ...planner,
      scaleRuler,
      grid:
        metersPerCell === undefined
          ? planner.grid
          : {
              ...planner.grid,
              metersPerCell
            }
    };
  }

  function stopPropagation(event: KonvaPointerEvent | KonvaDragTransformEvent) {
    event.cancelBubble = true;
  }

  function handleDragStart(event: KonvaDragTransformEvent) {
    event.cancelBubble = true;
    dragStart = planner.scaleRuler
      ? { points: [...planner.scaleRuler.points] as [number, number, number, number] }
      : null;
  }

  function handleDragEnd(event: KonvaDragTransformEvent) {
    event.cancelBubble = true;
    const start = dragStart;
    const deltaX = event.target.x();
    const deltaY = event.target.y();
    event.target.position({ x: 0, y: 0 });
    dragStart = null;
    if (!start) return;

    const moved = moveScaleRuler(start, deltaX, deltaY);
    if (moved) setScaleRuler(moved);
  }

  function handleEndpointDrag(event: KonvaDragTransformEvent, endpoint: "start" | "end") {
    event.cancelBubble = true;
    const current = planner.scaleRuler;
    if (!current) return;

    const points = [...current.points] as [number, number, number, number];
    const pointIndex = endpoint === "start" ? 0 : 2;
    points[pointIndex] = event.target.x();
    points[pointIndex + 1] = event.target.y();
    const next: PlantaScaleRuler = { points };
    const metersPerCell = metersPerCellFromScaleRulerLength(
      getScaleRulerLength(next),
      planner.grid.size
    );

    if (
      metersPerCell === null ||
      metersPerCell < MIN_METERS_PER_CELL ||
      metersPerCell > MAX_METERS_PER_CELL
    ) {
      event.target.position({
        x: current.points[pointIndex],
        y: current.points[pointIndex + 1]
      });
      return;
    }

    setScaleRuler(next, metersPerCell);
  }
</script>

{#if presentation}
  <Group
    draggable={!interactionDisabled}
    onpointerdown={stopPropagation}
    ondragstart={handleDragStart}
    ondragend={handleDragEnd}
  >
    <Line
      points={[presentation.x1, presentation.y1, presentation.x2, presentation.y2]}
      stroke={STROKE}
      strokeWidth={2}
      strokeScaleEnabled={false}
      lineCap="round"
      hitStrokeWidth={16 / planner.viewport.scale}
    />
    <Group
      x={presentation.x1}
      y={presentation.y1}
      draggable={!interactionDisabled}
      onpointerdown={stopPropagation}
      ondragstart={stopPropagation}
      ondragmove={(event) => handleEndpointDrag(event, "start")}
      ondragend={(event) => handleEndpointDrag(event, "start")}
    >
      <Circle radius={handleRadius} fill="transparent" />
      <Line
        points={[-handleRadius, -handleRadius, handleRadius, handleRadius]}
        stroke={STROKE}
        strokeWidth={2}
        strokeScaleEnabled={false}
        lineCap="round"
        listening={false}
      />
      <Line
        points={[-handleRadius, handleRadius, handleRadius, -handleRadius]}
        stroke={STROKE}
        strokeWidth={2}
        strokeScaleEnabled={false}
        lineCap="round"
        listening={false}
      />
    </Group>
    <Group
      x={presentation.x2}
      y={presentation.y2}
      draggable={!interactionDisabled}
      onpointerdown={stopPropagation}
      ondragstart={stopPropagation}
      ondragmove={(event) => handleEndpointDrag(event, "end")}
      ondragend={(event) => handleEndpointDrag(event, "end")}
    >
      <Circle radius={handleRadius} fill="transparent" />
      <Line
        points={[-handleRadius, -handleRadius, handleRadius, handleRadius]}
        stroke={STROKE}
        strokeWidth={2}
        strokeScaleEnabled={false}
        lineCap="round"
        listening={false}
      />
      <Line
        points={[-handleRadius, handleRadius, handleRadius, -handleRadius]}
        stroke={STROKE}
        strokeWidth={2}
        strokeScaleEnabled={false}
        lineCap="round"
        listening={false}
      />
    </Group>
    <Text
      x={presentation.midX}
      y={presentation.midY}
      text={LABEL}
      fontSize={fontSize}
      fontFamily="system-ui, -apple-system, sans-serif"
      fontStyle="bold"
      fill={STROKE}
      rotation={presentation.angleDeg}
      offsetX={LABEL.length * fontSize * 0.29}
      offsetY={fontSize / 2}
      listening={false}
    />
  </Group>
{/if}
