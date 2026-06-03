import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { colors, type ConnectionType, type ElementHeight } from "$lib/floodrisk/flood-risk-data";
import { FLOOD_PREVIEW_SCENE_CENTER_X } from "$lib/addons/previews/flood-risk-preview-data";

export type FloodPreviewSceneDeps = {
  getHost: () => HTMLDivElement | null;
  getWaterLevel: () => number;
  getBlocks: () => ElementHeight[];
  getEdgeStates: () => Record<number, ConnectionType>;
};

export function createFloodRiskPreviewScene(deps: FloodPreviewSceneDeps) {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let worldGroup: THREE.Group;
  let water: THREE.Mesh | null = null;
  let frame = 0;
  let animating = false;
  let tidePhase = 0;
  const TIDE_AMPLITUDE = 0.035;
  const TIDE_SPEED = 1.1;

  function initScene() {
    const host = deps.getHost();
    if (!host) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color("#dff3ff");
    const { clientWidth, clientHeight } = host;
    camera = new THREE.PerspectiveCamera(40, clientWidth / Math.max(clientHeight, 1), 0.1, 300);
    camera.position.set(14, 7.5, 13);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(clientWidth, clientHeight);
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.target.set(FLOOD_PREVIEW_SCENE_CENTER_X, 1.35, 0);
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 8;
    controls.maxDistance = 32;
    controls.update();
  }

  function rebuildWorld() {
    if (!scene) return;
    if (worldGroup) {
      scene.remove(worldGroup);
      disposeObject(worldGroup);
    }

    const blocks = deps.getBlocks();
    const edgeStates = deps.getEdgeStates();
    const waterLevel = deps.getWaterLevel();

    worldGroup = new THREE.Group();
    scene.add(worldGroup);

    worldGroup.add(new THREE.AmbientLight(0xffffff, 1.15));
    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(-10, 18, 12);
    sun.castShadow = true;
    worldGroup.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 32),
      new THREE.MeshStandardMaterial({ color: colors.ground })
    );
    ground.position.set(FLOOD_PREVIEW_SCENE_CENTER_X + 1.5, -0.02, 0);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    worldGroup.add(ground);

    blocks.forEach((block, index) => {
      worldGroup.add(createBlock(block));
      const next = blocks[index + 1];
      if (!next) return;
      const gap =
        next.x_pos - next.width / 2 - (block.x_pos + block.width / 2);
      if (gap > 0.12) {
        worldGroup.add(createConnector(block, next, edgeStates[index] ?? "STEP"));
      }
    });

    water = createWater(waterLevel);
    worldGroup.add(water);
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

    return group;
  }

  function createHouse(block: ElementHeight) {
    const group = new THREE.Group();
    group.position.y = block.height_rel_creek + 0.08;
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.4, 3),
      new THREE.MeshStandardMaterial({ color: "#f7efe5" })
    );
    base.position.y = 0.7;
    base.castShadow = true;
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(2.5, 1.2, 4),
      new THREE.MeshStandardMaterial({ color: "#9c3f34" })
    );
    roof.position.y = 1.9;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(base, roof);
    return group;
  }

  function createCar(block: ElementHeight) {
    const group = new THREE.Group();
    group.position.set(0, block.height_rel_creek + 0.18, -2.4);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.45, 2.4),
      new THREE.MeshStandardMaterial({ color: "#225ea8" })
    );
    body.position.y = 0.25;
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.45, 1),
      new THREE.MeshStandardMaterial({ color: "#86b7df" })
    );
    top.position.y = 0.7;
    group.add(body, top);
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

  function createWater(waterLevel: number) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 24),
      new THREE.MeshStandardMaterial({
        color: colors.water,
        transparent: true,
        opacity: 0.4,
        roughness: 0.1,
        metalness: 0.05
      })
    );
    mesh.position.set(FLOOD_PREVIEW_SCENE_CENTER_X, Math.max(waterLevel, 0.08), 0);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  function animate() {
    if (!animating) return;
    tidePhase += 0.016 * TIDE_SPEED;
    const baseLevel = Math.max(deps.getWaterLevel(), 0.08);
    const target = baseLevel + Math.sin(tidePhase) * TIDE_AMPLITUDE;
    if (water) water.position.y += (target - water.position.y) * 0.055;
    controls?.update();
    renderer?.render(scene, camera);
    frame = requestAnimationFrame(animate);
  }

  function resize() {
    const host = deps.getHost();
    if (!renderer || !camera || !host) return;
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w < 1 || h < 1) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
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
    controls?.dispose();
    renderer?.dispose();
    deps.getHost()?.replaceChildren();
  }

  function setAnimating(active: boolean) {
    if (active && !animating) {
      animating = true;
      animate();
    } else if (!active) {
      animating = false;
      cancelAnimationFrame(frame);
    }
  }

  function rebuild() {
    rebuildWorld();
  }

  return { initialize, dispose, resize, setAnimating, rebuild };
}
