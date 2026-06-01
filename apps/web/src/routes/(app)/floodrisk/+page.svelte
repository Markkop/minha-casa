<script lang="ts">
  import { onMount } from "svelte";
  import { tick } from "svelte";
  import { AlertTriangle, CloudRain, Copy, Database, Lock, Settings } from "@lucide/svelte";
  import * as THREE from "three";
  import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
  import { addonsApi } from "$lib/addons/client";

  type Scenario = {
    id: string;
    year: number;
    description: string;
    rain_24h_mm: number;
    level_rel_creek: number;
    level_rel_street: number;
    level_rel_house: number;
  };

  type ElementHeight = {
    id: string;
    name: string;
    height_rel_creek: number;
    x_pos: number;
    width: number;
    depth: number;
    color: string;
  };

  type ConnectionType = "STEP" | "RAMP";
  type DataSourceType = "CHATGPT" | "GEMINI" | "CUSTOM" | "CONFIGURE";

  const colors = {
    creek: "#4f7ec7",
    slope: "#7a8f5b",
    street: "#6b7280",
    sidewalk: "#b8c0cc",
    garage: "#c7a36a",
    houseGround: "#d8b38c",
    garden: "#5d9f61",
    water: "#3b82f6",
    ground: "#5b4636"
  };

  const defaultBlocks: ElementHeight[] = [
    { id: "leito", name: "Leito Corrego", height_rel_creek: 0.1, x_pos: 0, width: 4, depth: 10, color: colors.creek },
    { id: "talude", name: "Talude", height_rel_creek: 1.2, x_pos: 2.75, width: 1.5, depth: 10, color: colors.slope },
    { id: "rua", name: "Nivel Rua", height_rel_creek: 2, x_pos: 5.5, width: 4, depth: 10, color: colors.street },
    { id: "calcada", name: "Calcada", height_rel_creek: 2.15, x_pos: 9, width: 3, depth: 10, color: colors.sidewalk },
    { id: "garagem", name: "Piso Garagem", height_rel_creek: 2.4, x_pos: 12, width: 3, depth: 10, color: colors.garage },
    { id: "casa", name: "Piso Casa", height_rel_creek: 2.7, x_pos: 16.5, width: 6, depth: 10, color: colors.houseGround },
    { id: "quintal", name: "Quintal", height_rel_creek: 2.5, x_pos: 21.5, width: 4, depth: 10, color: colors.garden }
  ];

  const scenariosChatGpt: Scenario[] = [
    { id: "S0_no_rain", year: 2005, description: "Referencia seco", rain_24h_mm: 0, level_rel_creek: 0.3, level_rel_street: -1.7, level_rel_house: -2.4 },
    { id: "S2_2023_like", year: 2023, description: "Evento intenso atual", rain_24h_mm: 185, level_rel_creek: 2.3, level_rel_street: 0.3, level_rel_house: -0.4 },
    { id: "S_2030", year: 2030, description: "Projecao 2030", rain_24h_mm: 195, level_rel_creek: 2.5, level_rel_street: 0.5, level_rel_house: -0.2 },
    { id: "S_2040", year: 2040, description: "Projecao 2040", rain_24h_mm: 210, level_rel_creek: 2.75, level_rel_street: 0.75, level_rel_house: 0.05 },
    { id: "S4_2050_mod", year: 2050, description: "Projecao 2050", rain_24h_mm: 220, level_rel_creek: 3, level_rel_street: 1, level_rel_house: 0.3 },
    { id: "S_2075", year: 2075, description: "Projecao 2075", rain_24h_mm: 230, level_rel_creek: 3.1, level_rel_street: 1.1, level_rel_house: 0.4 },
    { id: "S5_2100_high", year: 2100, description: "Projecao 2100 alto", rain_24h_mm: 240, level_rel_creek: 3.2, level_rel_street: 1.2, level_rel_house: 0.5 }
  ];

  const scenariosGemini: Scenario[] = [
    { id: "G0_media_inverno", year: 2022, description: "Referencia seco", rain_24h_mm: 0, level_rel_creek: 0.4, level_rel_street: -1.6, level_rel_house: -2.3 },
    { id: "G2_nov_2023", year: 2023, description: "Evento Sta. Monica", rain_24h_mm: 185, level_rel_creek: 2.45, level_rel_street: 0.45, level_rel_house: -0.25 },
    { id: "G3_2030", year: 2030, description: "Tendencia +30%", rain_24h_mm: 240, level_rel_creek: 2.85, level_rel_street: 0.85, level_rel_house: 0.15 },
    { id: "G_2040", year: 2040, description: "Projecao 2040", rain_24h_mm: 245, level_rel_creek: 2.95, level_rel_street: 0.95, level_rel_house: 0.25 },
    { id: "G_2050", year: 2050, description: "Projecao 2050", rain_24h_mm: 250, level_rel_creek: 3.05, level_rel_street: 1.05, level_rel_house: 0.35 },
    { id: "G_2075", year: 2075, description: "Projecao 2075", rain_24h_mm: 255, level_rel_creek: 3.28, level_rel_street: 1.28, level_rel_house: 0.58 },
    { id: "G4_mar_2100", year: 2100, description: "Projecao 2100", rain_24h_mm: 260, level_rel_creek: 3.5, level_rel_street: 1.5, level_rel_house: 0.8 }
  ];

  const customJsonPlaceholder = '{"scenarios":[...],"blocks":{"rua":2.1}}';

  let canvasHost = $state<HTMLDivElement | null>(null);
  let dataSource = $state<DataSourceType>("CHATGPT");
  let activeScenarioIdx = $state(0);
  let customBlocks = $state<ElementHeight[]>(defaultBlocks.map((block) => ({ ...block })));
  let customJson = $state("");
  let customScenarios = $state<Scenario[]>([]);
  let jsonError = $state("");
  let edgeStates = $state<Record<number, ConnectionType>>({ 0: "RAMP", 1: "RAMP", 2: "STEP", 3: "RAMP", 4: "STEP", 5: "STEP" });
  let accessLoading = $state(true);
  let hasFloodAccess = $state(false);
  let accessError = $state("");

  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let worldGroup: THREE.Group;
  let water: THREE.Mesh | null = null;
  let frame = 0;
  let mounted = false;

  const currentScenarios = $derived(dataSource === "CHATGPT" ? scenariosChatGpt : dataSource === "GEMINI" ? scenariosGemini : dataSource === "CUSTOM" ? customScenarios : []);
  const activeScenario = $derived(currentScenarios[activeScenarioIdx] ?? null);
  const waterLevel = $derived(dataSource === "CONFIGURE" ? 0.3 : activeScenario?.level_rel_creek ?? 0.3);

  onMount(() => {
    let disposed = false;

    void (async () => {
      try {
        const access = await addonsApi.fetchAccess("flood");
        if (disposed) return;
        hasFloodAccess = access.hasAccess;
      } catch (error) {
        if (disposed) return;
        accessError = error instanceof Error ? error.message : "Erro ao verificar acesso";
      } finally {
        if (!disposed) accessLoading = false;
      }

      if (disposed || !hasFloodAccess) return;
      await tick();
      if (disposed) return;

    initScene();
    mounted = true;
    rebuildWorld();
    animate();
    window.addEventListener("resize", resize);
    })();

    return () => {
      disposed = true;
      mounted = false;
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frame);
      renderer?.domElement.removeEventListener("pointerdown", handlePointer);
      controls?.dispose();
      renderer?.dispose();
      canvasHost?.replaceChildren();
    };
  });

  $effect(() => {
    dataSource;
    activeScenarioIdx;
    customBlocks;
    edgeStates;
    customScenarios;
    if (mounted && hasFloodAccess) rebuildWorld();
  });

  function initScene() {
    if (!canvasHost) return;
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#dff3ff");
    camera = new THREE.PerspectiveCamera(40, canvasHost.clientWidth / canvasHost.clientHeight, 0.1, 1000);
    camera.position.set(24, 9, 22);
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvasHost.clientWidth, canvasHost.clientHeight);
    renderer.shadowMap.enabled = true;
    canvasHost.appendChild(renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(11, 1.4, 0);
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.maxDistance = 70;
    controls.update();
    renderer.domElement.addEventListener("pointerdown", handlePointer);
  }

  function rebuildWorld() {
    if (!scene) return;
    if (worldGroup) {
      scene.remove(worldGroup);
      disposeObject(worldGroup);
    }

    worldGroup = new THREE.Group();
    scene.add(worldGroup);
    addLights();
    addGround();
    customBlocks.forEach((block, index) => {
      worldGroup.add(createBlock(block));
      const next = customBlocks[index + 1];
      if (next) worldGroup.add(createConnector(block, next, edgeStates[index] ?? "STEP", index));
    });
    water = createWater();
    worldGroup.add(water);
  }

  function addLights() {
    worldGroup.add(new THREE.AmbientLight(0xffffff, 1.15));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-10, 20, 12);
    sun.castShadow = true;
    worldGroup.add(sun);
  }

  function addGround() {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(90, 60), new THREE.MeshStandardMaterial({ color: colors.ground }));
    mesh.position.set(12, -0.02, 0);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    worldGroup.add(mesh);
  }

  function createBlock(block: ElementHeight) {
    const group = new THREE.Group();
    group.position.set(block.x_pos, 0, 0);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(block.width, block.height_rel_creek, block.depth),
      new THREE.MeshStandardMaterial({ color: block.color, roughness: 0.8 })
    );
    body.position.y = block.height_rel_creek / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(block.width * 0.96, 0.04, block.depth * 0.96),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(block.color).offsetHSL(0, 0, 0.12) })
    );
    top.position.y = block.height_rel_creek + 0.04;
    top.receiveShadow = true;
    group.add(top);

    if (block.id === "casa") group.add(createHouse(block));
    if (block.id === "garagem") group.add(createCar(block));
    group.add(createLabel(`${block.name}\n${block.height_rel_creek.toFixed(2)}m`, block.height_rel_creek + 0.9));

    return group;
  }

  function createConnector(from: ElementHeight, to: ElementHeight, type: ConnectionType, index: number) {
    const gap = to.x_pos - from.x_pos - from.width / 2 - to.width / 2;
    const centerX = from.x_pos + from.width / 2 + gap / 2;
    const half = Math.max(gap / 2, 0.05);
    const shape = new THREE.Shape();
    shape.moveTo(-half, 0);
    shape.lineTo(-half, from.height_rel_creek);
    if (type === "RAMP") {
      shape.lineTo(half, to.height_rel_creek);
    } else {
      shape.lineTo(half, from.height_rel_creek);
      shape.lineTo(half, to.height_rel_creek);
    }
    shape.lineTo(half, 0);
    shape.lineTo(-half, 0);

    const mesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: from.depth, bevelEnabled: false }),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(from.color).offsetHSL(0, 0, type === "RAMP" ? 0.02 : -0.04), roughness: 0.8 })
    );
    mesh.position.set(centerX, 0, -from.depth / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { connectorIndex: index };
    return mesh;
  }

  function createWater() {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(95, 95),
      new THREE.MeshStandardMaterial({ color: colors.water, transparent: true, opacity: 0.4, roughness: 0.1, metalness: 0.05 })
    );
    mesh.position.set(12, Math.max(waterLevel, 0.08), 0);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  function createHouse(block: ElementHeight) {
    const group = new THREE.Group();
    group.position.y = block.height_rel_creek + 0.08;
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 3), new THREE.MeshStandardMaterial({ color: "#f7efe5" }));
    base.position.y = 0.7;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.2, 4), new THREE.MeshStandardMaterial({ color: "#9c3f34" }));
    roof.position.y = 1.9;
    roof.rotation.y = Math.PI / 4;
    group.add(base, roof);
    return group;
  }

  function createCar(block: ElementHeight) {
    const group = new THREE.Group();
    group.position.set(0, block.height_rel_creek + 0.18, -2.4);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 2.4), new THREE.MeshStandardMaterial({ color: "#225ea8" }));
    body.position.y = 0.25;
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 1), new THREE.MeshStandardMaterial({ color: "#86b7df" }));
    top.position.y = 0.7;
    group.add(body, top);
    return group;
  }

  function createLabel(text: string, y: number) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 192;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "rgba(255,255,255,0.86)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#111827";
      ctx.font = "42px Inter, sans-serif";
      ctx.textAlign = "center";
      text.split("\n").forEach((line, index) => ctx.fillText(line, canvas.width / 2, 68 + index * 54));
    }
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
    sprite.position.set(0, y, 0);
    sprite.scale.set(2.6, 1, 1);
    return sprite;
  }

  function animate() {
    if (!mounted) return;
    if (water) water.position.y += (Math.max(waterLevel, 0.08) - water.position.y) * 0.045;
    controls?.update();
    renderer?.render(scene, camera);
    frame = requestAnimationFrame(animate);
  }

  function resize() {
    if (!renderer || !camera || !canvasHost) return;
    camera.aspect = canvasHost.clientWidth / canvasHost.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvasHost.clientWidth, canvasHost.clientHeight);
  }

  function handlePointer(event: PointerEvent) {
    if (!renderer || !camera) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1));
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(worldGroup.children, true).find((item) => typeof item.object.userData.connectorIndex === "number");
    if (hit) toggleEdge(hit.object.userData.connectorIndex as number);
  }

  function disposeObject(object: THREE.Object3D) {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material?.dispose?.();
    });
  }

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
        ? parsed.scenarios.filter((scenario) =>
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

<svelte:head><title>Floodrisk | Minha Casa</title></svelte:head>

{#if accessLoading}
  <div class="flex min-h-screen items-center justify-center bg-app-bg px-4 text-app-fg">
    <div class="rounded-md border border-app-border bg-app-surface p-6 text-center text-sm text-app-muted">Verificando acesso ao Floodrisk...</div>
  </div>
{:else if !hasFloodAccess}
  <div class="flex min-h-screen items-center justify-center bg-app-bg px-4 text-app-fg">
    <section class="max-w-lg rounded-md border border-app-border bg-app-surface p-6 text-center">
      <Lock class="mx-auto h-10 w-10 text-app-muted" />
      <h1 class="mt-4 text-2xl font-semibold">Acesso Restrito</h1>
      <p class="mt-2 text-sm leading-6 text-app-muted">
        O acesso ao Risco de Enchente requer o addon flood na sua conta pessoal ou na organizacao ativa.
      </p>
      {#if accessError}
        <p class="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">{accessError}</p>
      {/if}
      <div class="mt-5 flex flex-wrap justify-center gap-2">
        <a class="rounded-md bg-app-fg px-4 py-2 text-sm font-medium text-white" href="/subscribe">Ver assinatura</a>
        <a class="rounded-md border border-app-border bg-white px-4 py-2 text-sm font-medium text-app-fg" href="/organizacoes">Organizacoes</a>
      </div>
    </section>
  </div>
{:else}
<div class="flex h-[calc(100vh-3.5rem)] min-h-[680px] flex-col bg-[#101820] text-white md:h-screen md:flex-row">
  <div bind:this={canvasHost} class="order-2 min-h-[420px] flex-1 md:order-1 md:min-h-0"></div>

  <aside class="order-1 max-h-[48vh] w-full overflow-y-auto border-b border-white/15 bg-[#17212d] p-4 shadow-2xl md:order-2 md:max-h-none md:w-[420px] md:border-b-0 md:border-l">
    <div class="mb-5">
      <h1 class="text-lg font-semibold">Floodrisk</h1>
      <p class="mt-1 text-sm text-slate-300">Visualizacao 3D de cotas, conexoes e nivel d'agua relativo ao corrego.</p>
    </div>

    <div class="mb-5">
      <h2 class="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-300"><Database class="h-4 w-4" /> Fonte de dados</h2>
      <div class="grid grid-cols-4 gap-1 rounded-md bg-black/25 p-1">
        {#each ["CHATGPT", "GEMINI", "CUSTOM", "CONFIGURE"] as source}
          <button class={`rounded px-2 py-2 text-xs font-semibold ${dataSource === source ? "bg-sky-500 text-slate-950" : "text-slate-300 hover:bg-white/10"}`} onclick={() => setDataSource(source as DataSourceType)}>
            {source === "CONFIGURE" ? "Config" : source}
          </button>
        {/each}
      </div>
    </div>

    {#if dataSource === "CONFIGURE"}
      <section class="mb-5">
        <h2 class="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-300"><Settings class="h-4 w-4" /> Cotas dos blocos</h2>
        <div class="space-y-2">
          {#each customBlocks as block (block.id)}
            <label class="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 p-3 text-sm">
              <span class="flex items-center gap-2"><span class="h-3 w-3 rounded-full" style={`background:${block.color}`}></span>{block.name}</span>
              <span class="flex items-center gap-2">
                <input class="h-8 w-20 rounded border border-white/15 bg-slate-950 px-2 font-mono text-sm" type="number" min="0" step="0.01" value={block.height_rel_creek} onchange={(event) => updateBlockHeight(block.id, event.currentTarget.value)} />
                m
              </span>
            </label>
          {/each}
        </div>
      </section>
    {:else if dataSource === "CUSTOM"}
      <section class="mb-5">
        <div class="mb-2 flex items-center justify-between">
          <h2 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-300"><Database class="h-4 w-4" /> Custom JSON</h2>
          <button class="inline-flex h-8 items-center gap-2 rounded bg-amber-500 px-3 text-xs font-semibold text-slate-950" onclick={copyPrompt}><Copy class="h-3.5 w-3.5" /> Prompt</button>
        </div>
        <textarea class="h-40 w-full resize-none rounded-md border border-white/15 bg-slate-950 p-3 font-mono text-xs text-slate-200" bind:value={customJson} oninput={(event) => parseCustomJson(event.currentTarget.value)} placeholder={customJsonPlaceholder}></textarea>
        {#if jsonError}<p class="mt-2 rounded border border-red-400/40 bg-red-500/10 p-2 text-xs text-red-200">{jsonError}</p>{/if}
      </section>
    {:else}
      <section class="mb-5">
        <h2 class="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-300"><CloudRain class="h-4 w-4" /> Cenarios</h2>
        <div class="space-y-2">
          {#each currentScenarios as scenario, index (scenario.id)}
            <button class={`w-full rounded-md border p-3 text-left transition ${index === activeScenarioIdx ? "border-sky-400 bg-sky-400/15" : "border-white/10 bg-white/5 hover:bg-white/10"}`} onclick={() => (activeScenarioIdx = index)}>
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
        <p class="mt-1 text-sm text-slate-300">Rua: {activeScenario.level_rel_street.toFixed(2)}m · Casa: {activeScenario.level_rel_house.toFixed(2)}m</p>
      {/if}
      {#if waterLevel > 2.7}
        <p class="mt-3 flex items-center gap-2 rounded bg-red-500/15 p-2 text-sm text-red-100"><AlertTriangle class="h-4 w-4" /> Agua acima do piso da casa.</p>
      {/if}
    </section>

    <section>
      <h2 class="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">Conexoes</h2>
      <div class="grid grid-cols-2 gap-2">
        {#each customBlocks.slice(0, -1) as block, index}
          <button class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-left text-xs hover:bg-white/10" onclick={() => toggleEdge(index)}>
            <span class="block truncate">{block.name}</span>
            <span class="font-semibold text-sky-300">{edgeStates[index] === "RAMP" ? "Rampa" : "Degrau"}</span>
          </button>
        {/each}
      </div>
    </section>
  </aside>
</div>
{/if}
