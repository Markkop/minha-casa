import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { colors, type ConnectionType, type ElementHeight } from "./flood-risk-data";

export type FloodRiskSceneDeps = {
  getCanvasHost: () => HTMLDivElement | null;
  getWaterLevel: () => number;
  getCustomBlocks: () => ElementHeight[];
  getEdgeStates: () => Record<number, ConnectionType>;
  onToggleEdge: (index: number) => void;
  trackRebuildDeps: () => void;
  getSceneActive: () => boolean;
};

export function createFloodRiskScene(deps: FloodRiskSceneDeps) {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let worldGroup: THREE.Group;
  let water: THREE.Mesh | null = null;
  let frame = 0;
  let animating = false;

  function initScene() {
    const canvasHost = deps.getCanvasHost();
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

    const customBlocks = deps.getCustomBlocks();
    const edgeStates = deps.getEdgeStates();
    const waterLevel = deps.getWaterLevel();

    worldGroup = new THREE.Group();
    scene.add(worldGroup);
    addLights();
    addGround();
    customBlocks.forEach((block, index) => {
      worldGroup.add(createBlock(block));
      const next = customBlocks[index + 1];
      if (next) worldGroup.add(createConnector(block, next, edgeStates[index] ?? "STEP", index));
    });
    water = createWater(waterLevel);
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
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(from.color).offsetHSL(0, 0, type === "RAMP" ? 0.02 : -0.04),
        roughness: 0.8
      })
    );
    mesh.position.set(centerX, 0, -from.depth / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { connectorIndex: index };
    return mesh;
  }

  function createWater(waterLevel: number) {
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
    if (!animating) return;
    const waterLevel = deps.getWaterLevel();
    if (water) water.position.y += (Math.max(waterLevel, 0.08) - water.position.y) * 0.045;
    controls?.update();
    renderer?.render(scene, camera);
    frame = requestAnimationFrame(animate);
  }

  function resize() {
    const canvasHost = deps.getCanvasHost();
    if (!renderer || !camera || !canvasHost) return;
    camera.aspect = canvasHost.clientWidth / canvasHost.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvasHost.clientWidth, canvasHost.clientHeight);
  }

  function handlePointer(event: PointerEvent) {
    if (!renderer || !camera) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster
      .intersectObjects(worldGroup.children, true)
      .find((item) => typeof item.object.userData.connectorIndex === "number");
    if (hit) deps.onToggleEdge(hit.object.userData.connectorIndex as number);
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

  function initialize() {
    initScene();
    animating = true;
    rebuildWorld();
    animate();
    window.addEventListener("resize", resize);
  }

  function dispose() {
    animating = false;
    window.removeEventListener("resize", resize);
    cancelAnimationFrame(frame);
    renderer?.domElement.removeEventListener("pointerdown", handlePointer);
    controls?.dispose();
    renderer?.dispose();
    deps.getCanvasHost()?.replaceChildren();
  }

  $effect(() => {
    deps.trackRebuildDeps();
    if (deps.getSceneActive()) rebuildWorld();
  });

  return { initialize, dispose };
}
