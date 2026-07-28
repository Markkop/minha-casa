<script lang="ts">
  import { onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { Grid3X3, Layers, PanelLeft, PanelRight, Trash2 } from "@lucide/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import WorkspacePage from "$lib/components/workspace/WorkspacePage.svelte";
  import { formatApiError } from "$lib/api/error-message";
  import { ApiError } from "$lib/api/client";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { workspaceApi } from "$lib/workspace/client";
  import { getWorkspaceProfilesContext } from "$lib/workspace/workspace-profiles-context.svelte";
  import { cn } from "$lib/utils";
  import { resizePlantaFile } from "$lib/components/planta/planta-image";
  import {
    captureCanvasSnapshot,
    popUndoStack,
    pushUndoStack,
    snapshotsEqual,
    type PlantaCanvasSnapshot
  } from "$lib/components/planta/history";
  import { snapShape } from "$lib/components/planta/snap";
  import PlantaCanvas from "$lib/components/planta/PlantaCanvas.svelte";
  import PlantaToolbar from "$lib/components/planta/PlantaToolbar.svelte";
  import PlantaImageDialog from "$lib/components/planta/PlantaImageDialog.svelte";
  import PlantaDesignPanel from "$lib/components/planta/PlantaDesignPanel.svelte";
  import PlantaLayersPanel from "$lib/components/planta/PlantaLayersPanel.svelte";
  import { floorPlansApi } from "$lib/components/planta/floor-plans-api";
  import { PLANTA_TOOLS } from "$lib/components/planta/planta-tools";
  import {
    areaLinksFromDocument,
    hydrateFloorPlanDocument,
    legacyListingEnvironments,
    persistentFloorPlanDocument
  } from "$lib/components/planta/floor-plan-document";
  import {
    createPlantaDocument,
    createShapeId,
    fitBoundsToViewport,
    getContentBounds,
    getShapesUnionBounds,
    getShapeBounds,
    getShapeName,
    zoomAtCenter
  } from "$lib/components/planta/state";
  import type { FloorPlan, ListingEnvironment, PlantaDocument, PlantaShape, PlantaTool } from "$lib/components/planta/types";

  const ctx = getCollectionsContext();
  const profiles = getWorkspaceProfilesContext();
  let planner = $state<PlantaDocument>(createPlantaDocument());
  let tool = $state<PlantaTool>("select");
  let selectedShapeIds = $state<string[]>([]);
  let spacePressed = $state(false);
  let floorPlans = $state<FloorPlan[]>([]);
  let activeFloorPlan = $state<FloorPlan | null>(null);
  let activeFloorPlanCollectionId = $state<string | null>(null);
  let environments = $state<ListingEnvironment[]>([]);
  let listingAccess = $state<string | null>(null);
  let loadingPlans = $state(false);
  let activeContextKey = $state<string | null>(null);
  let loadVersion = 0;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let saveChain: Promise<void> = Promise.resolve();
  let lastSavedDocument = $state("");
  let previewImageUrl = $state<string | null>(null);
  let uploadError = $state<string | null>(null);
  let fileInput: HTMLInputElement | null = $state(null);
  let canvasRef = $state<{ cancelDraft: () => void }>();
  let canvasWidth = $state(0);
  let canvasHeight = $state(0);
  let layersPanelOpen = $state(true);
  let designPanelOpen = $state(true);
  let blueprintHandActive = $state(false);
  let undoStack = $state<PlantaCanvasSnapshot[]>([]);
  let isApplyingHistory = $state(false);

  const zoomPercent = $derived(Math.round(planner.viewport.scale * 100));
  const selectedShapes = $derived(
    planner.shapes.filter((shape) => selectedShapeIds.includes(shape.id))
  );
  const selectedShape = $derived(selectedShapes[0] ?? null);
  const selectedIndex = $derived(
    selectedShape ? planner.shapes.findIndex((shape) => shape.id === selectedShape.id) : -1
  );
  const selectedBounds = $derived(
    selectedShapeIds.length === 1 && selectedShape ? getShapeBounds(selectedShape) : null
  );
  const selectionUnionBounds = $derived(getShapesUnionBounds(selectedShapes));
  const layerRows = $derived(planner.shapes.map((shape, index) => ({ shape, index })).toReversed());
  const activeCollectionId = $derived(ctx.activeCollection?.id ?? null);
  const requestedListingId = $derived(page.url.searchParams.get("listing"));
  const activeListing = $derived(
    ctx.listings.find((listing) => listing.id === requestedListingId) ?? null
  );
  const selectedEnvironment = $derived(
    selectedShapeIds.length === 1 && selectedShape?.type === "rect" && selectedShape.environmentId
      ? environments.find((environment) => environment.id === selectedShape.environmentId) ?? null
      : null
  );
  const selectedEnvironmentImages = $derived(selectedEnvironment?.images ?? []);
  const readOnly = $derived(listingAccess === "viewer" || profiles.activeProfile?.status === "frozen");

  function replaceFloorPlan(next: FloorPlan) {
    floorPlans = floorPlans.map((plan) => (plan.id === next.id ? next : plan));
    if (activeFloorPlan?.id === next.id) activeFloorPlan = next;
  }

  function setPlanQuery(planId: string | null, replaceState = true) {
    if (!browser) return;
    const params = new URLSearchParams(page.url.searchParams);
    if (planId) params.set("plan", planId);
    else params.delete("plan");
    const query = params.toString();
    void goto(`${page.url.pathname}${query ? `?${query}` : ""}`, {
      replaceState,
      noScroll: true,
      keepFocus: true
    });
  }

  function activateFloorPlan(floorPlan: FloorPlan | null, collectionId?: string | null) {
    activeFloorPlan = floorPlan;
    activeFloorPlanCollectionId = floorPlan ? (collectionId ?? activeCollectionId) : null;
    planner = floorPlan ? hydrateFloorPlanDocument(floorPlan) : createPlantaDocument();
    lastSavedDocument = floorPlan ? JSON.stringify(planner) : "";
    selectedShapeIds = [];
    undoStack = [];
    uploadError = null;
  }

  async function loadContext(collectionId: string, listingId: string) {
    const version = ++loadVersion;
    await flushAutosave();
    if (version !== loadVersion) return;
    loadingPlans = true;
    activateFloorPlan(null);
    try {
      const listing = ctx.listings.find((item) => item.id === listingId) ?? null;
      const [plansResult, environmentsResult, listingResult] = await Promise.all([
        floorPlansApi.list(collectionId, listingId),
        floorPlansApi.listEnvironments(collectionId, listingId).catch(() => ({
          images: [],
          environments: listing ? legacyListingEnvironments(listing) : []
        })),
        workspaceApi.fetchListing(listingId)
      ]);
      if (version !== loadVersion) return;
      floorPlans = plansResult.floorPlans;
      environments = environmentsResult.environments;
      listingAccess = listingResult.access;
      const requestedPlanId = page.url.searchParams.get("plan");
      const listedPlan =
        floorPlans.find((plan) => plan.id === requestedPlanId) ?? floorPlans[0] ?? null;
      if (!listedPlan) {
        setPlanQuery(null);
        return;
      }
      const { floorPlan } = await floorPlansApi.get(collectionId, listingId, listedPlan.id);
      if (version !== loadVersion) return;
      replaceFloorPlan(floorPlan);
      activateFloorPlan(floorPlan, collectionId);
      if (requestedPlanId !== floorPlan.id) setPlanQuery(floorPlan.id);
    } catch (error) {
      if (version !== loadVersion) return;
      uploadError = formatApiError(error);
      floorPlans = [];
      environments = [];
      listingAccess = null;
    } finally {
      if (version === loadVersion) loadingPlans = false;
    }
  }

  $effect(() => {
    const collectionId = activeCollectionId;
    const listingId = activeListing?.id ?? null;
    const key = collectionId && listingId ? `${collectionId}:${listingId}` : null;
    if (key === activeContextKey) return;
    activeContextKey = key;
    if (!collectionId || !listingId) {
      loadVersion += 1;
      floorPlans = [];
      environments = [];
      listingAccess = null;
      activateFloorPlan(null);
      return;
    }
    void loadContext(collectionId, listingId);
  });

  $effect(() => {
    if (!activeFloorPlan || loadingPlans || readOnly) return;
    const serialized = JSON.stringify(planner);
    if (serialized === lastSavedDocument) return;
    scheduleAutosave();
  });

  $effect(() => {
    const requestedPlanId = page.url.searchParams.get("plan");
    if (!requestedPlanId || requestedPlanId === activeFloorPlan?.id || loadingPlans) return;
    const target = floorPlans.find((plan) => plan.id === requestedPlanId);
    if (target) void selectFloorPlan(target.id);
  });

  onDestroy(() => {
    if (saveTimer) clearTimeout(saveTimer);
    void flushAutosave();
  });

  function recordUndo() {
    if (isApplyingHistory) return;

    const snapshot = captureCanvasSnapshot(planner);
    const previous = undoStack[undoStack.length - 1];
    if (previous && snapshotsEqual(previous, snapshot)) return;

    undoStack = pushUndoStack(undoStack, snapshot);
  }

  function undoCanvasChange() {
    if (undoStack.length === 0) return;

    const { snapshot, stack } = popUndoStack(undoStack);
    if (!snapshot) return;

    undoStack = stack;
    isApplyingHistory = true;
    planner = {
      ...planner,
      shapes: snapshot.shapes,
      blueprint: snapshot.blueprint
    };
    selectedShapeIds = selectedShapeIds.filter((id) =>
      snapshot.shapes.some((shape) => shape.id === id)
    );
    isApplyingHistory = false;
  }

  function scheduleAutosave() {
    if (readOnly) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void flushAutosave(), 500);
  }

  function flushAutosave(): Promise<void> {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    const floorPlan = activeFloorPlan;
    const collectionId = activeFloorPlanCollectionId;
    const snapshot = planner;
    const serialized = JSON.stringify(snapshot);
    if (readOnly || !floorPlan || !collectionId || serialized === lastSavedDocument) return saveChain;
    lastSavedDocument = serialized;
    saveChain = saveChain.then(async () => {
      const current = floorPlans.find((plan) => plan.id === floorPlan.id) ?? floorPlan;
      try {
        const { floorPlan: saved } = await floorPlansApi.saveDocument(
          collectionId,
          current.listingId,
          current.id,
          persistentFloorPlanDocument(snapshot),
          areaLinksFromDocument(snapshot),
          current.revision
        );
        replaceFloorPlan(saved);
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          const { floorPlan: latest } = await floorPlansApi.get(
            collectionId,
            current.listingId,
            current.id
          );
          replaceFloorPlan(latest);
          if (activeFloorPlan?.id === latest.id) activateFloorPlan(latest, collectionId);
          uploadError = formatApiError(error);
          return;
        }
        lastSavedDocument = "";
        uploadError = formatApiError(error);
      }
    });
    return saveChain;
  }

  async function selectFloorPlan(floorPlanId: string) {
    if (!activeCollectionId || !activeListing || floorPlanId === activeFloorPlan?.id) return;
    await flushAutosave();
    loadingPlans = true;
    try {
      const { floorPlan } = await floorPlansApi.get(
        activeCollectionId,
        activeListing.id,
        floorPlanId
      );
      replaceFloorPlan(floorPlan);
      activateFloorPlan(floorPlan, activeCollectionId);
      setPlanQuery(floorPlan.id, false);
    } catch (error) {
      uploadError = formatApiError(error);
    } finally {
      loadingPlans = false;
    }
  }

  async function createFloorPlan() {
    if (readOnly || !activeCollectionId || !activeListing || loadingPlans) return;
    await flushAutosave();
    uploadError = null;
    try {
      const { floorPlan } = await floorPlansApi.create(activeCollectionId, activeListing.id);
      floorPlans = [...floorPlans, floorPlan];
      activateFloorPlan(floorPlan, activeCollectionId);
      setPlanQuery(floorPlan.id, false);
    } catch (error) {
      uploadError = formatApiError(error);
    }
  }

  async function renameFloorPlan(name: string) {
    const trimmed = name.trim();
    if (readOnly || !activeCollectionId || !activeFloorPlan || !trimmed || trimmed === activeFloorPlan.name) return;
    try {
      const { floorPlan } = await floorPlansApi.rename(
        activeCollectionId,
        activeFloorPlan.listingId,
        activeFloorPlan.id,
        trimmed
      );
      replaceFloorPlan(floorPlan);
    } catch (error) {
      uploadError = formatApiError(error);
    }
  }

  async function deleteFloorPlan() {
    if (readOnly || !activeCollectionId || !activeFloorPlan) return;
    if (!window.confirm(`Excluir ${activeFloorPlan.name}?`)) return;
    await flushAutosave();
    const removedId = activeFloorPlan.id;
    try {
      await floorPlansApi.remove(activeCollectionId, activeFloorPlan.listingId, removedId);
      floorPlans = floorPlans.filter((plan) => plan.id !== removedId);
      const fallback = floorPlans[0] ?? null;
      activateFloorPlan(fallback, activeCollectionId);
      setPlanQuery(fallback?.id ?? null);
    } catch (error) {
      uploadError = formatApiError(error);
    }
  }

  function setTool(next: PlantaTool) {
    tool = next;
  }

  function toggleLayersPanel() {
    layersPanelOpen = !layersPanelOpen;
  }

  function toggleDesignPanel() {
    designPanelOpen = !designPanelOpen;
  }

  function toggleBlueprintHand() {
    if (readOnly) return;
    blueprintHandActive = !blueprintHandActive;
  }

  async function removeBlueprint() {
    if (readOnly || !activeFloorPlan || !activeFloorPlanCollectionId) return;
    blueprintHandActive = false;
    await flushAutosave();
    try {
      const { floorPlan } = await floorPlansApi.removeBlueprint(
        activeFloorPlanCollectionId,
        activeFloorPlan.listingId,
        activeFloorPlan.id
      );
      recordUndo();
      replaceFloorPlan(floorPlan);
      planner = { ...planner, blueprint: null };
    } catch (error) {
      uploadError = formatApiError(error);
    }
  }

  async function handleBlueprintUpload(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (readOnly || !activeFloorPlan || !activeFloorPlanCollectionId) {
      input.value = "";
      return;
    }

    uploadError = null;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 10 MiB.");
      const image = await resizePlantaFile(file);
      await flushAutosave();
      const { floorPlan } = await floorPlansApi.uploadBlueprint(
        activeFloorPlanCollectionId,
        activeFloorPlan.listingId,
        activeFloorPlan.id,
        image.blob,
        image.naturalWidth,
        image.naturalHeight
      );
      if (!floorPlan.blueprint) throw new Error("Nao foi possivel usar essa imagem.");
      replaceFloorPlan(floorPlan);
      recordUndo();
      planner = {
        ...planner,
        blueprint: {
          url: floorPlan.blueprint.url,
          naturalWidth: floorPlan.blueprint.width ?? image.naturalWidth,
          naturalHeight: floorPlan.blueprint.height ?? image.naturalHeight,
          x: 0,
          y: 0,
          scale: getInitialBlueprintScale(image.naturalWidth, image.naturalHeight),
          opacity: 0.72
        }
      };
      fitBlueprint();
      tool = "select";
    } catch (error) {
      uploadError = formatApiError(error, { action: "usar essa imagem" });
    } finally {
      input.value = "";
    }
  }

  function getInitialBlueprintScale(width: number, height: number) {
    if (canvasWidth <= 0 || canvasHeight <= 0) return 1;
    return Math.min(1, (Math.min(canvasWidth, canvasHeight) * 0.78) / Math.max(width, height));
  }

  function fitBlueprint() {
    if (readOnly || !planner.blueprint || canvasWidth <= 0 || canvasHeight <= 0) return;

    const visibleWidth = canvasWidth / planner.viewport.scale;
    const visibleHeight = canvasHeight / planner.viewport.scale;
    const targetScale = Math.min(
      2,
      Math.max(
        0.05,
        Math.min(
          (visibleWidth * 0.78) / planner.blueprint.naturalWidth,
          (visibleHeight * 0.78) / planner.blueprint.naturalHeight
        )
      )
    );
    const center = {
      x: (canvasWidth / 2 - planner.viewport.x) / planner.viewport.scale,
      y: (canvasHeight / 2 - planner.viewport.y) / planner.viewport.scale
    };

    recordUndo();
    planner = {
      ...planner,
      blueprint: {
        ...planner.blueprint,
        scale: targetScale,
        x: center.x - (planner.blueprint.naturalWidth * targetScale) / 2,
        y: center.y - (planner.blueprint.naturalHeight * targetScale) / 2
      }
    };
  }

  function resetViewport() {
    const bounds = getContentBounds(planner);
    planner = {
      ...planner,
      viewport: bounds
        ? fitBoundsToViewport(bounds, canvasWidth, canvasHeight)
        : { x: 80, y: 70, scale: 1 }
    };
  }

  function zoomToFit() {
    const bounds = getContentBounds(planner);
    if (!bounds) return;
    planner = {
      ...planner,
      viewport: fitBoundsToViewport(bounds, canvasWidth, canvasHeight)
    };
  }

  function zoomToSelection() {
    if (!selectionUnionBounds) return;
    planner = {
      ...planner,
      viewport: fitBoundsToViewport(selectionUnionBounds, canvasWidth, canvasHeight, 64)
    };
  }

  function zoomTo100() {
    if (canvasWidth <= 0 || canvasHeight <= 0) return;
    planner = {
      ...planner,
      viewport: zoomAtCenter(planner.viewport, canvasWidth, canvasHeight, 1)
    };
  }

  function zoomByFactor(factor: number) {
    if (canvasWidth <= 0 || canvasHeight <= 0) return;
    planner = {
      ...planner,
      viewport: zoomAtCenter(
        planner.viewport,
        canvasWidth,
        canvasHeight,
        planner.viewport.scale * factor
      )
    };
  }

  function updateZoom(nextPercent: number) {
    if (canvasWidth <= 0 || canvasHeight <= 0) return;
    planner = {
      ...planner,
      viewport: zoomAtCenter(planner.viewport, canvasWidth, canvasHeight, nextPercent / 100)
    };
  }

  function updateBlueprintScale(nextPercent: number) {
    if (readOnly || !planner.blueprint) return;
    planner = {
      ...planner,
      blueprint: {
        ...planner.blueprint,
        scale: Math.max(0.05, Math.min(3, nextPercent / 100))
      }
    };
  }

  function updateBlueprintOpacity(nextPercent: number) {
    if (readOnly || !planner.blueprint) return;
    planner = {
      ...planner,
      blueprint: {
        ...planner.blueprint,
        opacity: Math.max(0.1, Math.min(1, nextPercent / 100))
      }
    };
  }

  function toggleGrid() {
    if (readOnly) return;
    planner = {
      ...planner,
      grid: {
        ...planner.grid,
        visible: !planner.grid.visible
      }
    };
  }

  function updateShape(shapeId: string, patch: Partial<PlantaShape>) {
    if (readOnly) return;
    recordUndo();
    planner = {
      ...planner,
      shapes: planner.shapes.map((shape) =>
        shape.id === shapeId ? ({ ...shape, ...patch } as PlantaShape) : shape
      )
    };
  }

  function displayShapeName(shape: PlantaShape, index: number) {
    if (shape.type === "rect") {
      const customName = shape.customName?.trim();
      if (customName) return customName;
      const environmentName = environments.find(
        (environment) => environment.id === shape.environmentId
      )?.name;
      if (environmentName) return environmentName;
    }
    return getShapeName(shape, index);
  }

  function updateSelectedBounds(patch: Partial<{ x: number; y: number; width: number; height: number }>) {
    if (!selectedShape || !selectedBounds) return;
    const nextBounds = {
      ...selectedBounds,
      ...patch
    };

    if (selectedShape.type === "rect") {
      updateShape(
        selectedShape.id,
        snapShape(
          {
            ...selectedShape,
            x: nextBounds.x,
            y: nextBounds.y,
            width: Math.max(4, nextBounds.width),
            height: Math.max(4, nextBounds.height)
          },
          planner.grid
        )
      );
      return;
    }

    const [x1, y1, x2, y2] = selectedShape.points;
    const oldWidth = selectedBounds.width || 1;
    const oldHeight = selectedBounds.height || 1;
    const widthScale = Math.max(4, nextBounds.width) / oldWidth;
    const heightScale = Math.max(4, nextBounds.height) / oldHeight;
    updateShape(
      selectedShape.id,
      snapShape(
        {
          ...selectedShape,
          points: [
            nextBounds.x + (x1 - selectedBounds.x) * widthScale,
            nextBounds.y + (y1 - selectedBounds.y) * heightScale,
            nextBounds.x + (x2 - selectedBounds.x) * widthScale,
            nextBounds.y + (y2 - selectedBounds.y) * heightScale
          ]
        },
        planner.grid
      )
    );
  }

  function selectShape(shape: PlantaShape) {
    if (shape.visible === false || shape.locked) return;
    selectedShapeIds = [shape.id];
    tool = "select";
  }

  function toggleShapeVisibility(shape: PlantaShape) {
    const nextVisible = shape.visible === false;
    updateShape(shape.id, { visible: nextVisible });
    if (!nextVisible) {
      selectedShapeIds = selectedShapeIds.filter((id) => id !== shape.id);
    }
  }

  function toggleShapeLock(shape: PlantaShape) {
    const nextLocked = shape.locked !== true;
    updateShape(shape.id, { locked: nextLocked });
    if (nextLocked) {
      selectedShapeIds = selectedShapeIds.filter((id) => id !== shape.id);
    }
  }

  function deleteSelectedShape() {
    if (readOnly || selectedShapeIds.length === 0) return;
    recordUndo();
    planner = {
      ...planner,
      shapes: planner.shapes.filter((shape) => !selectedShapeIds.includes(shape.id))
    };
    selectedShapeIds = [];
  }

  function duplicateSelectedShape() {
    if (readOnly || !selectedShape || selectedIndex < 0) return;
    recordUndo();
    const offset = 24;
    const copy: PlantaShape =
      selectedShape.type === "rect"
        ? {
            ...selectedShape,
            id: createShapeId(),
            x: selectedShape.x + offset,
            y: selectedShape.y + offset,
            locked: false,
            visible: true
          }
        : {
            ...selectedShape,
            id: createShapeId(),
            name: `${selectedShape.name || getShapeName(selectedShape, selectedIndex)} copia`,
            points: [
              selectedShape.points[0] + offset,
              selectedShape.points[1] + offset,
              selectedShape.points[2] + offset,
              selectedShape.points[3] + offset
            ],
            locked: false,
            visible: true
          };

    const shapes = [...planner.shapes];
    shapes.splice(selectedIndex + 1, 0, copy);
    planner = { ...planner, shapes };
    selectedShapeIds = [copy.id];
  }

  function moveSelectedLayer(direction: "up" | "down") {
    if (readOnly || selectedIndex < 0) return;
    const nextIndex = direction === "up" ? selectedIndex + 1 : selectedIndex - 1;
    if (nextIndex < 0 || nextIndex >= planner.shapes.length) return;
    recordUndo();
    const shapes = [...planner.shapes];
    [shapes[selectedIndex], shapes[nextIndex]] = [shapes[nextIndex], shapes[selectedIndex]];
    planner = { ...planner, shapes };
  }

  function clearShapes() {
    if (readOnly) return;
    recordUndo();
    planner = { ...planner, shapes: [] };
    selectedShapeIds = [];
  }

  function resetPlanner() {
    if (readOnly) return;
    recordUndo();
    planner = {
      ...createPlantaDocument(),
      blueprint: planner.blueprint
    };
    selectedShapeIds = [];
    tool = "select";
    uploadError = null;
  }

  function shouldIgnoreShortcut(event: KeyboardEvent) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return false;
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target.isContentEditable
    );
  }

  function handleWindowKeyDown(event: KeyboardEvent) {
    if (event.key === " " || event.code === "Space") {
      if (!shouldIgnoreShortcut(event)) {
        event.preventDefault();
        spacePressed = true;
      }
      return;
    }

    if (shouldIgnoreShortcut(event)) return;

    const key = event.key.toLowerCase();
    const mod = event.metaKey || event.ctrlKey;

    if (readOnly && (key === "delete" || key === "backspace" || (mod && key === "z"))) {
      return;
    }

    if (key === "escape") {
      canvasRef?.cancelDraft();
      selectedShapeIds = [];
      return;
    }

    if (key === "delete" || key === "backspace") {
      event.preventDefault();
      deleteSelectedShape();
      return;
    }

    if (mod && (key === "=" || key === "+")) {
      event.preventDefault();
      zoomByFactor(1.05);
      return;
    }

    if (mod && key === "-") {
      event.preventDefault();
      zoomByFactor(1 / 1.05);
      return;
    }

    if (mod && key === "0") {
      event.preventDefault();
      zoomTo100();
      return;
    }

    if (mod && key === "z" && !event.shiftKey) {
      event.preventDefault();
      undoCanvasChange();
      return;
    }

    if (event.shiftKey && event.code === "Digit1") {
      event.preventDefault();
      zoomToFit();
      return;
    }

    if (event.shiftKey && event.code === "Digit2") {
      event.preventDefault();
      zoomToSelection();
      return;
    }

    if (event.altKey || mod || event.shiftKey || readOnly) return;

    if (key === "v") {
      event.preventDefault();
      setTool("select");
      return;
    }

    if (key === "h") {
      event.preventDefault();
      setTool("pan");
      return;
    }

    if (key === "l") {
      event.preventDefault();
      setTool("line");
      return;
    }

    if (key === "r") {
      event.preventDefault();
      setTool("rect");
    }
  }

  function handleWindowKeyUp(event: KeyboardEvent) {
    if (event.key === " " || event.code === "Space") {
      spacePressed = false;
    }
  }
</script>

<svelte:window onkeydown={handleWindowKeyDown} onkeyup={handleWindowKeyUp} />

<WorkspacePage contentClassName="flex min-h-[calc(100vh-var(--nav-height,2.75rem))] max-w-none flex-col gap-0 p-0">
  <input
    bind:this={fileInput}
    class="hidden"
    type="file"
    accept="image/png,image/jpeg,image/webp"
    onchange={handleBlueprintUpload}
  />

  <PlantaToolbar
    {floorPlans}
    {activeFloorPlan}
    {loadingPlans}
    {readOnly}
    hasActiveListing={Boolean(activeListing)}
    {layersPanelOpen}
    {designPanelOpen}
    hasBlueprint={Boolean(planner.blueprint)}
    {zoomPercent}
    {selectedEnvironment}
    {selectedEnvironmentImages}
    onSelectFloorPlan={(id) => void selectFloorPlan(id)}
    onRenameFloorPlan={(name) => void renameFloorPlan(name)}
    onCreateFloorPlan={() => void createFloorPlan()}
    onDeleteFloorPlan={() => void deleteFloorPlan()}
    onToggleLayers={toggleLayersPanel}
    onToggleDesign={toggleDesignPanel}
    onUpload={() => fileInput?.click()}
    onFitBlueprint={fitBlueprint}
    onResetViewport={resetViewport}
    onPreviewImage={(url) => (previewImageUrl = url)}
    onUpdateZoom={updateZoom}
  />

  {#if uploadError}
    <div class="border-b border-app-warning/40 bg-app-warning/10 px-3 py-2 text-sm text-app-warning">
      {uploadError}
    </div>
  {/if}

  <div
    class={cn(
      "grid min-h-0 flex-1",
      layersPanelOpen && designPanelOpen
        ? "grid-cols-[3rem_minmax(10rem,14rem)_minmax(0,1fr)] lg:grid-cols-[3rem_minmax(12rem,16rem)_minmax(0,1fr)_18rem]"
        : layersPanelOpen
          ? "grid-cols-[3rem_minmax(10rem,14rem)_minmax(0,1fr)] lg:grid-cols-[3rem_minmax(12rem,16rem)_minmax(0,1fr)]"
          : designPanelOpen
            ? "grid-cols-[3rem_minmax(0,1fr)] lg:grid-cols-[3rem_minmax(0,1fr)_18rem]"
            : "grid-cols-[3rem_minmax(0,1fr)]"
    )}
  >
    <nav class="flex min-h-0 flex-col items-center gap-1 border-r border-app-border bg-app-surface px-1.5 py-2">
      {#each PLANTA_TOOLS as item}
        {@const Icon = item.icon}
        <Button
          variant={tool === item.id ? "primary" : "ghost"}
          size="icon"
          class="h-9 w-9"
          title={item.label}
          ariaLabel={item.label}
          disabled={readOnly || !activeFloorPlan}
          onclick={() => setTool(item.id)}
        >
          <Icon class="h-4 w-4" />
        </Button>
      {/each}

      <div class="mt-auto flex flex-col gap-1 border-t border-app-border pt-2">
        <Button
          variant={layersPanelOpen ? "primary" : "ghost"}
          size="icon"
          class="h-9 w-9"
          title={layersPanelOpen ? "Ocultar layers" : "Mostrar layers"}
          ariaLabel={layersPanelOpen ? "Ocultar layers" : "Mostrar layers"}
          onclick={toggleLayersPanel}
        >
          <Layers class="h-4 w-4" />
        </Button>
        <Button variant={planner.grid.visible ? "primary" : "ghost"} size="icon" class="h-9 w-9" title="Grade" ariaLabel="Grade" disabled={readOnly} onclick={toggleGrid}>
          <Grid3X3 class="h-4 w-4" />
        </Button>
        <Button
          variant={designPanelOpen ? "primary" : "ghost"}
          size="icon"
          class="h-9 w-9"
          title={designPanelOpen ? "Ocultar design" : "Mostrar design"}
          ariaLabel={designPanelOpen ? "Ocultar design" : "Mostrar design"}
          onclick={toggleDesignPanel}
        >
          <PanelRight class="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" class="h-9 w-9" title="Resetar tudo" ariaLabel="Resetar tudo" disabled={readOnly} onclick={resetPlanner}>
          <Trash2 class="h-4 w-4" />
        </Button>
      </div>
    </nav>

    {#if layersPanelOpen}
      <PlantaLayersPanel
        rows={layerRows}
        {selectedShapeIds}
        hasBlueprint={Boolean(planner.blueprint)}
        {readOnly}
        getName={displayShapeName}
        onClose={toggleLayersPanel}
        onClear={clearShapes}
        onRemoveBlueprint={() => void removeBlueprint()}
        onSelect={selectShape}
        onToggleVisibility={toggleShapeVisibility}
        onToggleLock={toggleShapeLock}
      />
    {/if}

    <main class="min-h-0 bg-app-bg p-2">
      <PlantaCanvas
        bind:this={canvasRef}
        bind:planner
        bind:selectedShapeIds
        bind:canvasWidth
        bind:canvasHeight
        {tool}
        {spacePressed}
        {blueprintHandActive}
        {readOnly}
        recordUndo={recordUndo}
      />
    </main>

    {#if designPanelOpen}
      <PlantaDesignPanel
        bind:planner
        {readOnly}
        {selectedShapeIds}
        {selectedShape}
        {selectedBounds}
        {selectedIndex}
        selectedDisplayName={selectedShape ? displayShapeName(selectedShape, selectedIndex) : ""}
        {environments}
        {blueprintHandActive}
        {canvasWidth}
        {canvasHeight}
        onClose={toggleDesignPanel}
        onMoveLayer={moveSelectedLayer}
        onDuplicate={duplicateSelectedShape}
        onDelete={deleteSelectedShape}
        onUpdateShape={updateShape}
        onUpdateBounds={updateSelectedBounds}
        onToggleBlueprintHand={toggleBlueprintHand}
        onRemoveBlueprint={() => void removeBlueprint()}
        onUpdateBlueprintScale={updateBlueprintScale}
        onUpdateBlueprintOpacity={updateBlueprintOpacity}
      />
    {/if}
  </div>
</WorkspacePage>

{#if previewImageUrl}
  <PlantaImageDialog url={previewImageUrl} onClose={() => (previewImageUrl = null)} />
{/if}
