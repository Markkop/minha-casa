import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { GeoCoordinate, NeighborhoodPayload } from "$lib/neighborhood/types";
import type { ProjectedMarker, PropertyMarker, SceneMode } from "$lib/neighborhood/scene-data";

const WORLD_RADIUS = 700;
const MAX_BUILDINGS = 520;
const MAX_ROADS = 180;
const TILTED_POSITION = new THREE.Vector3(0, 650, 760);
const TOP_DOWN_POSITION = new THREE.Vector3(0, 980, 0.1);
const CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

type MarkerAnchor = {
  marker: PropertyMarker;
  anchor: THREE.Object3D;
  pulse: THREE.Mesh;
  phase: number;
};

type CameraTransition = {
  startedAt: number;
  duration: number;
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
};

export interface NeighborhoodSceneControllerOptions {
  data: NeighborhoodPayload;
  markers: PropertyMarker[];
  mode?: SceneMode;
  reducedMotion?: boolean;
  onMarkerPositions?: (markers: ProjectedMarker[]) => void;
}

function projectToWorld(point: GeoCoordinate, center: GeoCoordinate) {
  const latitudeRadians = (center.lat * Math.PI) / 180;
  return new THREE.Vector3(
    (point.lng - center.lng) * 111_320 * Math.cos(latitudeRadians),
    0,
    -(point.lat - center.lat) * 111_320
  );
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function makeShape(points: GeoCoordinate[], center: GeoCoordinate) {
  if (points.length < 3) return null;
  const first = projectToWorld(points[0], center);
  const shape = new THREE.Shape();
  shape.moveTo(first.x, -first.z);
  for (let index = 1; index < points.length; index += 1) {
    const point = projectToWorld(points[index], center);
    shape.lineTo(point.x, -point.z);
  }
  shape.closePath();
  return shape;
}

function disposeMaterial(material: THREE.Material) {
  const values = Object.values(material) as unknown[];
  for (const value of values) {
    if (value instanceof THREE.Texture) value.dispose();
  }
  material.dispose();
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    if (Array.isArray(mesh.material)) mesh.material.forEach(disposeMaterial);
    else if (mesh.material) disposeMaterial(mesh.material);
  });
}

export class NeighborhoodSceneController {
  private readonly host: HTMLElement;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly resizeObserver: ResizeObserver;
  private readonly clock = new THREE.Clock();
  private readonly markerPositionCallback?: (markers: ProjectedMarker[]) => void;
  private readonly handleVisibilityChange = () => this.onVisibilityChange();
  private readonly handleContextLost = (event: Event) => event.preventDefault();

  private data: NeighborhoodPayload;
  private world = new THREE.Group();
  private markerAnchors: MarkerAnchor[] = [];
  private animationFrame = 0;
  private cameraTransition: CameraTransition | null = null;
  private disposed = false;
  private visible = true;
  private reducedMotion: boolean;
  private mode: SceneMode;
  private worldIntro = 1;
  private lastMarkerSignature = "";

  constructor(host: HTMLElement, options: NeighborhoodSceneControllerOptions) {
    this.host = host;
    this.data = options.data;
    this.mode = options.mode ?? "3d";
    this.reducedMotion = options.reducedMotion ?? false;
    this.markerPositionCallback = options.onMarkerPositions;

    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    this.camera = new THREE.PerspectiveCamera(42, width / height, 1, 4_500);
    this.camera.position.copy(this.mode === "2d" ? TOP_DOWN_POSITION : TILTED_POSITION);

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    this.renderer.setSize(width, height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color("#050b22");
    this.scene.fog = new THREE.FogExp2("#07102c", 0.00082);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(CAMERA_TARGET);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 170;
    this.controls.maxDistance = 1_450;
    this.controls.minPolarAngle = 0.015;
    this.controls.maxPolarAngle = Math.PI * 0.47;
    this.controls.panSpeed = 0.72;
    this.controls.rotateSpeed = 0.48;
    this.controls.zoomSpeed = 0.78;
    this.controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    this.controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
    this.controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    this.controls.touches.ONE = THREE.TOUCH.PAN;
    this.controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    this.addAtmosphere();
    this.setData(options.data, options.markers, false);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.renderer.domElement.addEventListener("webglcontextlost", this.handleContextLost);
    this.animate();
  }

  setReducedMotion(reducedMotion: boolean) {
    this.reducedMotion = reducedMotion;
  }

  setData(data: NeighborhoodPayload, markers: PropertyMarker[], animate = true) {
    this.data = data;
    this.scene.remove(this.world);
    disposeObject(this.world);
    this.world = new THREE.Group();
    this.world.name = "neighborhood-world";
    this.scene.add(this.world);
    this.addGround();
    this.addAreas();
    this.addRoads();
    this.addBuildings();
    this.addBoundaries();
    this.addPropertyMarkers(markers);
    this.worldIntro = animate && !this.reducedMotion ? 0 : 1;
    this.world.scale.setScalar(this.worldIntro > 0 ? 1 : 0.965);
    this.world.position.y = this.worldIntro > 0 ? 0 : -8;
    this.lastMarkerSignature = "";
  }

  setMarkers(markers: PropertyMarker[]) {
    const oldMarkers = this.world.getObjectByName("property-markers");
    if (oldMarkers) {
      this.world.remove(oldMarkers);
      disposeObject(oldMarkers);
    }
    this.addPropertyMarkers(markers);
    this.lastMarkerSignature = "";
  }

  setMode(mode: SceneMode) {
    if (this.mode === mode && !this.cameraTransition) return;
    this.mode = mode;
    this.transitionCamera(mode === "2d" ? TOP_DOWN_POSITION : TILTED_POSITION, CAMERA_TARGET);
  }

  zoomIn() {
    this.zoomBy(0.78);
  }

  zoomOut() {
    this.zoomBy(1.28);
  }

  resetView() {
    this.transitionCamera(this.mode === "2d" ? TOP_DOWN_POSITION : TILTED_POSITION, CAMERA_TARGET);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.renderer.domElement.removeEventListener("webglcontextlost", this.handleContextLost);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.scene.remove(this.world);
    disposeObject(this.world);
    this.scene.traverse((object) => {
      if (object !== this.world) {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) mesh.material.forEach(disposeMaterial);
        else if (mesh.material) disposeMaterial(mesh.material);
      }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  private addAtmosphere() {
    this.scene.add(new THREE.HemisphereLight("#81a7ff", "#020617", 2.15));
    const key = new THREE.DirectionalLight("#9eb9ff", 3.8);
    key.position.set(-430, 850, 380);
    key.castShadow = true;
    key.shadow.mapSize.set(1_024, 1_024);
    key.shadow.camera.left = -850;
    key.shadow.camera.right = 850;
    key.shadow.camera.top = 850;
    key.shadow.camera.bottom = -850;
    key.shadow.bias = -0.0008;
    this.scene.add(key);

    const rim = new THREE.PointLight("#236cff", 42_000, 1_600, 1.4);
    rim.position.set(480, 260, -460);
    this.scene.add(rim);

    const warm = new THREE.PointLight("#ffd33d", 18_000, 950, 1.7);
    warm.position.set(-430, 140, 280);
    this.scene.add(warm);
  }

  private addGround() {
    const base = new THREE.Mesh(
      new THREE.CircleGeometry(1_080, 80),
      new THREE.MeshStandardMaterial({
        color: "#081634",
        roughness: 0.88,
        metalness: 0.08
      })
    );
    base.name = "ground";
    base.rotation.x = -Math.PI / 2;
    base.position.y = -1;
    base.receiveShadow = true;
    this.world.add(base);

    const grid = new THREE.GridHelper(2_200, 44, "#23529b", "#132b5c");
    grid.position.y = 0;
    const material = grid.material as THREE.LineBasicMaterial;
    material.transparent = true;
    material.opacity = 0.19;
    material.depthWrite = false;
    this.world.add(grid);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(WORLD_RADIUS * 0.98, WORLD_RADIUS, 120),
      new THREE.MeshBasicMaterial({
        color: "#2e72ff",
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 1;
    this.world.add(halo);
  }

  private addAreas() {
    const byType = new Map<string, THREE.BufferGeometry[]>();
    for (const area of this.data.areas.slice(0, 120)) {
      const shape = makeShape(area.polygon, this.data.center);
      if (!shape) continue;
      const geometry = new THREE.ShapeGeometry(shape);
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, 0.4, 0);
      const geometries = byType.get(area.type) ?? [];
      geometries.push(geometry);
      byType.set(area.type, geometries);
    }

    const palette: Record<string, { color: string; opacity: number; emissive: string }> = {
      water: { color: "#0b4b82", opacity: 0.72, emissive: "#07355f" },
      park: { color: "#174a42", opacity: 0.64, emissive: "#0c312b" },
      green: { color: "#143d3b", opacity: 0.58, emissive: "#0b2928" }
    };
    for (const [type, geometries] of byType) {
      const merged = mergeGeometries(geometries, false);
      geometries.forEach((geometry) => geometry.dispose());
      if (!merged) continue;
      const colors = palette[type] ?? palette.green;
      const mesh = new THREE.Mesh(
        merged,
        new THREE.MeshStandardMaterial({
          color: colors.color,
          emissive: colors.emissive,
          emissiveIntensity: 0.42,
          transparent: true,
          opacity: colors.opacity,
          roughness: type === "water" ? 0.24 : 0.92,
          metalness: type === "water" ? 0.38 : 0.02,
          side: THREE.DoubleSide
        })
      );
      mesh.receiveShadow = true;
      this.world.add(mesh);
    }
  }

  private addRoads() {
    const roadGeometries: THREE.BufferGeometry[] = [];
    for (const road of this.data.roads.slice(0, MAX_ROADS)) {
      const points = road.path
        .map((point) => projectToWorld(point, this.data.center))
        .filter((point) => Math.hypot(point.x, point.z) < WORLD_RADIUS * 1.35);
      if (points.length < 2) continue;
      points.forEach((point) => (point.y = 1.25));
      const major = /primary|secondary|tertiary|trunk/.test(road.class);
      const radius = major ? 3.4 : /residential|living/.test(road.class) ? 2.1 : 1.35;
      const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
      roadGeometries.push(
        new THREE.TubeGeometry(curve, Math.min(Math.max(points.length * 2, 3), 26), radius, 4, false)
      );
    }
    if (roadGeometries.length === 0) return;
    const merged = mergeGeometries(roadGeometries, false);
    roadGeometries.forEach((geometry) => geometry.dispose());
    if (!merged) return;
    const roads = new THREE.Mesh(
      merged,
      new THREE.MeshStandardMaterial({
        color: "#3974b8",
        emissive: "#174e91",
        emissiveIntensity: 1.15,
        roughness: 0.52,
        metalness: 0.18
      })
    );
    roads.name = "roads";
    roads.receiveShadow = true;
    this.world.add(roads);
  }

  private addBuildings() {
    const geometries: THREE.BufferGeometry[] = [];
    for (const building of this.data.buildings.slice(0, MAX_BUILDINGS)) {
      const shape = makeShape(building.polygon, this.data.center);
      if (!shape) continue;
      const height = THREE.MathUtils.clamp(building.height || 14, 5, 120);
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: height,
        bevelEnabled: true,
        bevelSize: 0.45,
        bevelThickness: 0.45,
        bevelSegments: 1
      });
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, 1.3, 0);
      geometries.push(geometry);
    }
    if (geometries.length === 0) return;
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) return;
    merged.computeVertexNormals();
    const buildings = new THREE.Mesh(
      merged,
      new THREE.MeshStandardMaterial({
        color: "#254d7f",
        emissive: "#0c244b",
        emissiveIntensity: 0.52,
        roughness: 0.58,
        metalness: 0.3
      })
    );
    buildings.name = "buildings";
    buildings.castShadow = true;
    buildings.receiveShadow = true;
    this.world.add(buildings);
  }

  private addBoundaries() {
    for (const boundary of this.data.boundaries.slice(0, 8)) {
      const points = boundary.path.map((point) => {
        const projected = projectToWorld(point, this.data.center);
        projected.y = 4.2;
        return projected;
      });
      if (points.length < 2) continue;
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineDashedMaterial({
        color: "#ffd531",
        dashSize: 13,
        gapSize: 8,
        transparent: true,
        opacity: 0.82,
        depthWrite: false
      });
      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();
      line.renderOrder = 4;
      this.world.add(line);
    }
  }

  private addPropertyMarkers(markers: PropertyMarker[]) {
    const markerGroup = new THREE.Group();
    markerGroup.name = "property-markers";
    this.markerAnchors = [];

    markers.forEach((marker, index) => {
      const point = projectToWorld(marker.position, this.data.center);
      const group = new THREE.Group();
      group.position.set(point.x, 3, point.z);

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.75, 25, 8),
        new THREE.MeshBasicMaterial({ color: "#ffd633", transparent: true, opacity: 0.74 })
      );
      stem.position.y = 12.5;
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(5.3, 16, 12),
        new THREE.MeshStandardMaterial({
          color: "#ffe45e",
          emissive: "#ffbd17",
          emissiveIntensity: 2.5,
          roughness: 0.22
        })
      );
      core.position.y = 27;
      const pulse = new THREE.Mesh(
        new THREE.RingGeometry(8, 10.5, 32),
        new THREE.MeshBasicMaterial({
          color: "#ffd633",
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      pulse.rotation.x = -Math.PI / 2;
      pulse.position.y = 2;
      group.add(stem, core, pulse);
      markerGroup.add(group);

      const anchor = new THREE.Object3D();
      anchor.position.set(0, 39, 0);
      group.add(anchor);
      this.markerAnchors.push({ marker, anchor, pulse, phase: index * 0.73 });
    });
    this.world.add(markerGroup);
  }

  private zoomBy(scale: number) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const nextDistance = THREE.MathUtils.clamp(
      offset.length() * scale,
      this.controls.minDistance,
      this.controls.maxDistance
    );
    offset.setLength(nextDistance);
    this.transitionCamera(this.controls.target.clone().add(offset), this.controls.target);
  }

  private transitionCamera(position: THREE.Vector3, target: THREE.Vector3) {
    if (this.reducedMotion) {
      this.camera.position.copy(position);
      this.controls.target.copy(target);
      this.controls.update();
      return;
    }
    this.cameraTransition = {
      startedAt: performance.now(),
      duration: 720,
      fromPosition: this.camera.position.clone(),
      toPosition: position.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: target.clone()
    };
    this.controls.enabled = false;
  }

  private updateCameraTransition(now: number) {
    if (!this.cameraTransition) return;
    const transition = this.cameraTransition;
    const progress = THREE.MathUtils.clamp(
      (now - transition.startedAt) / transition.duration,
      0,
      1
    );
    const eased = easeInOutCubic(progress);
    this.camera.position.lerpVectors(transition.fromPosition, transition.toPosition, eased);
    this.controls.target.lerpVectors(transition.fromTarget, transition.toTarget, eased);
    if (progress >= 1) {
      this.cameraTransition = null;
      this.controls.enabled = true;
    }
  }

  private projectMarkers(elapsed: number) {
    if (!this.markerPositionCallback) return;
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    const projected = this.markerAnchors.map(({ marker, anchor, pulse, phase }) => {
      if (!this.reducedMotion) {
        const wave = (Math.sin(elapsed * 2.25 + phase) + 1) / 2;
        pulse.scale.setScalar(0.9 + wave * 0.62);
        (pulse.material as THREE.MeshBasicMaterial).opacity = 0.48 - wave * 0.32;
      }
      const world = anchor.getWorldPosition(new THREE.Vector3());
      const cameraSpace = world.clone().applyMatrix4(this.camera.matrixWorldInverse);
      const ndc = world.project(this.camera);
      return {
        id: marker.id,
        x: (ndc.x * 0.5 + 0.5) * width,
        y: (-ndc.y * 0.5 + 0.5) * height,
        visible:
          cameraSpace.z < 0 &&
          ndc.z > -1 &&
          ndc.z < 1 &&
          ndc.x > -1.08 &&
          ndc.x < 1.08 &&
          ndc.y > -1.08 &&
          ndc.y < 1.08
      };
    });
    const signature = projected
      .map((marker) => `${marker.id}:${Math.round(marker.x)}:${Math.round(marker.y)}:${marker.visible}`)
      .join("|");
    if (signature !== this.lastMarkerSignature) {
      this.lastMarkerSignature = signature;
      this.markerPositionCallback(projected);
    }
  }

  private animate = () => {
    if (this.disposed || !this.visible) return;
    this.animationFrame = requestAnimationFrame(this.animate);
    const now = performance.now();
    const elapsed = this.clock.getElapsedTime();
    this.updateCameraTransition(now);
    this.controls.update();

    if (this.worldIntro < 1) {
      this.worldIntro = Math.min(this.worldIntro + 0.04, 1);
      const eased = 1 - Math.pow(1 - this.worldIntro, 3);
      this.world.scale.setScalar(THREE.MathUtils.lerp(0.965, 1, eased));
      this.world.position.y = THREE.MathUtils.lerp(-8, 0, eased);
    }
    this.projectMarkers(elapsed);
    this.renderer.render(this.scene, this.camera);
  };

  private resize() {
    const width = Math.max(this.host.clientWidth, 1);
    const height = Math.max(this.host.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    this.renderer.setSize(width, height, false);
    this.lastMarkerSignature = "";
  }

  private onVisibilityChange() {
    this.visible = document.visibilityState !== "hidden";
    if (this.visible && !this.disposed) {
      this.clock.getDelta();
      this.animate();
    } else {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}
