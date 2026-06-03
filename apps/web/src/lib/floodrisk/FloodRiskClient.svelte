<script lang="ts">
  import { onMount } from "svelte";
  import { tick } from "svelte";
  import { AlertTriangle, CloudRain, Copy, Database, Settings } from "@lucide/svelte";
  import {
    customJsonPlaceholder,
    defaultBlocks,
    scenariosChatGpt,
    scenariosGemini,
    type ConnectionType,
    type DataSourceType,
    type ElementHeight,
    type Scenario
  } from "$lib/floodrisk/flood-risk-data";
  import { createFloodRiskScene } from "$lib/floodrisk/use-flood-risk-scene.svelte";

  let canvasHost = $state<HTMLDivElement | null>(null);
  let dataSource = $state<DataSourceType>("CHATGPT");
  let activeScenarioIdx = $state(0);
  let customBlocks = $state<ElementHeight[]>(defaultBlocks.map((block) => ({ ...block })));
  let customJson = $state("");
  let customScenarios = $state<Scenario[]>([]);
  let jsonError = $state("");
  let edgeStates = $state<Record<number, ConnectionType>>({
    0: "RAMP",
    1: "RAMP",
    2: "STEP",
    3: "RAMP",
    4: "STEP",
    5: "STEP"
  });
  let sceneReady = $state(false);

  const currentScenarios = $derived(
    dataSource === "CHATGPT" ? scenariosChatGpt : dataSource === "GEMINI" ? scenariosGemini : dataSource === "CUSTOM" ? customScenarios : []
  );
  const activeScenario = $derived(currentScenarios[activeScenarioIdx] ?? null);
  const waterLevel = $derived(dataSource === "CONFIGURE" ? 0.3 : (activeScenario?.level_rel_creek ?? 0.3));

  const floodScene = createFloodRiskScene({
    getCanvasHost: () => canvasHost,
    getWaterLevel: () => waterLevel,
    getCustomBlocks: () => customBlocks,
    getEdgeStates: () => edgeStates,
    onToggleEdge: toggleEdge,
    trackRebuildDeps: () => {
      dataSource;
      activeScenarioIdx;
      customBlocks;
      edgeStates;
      customScenarios;
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
    customBlocks = customBlocks.map((block) => (block.id === blockId ? { ...block, height_rel_creek: height } : block));
  }

  function setDataSource(source: DataSourceType) {
    dataSource = source;
    activeScenarioIdx = 0;
  }

  function parseCustomJson(value: string) {
    customJson = value;
    jsonError = "";
    if (!value.trim()) {
      customScenarios = [];
      return;
    }

    try {
      const parsed = JSON.parse(value) as { scenarios?: Scenario[]; blocks?: Record<string, number> };
      const scenarios = Array.isArray(parsed.scenarios)
        ? parsed.scenarios.filter(
            (scenario) =>
              scenario.id &&
              typeof scenario.year === "number" &&
              typeof scenario.rain_24h_mm === "number" &&
              typeof scenario.level_rel_creek === "number" &&
              typeof scenario.level_rel_street === "number" &&
              typeof scenario.level_rel_house === "number"
          )
        : [];
      if (scenarios.length === 0) throw new Error("JSON precisa conter scenarios validos");
      customScenarios = scenarios;
      if (parsed.blocks) {
        customBlocks = customBlocks.map((block) =>
          typeof parsed.blocks?.[block.id] === "number" ? { ...block, height_rel_creek: parsed.blocks[block.id] } : block
        );
      }
    } catch (error) {
      jsonError = error instanceof Error ? error.message : "JSON invalido";
      customScenarios = [];
    }
  }

  function copyPrompt() {
    void navigator.clipboard.writeText(
      "Generate flood scenario JSON with historical data and forecasts for 2030, 2040, 2050, 2075, 2100. Include scenarios array (id, year, description, rain_24h_mm, level_rel_creek, level_rel_street, level_rel_house). Optional: blocks object with element height overrides (leito, talude, rua, calcada, garagem, casa, quintal). Return only valid JSON."
    );
  }
</script>

<div class="flex h-[calc(100vh-3.5rem)] min-h-[680px] flex-col bg-[#101820] text-white md:h-screen md:flex-row">
    <div bind:this={canvasHost} class="order-2 min-h-[420px] flex-1 md:order-1 md:min-h-0"></div>

    <aside
      class="order-1 max-h-[48vh] w-full overflow-y-auto border-b border-white/15 bg-[#17212d] p-4 shadow-2xl md:order-2 md:max-h-none md:w-[420px] md:border-b-0 md:border-l"
    >
      <div class="mb-5">
        <h1 class="text-lg font-semibold">Floodrisk</h1>
        <p class="mt-1 text-sm text-slate-300">Visualizacao 3D de cotas, conexoes e nivel d'agua relativo ao corrego.</p>
      </div>

      <div class="mb-5">
        <h2 class="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-300">
          <Database class="h-4 w-4" /> Fonte de dados
        </h2>
        <div class="grid grid-cols-4 gap-1 rounded-md bg-black/25 p-1">
          {#each ["CHATGPT", "GEMINI", "CUSTOM", "CONFIGURE"] as source}
            <button
              class={`rounded px-2 py-2 text-xs font-semibold ${dataSource === source ? "bg-sky-500 text-slate-950" : "text-slate-300 hover:bg-white/10"}`}
              onclick={() => setDataSource(source as DataSourceType)}
            >
              {source === "CONFIGURE" ? "Config" : source}
            </button>
          {/each}
        </div>
      </div>

      {#if dataSource === "CONFIGURE"}
        <section class="mb-5">
          <h2 class="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-300">
            <Settings class="h-4 w-4" /> Cotas dos blocos
          </h2>
          <div class="space-y-2">
            {#each customBlocks as block (block.id)}
              <label class="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 p-3 text-sm">
                <span class="flex items-center gap-2">
                  <span class="h-3 w-3 rounded-full" style={`background:${block.color}`}></span>{block.name}
                </span>
                <span class="flex items-center gap-2">
                  <input
                    class="h-8 w-20 rounded border border-white/15 bg-slate-950 px-2 font-mono text-sm"
                    type="number"
                    min="0"
                    step="0.01"
                    value={block.height_rel_creek}
                    onchange={(event) => updateBlockHeight(block.id, event.currentTarget.value)}
                  />
                  m
                </span>
              </label>
            {/each}
          </div>
        </section>
      {:else if dataSource === "CUSTOM"}
        <section class="mb-5">
          <div class="mb-2 flex items-center justify-between">
            <h2 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-300">
              <Database class="h-4 w-4" /> Custom JSON
            </h2>
            <button
              class="inline-flex h-8 items-center gap-2 rounded bg-amber-500 px-3 text-xs font-semibold text-slate-950"
              onclick={copyPrompt}
            >
              <Copy class="h-3.5 w-3.5" /> Prompt
            </button>
          </div>
          <textarea
            class="h-40 w-full resize-none rounded-md border border-white/15 bg-slate-950 p-3 font-mono text-xs text-slate-200"
            bind:value={customJson}
            oninput={(event) => parseCustomJson(event.currentTarget.value)}
            placeholder={customJsonPlaceholder}
          ></textarea>
          {#if jsonError}
            <p class="mt-2 rounded border border-red-400/40 bg-red-500/10 p-2 text-xs text-red-200">{jsonError}</p>
          {/if}
        </section>
      {:else}
        <section class="mb-5">
          <h2 class="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-300">
            <CloudRain class="h-4 w-4" /> Cenarios
          </h2>
          <div class="space-y-2">
            {#each currentScenarios as scenario, index (scenario.id)}
              <button
                class={`w-full rounded-md border p-3 text-left transition ${index === activeScenarioIdx ? "border-sky-400 bg-sky-400/15" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                onclick={() => (activeScenarioIdx = index)}
              >
                <span class="flex items-center justify-between gap-3">
                  <span class="font-semibold">{scenario.year}</span>
                  <span class="font-mono text-xs text-slate-300">{scenario.rain_24h_mm}mm</span>
                </span>
                <span class="mt-1 block truncate text-xs text-slate-300">{scenario.description}</span>
              </button>
            {/each}
          </div>
        </section>
      {/if}

      <section class="mb-5 rounded-md border border-white/10 bg-white/5 p-3">
        <h2 class="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">Nivel d'agua</h2>
        <div class="text-3xl font-semibold">{waterLevel.toFixed(2)}m</div>
        {#if activeScenario}
          <p class="mt-1 text-sm text-slate-300">
            Rua: {activeScenario.level_rel_street.toFixed(2)}m · Casa: {activeScenario.level_rel_house.toFixed(2)}m
          </p>
        {/if}
        {#if waterLevel > 2.7}
          <p class="mt-3 flex items-center gap-2 rounded bg-red-500/15 p-2 text-sm text-red-100">
            <AlertTriangle class="h-4 w-4" /> Agua acima do piso da casa.
          </p>
        {/if}
      </section>

      <section>
        <h2 class="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">Conexoes</h2>
        <div class="grid grid-cols-2 gap-2">
          {#each customBlocks.slice(0, -1) as block, index}
            <button
              class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-left text-xs hover:bg-white/10"
              onclick={() => toggleEdge(index)}
            >
              <span class="block truncate">{block.name}</span>
              <span class="font-semibold text-sky-300">{edgeStates[index] === "RAMP" ? "Rampa" : "Degrau"}</span>
            </button>
          {/each}
        </div>
      </section>
    </aside>
  </div>
