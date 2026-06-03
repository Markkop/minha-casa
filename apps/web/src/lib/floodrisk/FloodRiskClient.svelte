<script lang="ts">
  import { page } from "$app/state";
  import { onMount, tick } from "svelte";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { sortSelectableListings } from "$lib/listings/listing-selector";
  import FloodRiskConfigPanel from "$lib/floodrisk/FloodRiskConfigPanel.svelte";
  import FloodRiskInputPanel from "$lib/floodrisk/FloodRiskInputPanel.svelte";
  import FloodRiskScenarioPanel from "$lib/floodrisk/FloodRiskScenarioPanel.svelte";
  import type { ConnectionType, ElementHeight } from "$lib/floodrisk/flood-risk-data";
  import { parseFloodRiskResponse, type ParseResult } from "$lib/floodrisk/flood-risk-parser";
  import {
    applyGlobalsToBlocks,
    cloneDefaultBlocks,
    computeWaterLevel,
    type FloodRiskGlobals,
    type FloodRiskScenario
  } from "$lib/floodrisk/flood-risk-scenario";
  import { createFloodRiskScene } from "$lib/floodrisk/use-flood-risk-scene.svelte";
  import { WORKSPACE_CONTENT_CLASS, WORKSPACE_STACK_CLASS } from "$lib/workspace-chrome";
  import { cn } from "$lib/utils";

  const ctx = getCollectionsContext();

  let canvasHost = $state<HTMLDivElement | null>(null);
  let pastedText = $state("");
  let customBlocks = $state<ElementHeight[]>(cloneDefaultBlocks());
  let appliedScenarios = $state<FloodRiskScenario[]>([]);
  let appliedGlobals = $state<FloodRiskGlobals | null>(null);
  let activeScenarioIdx = $state(0);
  let edgeStates = $state<Record<number, ConnectionType>>({
    0: "RAMP",
    1: "RAMP",
    2: "STEP",
    3: "RAMP",
    4: "STEP",
    5: "STEP"
  });
  let sceneReady = $state(false);
  let inputPanelOpen = $state(true);

  const selectedListingId = $derived(page.url.searchParams.get("listing"));
  const sortedListings = $derived(sortSelectableListings(ctx.listings));

  const selectedListing = $derived.by(() => {
    if (ctx.isLoadingListings) return null;
    return (
      sortedListings.find((listing) => listing.id === selectedListingId) ??
      sortedListings[0] ??
      null
    );
  });

  const parseResult = $derived.by(() => {
    if (!pastedText.trim()) return null;
    return parseFloodRiskResponse(pastedText);
  });

  let lastAppliedFingerprint = $state("");

  $effect(() => {
    const fingerprint = pastedText.trim();
    if (!fingerprint) {
      lastAppliedFingerprint = "";
      return;
    }

    const result = parseResult;
    if (!result?.ok) return;
    if (fingerprint === lastAppliedFingerprint) return;
    lastAppliedFingerprint = fingerprint;

    appliedScenarios = result.scenarios;
    appliedGlobals = result.globals;
    customBlocks = applyGlobalsToBlocks(cloneDefaultBlocks(), result.globals);
    activeScenarioIdx = 0;
  });

  const activeScenario = $derived(appliedScenarios[activeScenarioIdx] ?? null);
  const waterLevel = $derived(computeWaterLevel(customBlocks, activeScenario));

  const floodScene = createFloodRiskScene({
    getCanvasHost: () => canvasHost,
    getWaterLevel: () => waterLevel,
    getCustomBlocks: () => customBlocks,
    getEdgeStates: () => edgeStates,
    onToggleEdge: toggleEdge,
    trackRebuildDeps: () => {
      activeScenarioIdx;
      customBlocks;
      edgeStates;
      appliedScenarios;
      waterLevel;
    },
    getSceneActive: () => sceneReady
  });

  onMount(() => {
    let disposed = false;

    void (async () => {
      await tick();
      if (disposed) return;
      floodScene.initialize();
      sceneReady = true;
    })();

    return () => {
      disposed = true;
      sceneReady = false;
      floodScene.dispose();
    };
  });

  function toggleEdge(index: number) {
    edgeStates = { ...edgeStates, [index]: edgeStates[index] === "RAMP" ? "STEP" : "RAMP" };
  }

  function updateBlockHeight(blockId: string, value: string) {
    const height = Number.parseFloat(value);
    if (!Number.isFinite(height) || height < 0) return;
    customBlocks = customBlocks.map((block) =>
      block.id === blockId ? { ...block, height_rel_creek: height } : block
    );
  }
</script>

<div class={cn(WORKSPACE_CONTENT_CLASS, WORKSPACE_STACK_CLASS, "flex min-h-[680px] flex-col text-app-fg")}>
  <FloodRiskInputPanel
    bind:open={inputPanelOpen}
    {selectedListing}
    isLoadingListings={ctx.isLoadingListings}
    bind:pastedText
    {parseResult}
    {appliedGlobals}
    scenarioCount={appliedScenarios.length}
  />

  <div class="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
    <div
      bind:this={canvasHost}
      class="min-h-[420px] flex-1 overflow-hidden rounded-lg border border-app-border bg-[#dff3ff] shadow-sm lg:min-h-[560px]"
    ></div>

    <aside
      class="max-h-[48vh] w-full shrink-0 overflow-y-auto rounded-lg border border-app-border bg-app-surface p-4 shadow-sm lg:max-h-none lg:w-[380px]"
    >
      <div class="mb-4">
        <h1 class="text-lg font-semibold text-app-fg">Floodrisk</h1>
        <p class="mt-1 text-sm text-app-muted">
          Estimativa informativa — nao substitui laudo tecnico.
        </p>
      </div>

      <FloodRiskScenarioPanel
        scenarios={appliedScenarios}
        bind:activeScenarioIdx
        {customBlocks}
        {appliedGlobals}
        {waterLevel}
      />

      <FloodRiskConfigPanel
        {customBlocks}
        {edgeStates}
        onUpdateBlockHeight={updateBlockHeight}
        onToggleEdge={toggleEdge}
      />
    </aside>
  </div>
</div>
