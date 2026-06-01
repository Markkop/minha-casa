<script lang="ts">
  import { onMount, tick } from "svelte";
  import * as THREE from "three";
  import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
  import { floodSceneColors } from "$lib/theme/colors";

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

  let { waterLevel = 1.9 }: { waterLevel?: number } = $props();

  const demoBlocks: ElementHeight[] = [
    {
      id: "rua",
      name: "Nível Rua",
      height_rel_creek: 2.0,
      x_pos: 2,
      width: 4,
      depth: 10,
      color: floodSceneColors.street
    },
    {
      id: "calcada",
      name: "Calçada",
      height_rel_creek: 2.15,
      x_pos: 4.75,
      width: 1.5,
      depth: 10,
      color: floodSceneColors.sidewalk
    },
    {
      id: "casa",
      name: "Piso Casa",
      height_rel_creek: 2.7,
      x_pos: 8.5,
      width: 6,
      depth: 10,
      color: floodSceneColors.houseGround
    }
  ];

  const edgeStates: Record<number, ConnectionType> = {
    0: "STEP",
    1: "STEP"
  };

  let canvasHost = $state<HTMLDivElement | null>(null);
  let isLoading = $state(true);

  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let worldGroup: THREE.Group;
  let water: THREE.Mesh | null = null;
  let frame = 0;
  let mounted = false;

  onMount(() => {
    let disposed = false;

    void (async () => {
      await tick();
      if (disposed || !canvasHost) return;
      initScene();
      mounted = true;
      isLoading = false;
      rebuildWorld();
      animate();
      window.addEventListener("resize", resize);
    })();

    return () => {
      disposed = true;
      mounted = false;
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frame);
      controls?.dispose();
      renderer?.dispose();
      canvasHost?.replaceChildren();
    };
  });

  $effect(() => {
    if (mounted) rebuildWorld();
  });

  function initScene() {
    if (!canvasHost) return;
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#dff3ff");
    camera = new THREE.PerspectiveCamera(
      40,
      canvasHost.clientWidth / canvasHost.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 8, 12);
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvasHost.clientWidth, canvasHost.clientHeight);
    renderer.shadowMap.enabled = true;
    canvasHost.appendChild(renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(5, 2, 0);
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.update();
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

    demoBlocks.forEach((block, index) => {
      worldGroup.add(createBlock(block));
      const next = demoBlocks[index + 1];
      if (next) {
        worldGroup.add(createConnector(block, next, edgeStates[index] ?? "STEP"));
      }
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
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 60),
      new THREE.MeshStandardMaterial({ color: floodSceneColors.ground })
    );
    mesh.position.set(5, -0.02, 0);
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
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(block.color).offsetHSL(0, 0, 0.12)
      })
    );
    top.position.y = block.height_rel_creek + 0.04;
    top.receiveShadow = true;
    group.add(top);

    if (block.id === "casa") group.add(createHouse(block));
    return group;
  }

  function createConnector(from: ElementHeight, to: ElementHeight, type: ConnectionType) {
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
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(from.color).offsetHSL(0, 0, type === "RAMP" ? 0.02 : -0.04),
        roughness: 0.8
      })
    );
    mesh.position.set(centerX, 0, -from.depth / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function createWater() {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(95, 95),
      new THREE.MeshStandardMaterial({
        color: floodSceneColors.water,
        transparent: true,
        opacity: 0.4,
        roughness: 0.1,
        metalness: 0.05
      })
    );
    mesh.position.set(5, Math.max(waterLevel, 0.08), 0);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  function createHouse(block: ElementHeight) {
    const group = new THREE.Group();
    group.position.y = block.height_rel_creek + 0.08;
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.4, 3),
      new THREE.MeshStandardMaterial({ color: "#f7efe5" })
    );
    base.position.y = 0.7;
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(2.5, 1.2, 4),
      new THREE.MeshStandardMaterial({ color: "#9c3f34" })
    );
    roof.position.y = 1.9;
    roof.rotation.y = Math.PI / 4;
    group.add(base, roof);
    return group;
  }

  function animate() {
    if (!mounted) return;
    if (water) {
      water.position.y += (Math.max(waterLevel, 0.08) - water.position.y) * 0.045;
    }
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

  function disposeObject(object: THREE.Object3D) {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material?.dispose?.();
    });
  }
</script>

<div bind:this={canvasHost} class="relative h-full w-full">
  {#if isLoading}
    <div class="absolute inset-0 flex h-full w-full items-center justify-center bg-app-fg">
      <div class="text-sm text-app-surface-muted">Carregando 3D...</div>
    </div>
  {/if}
</div>
