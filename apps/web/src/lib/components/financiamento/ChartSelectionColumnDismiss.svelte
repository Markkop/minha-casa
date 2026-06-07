<script lang="ts">
  const HIT_SIZE = 14;
  const INSET = 4;
  const ARM = 3;

  let {
    columnCenterX,
    columnPitch,
    columnTop,
    onDismiss
  }: {
    columnCenterX: number;
    columnPitch: number;
    columnTop: number;
    onDismiss: () => void;
  } = $props();

  const columnLeft = $derived(columnCenterX - columnPitch / 2);
  const columnRight = $derived(columnCenterX + columnPitch / 2);
  const centerX = $derived(
    Math.max(columnLeft + HIT_SIZE / 2, Math.min(columnRight - HIT_SIZE / 2, columnRight - INSET))
  );
  const centerY = $derived(columnTop + INSET + HIT_SIZE / 2);

  function stopChartPointer(event: Event) {
    event.stopPropagation();
  }

  function handleDismiss(event: Event) {
    event.stopPropagation();
    onDismiss();
  }
</script>

<g
  class="pointer-events-auto cursor-pointer"
  role="button"
  tabindex="0"
  aria-label="Desmarcar seleção"
  onclick={handleDismiss}
  onpointerdown={stopChartPointer}
  onkeydown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onDismiss();
    }
  }}
>
  <title>Desmarcar seleção</title>
  <rect
    x={centerX - HIT_SIZE / 2}
    y={centerY - HIT_SIZE / 2}
    width={HIT_SIZE}
    height={HIT_SIZE}
    fill="transparent"
  />
  <line
    x1={centerX - ARM}
    y1={centerY - ARM}
    x2={centerX + ARM}
    y2={centerY + ARM}
    stroke="var(--color-app-accent)"
    stroke-width="1.5"
    stroke-linecap="round"
  />
  <line
    x1={centerX + ARM}
    y1={centerY - ARM}
    x2={centerX - ARM}
    y2={centerY + ARM}
    stroke="var(--color-app-accent)"
    stroke-width="1.5"
    stroke-linecap="round"
  />
</g>
