/**
 * src/stores/continentStudio.ts
 *
 * CONTINENT MAP STUDIO PINIA STORE (SSoT)
 * Centralizes reactive state for the 2-View Continental Map Editor:
 * - Strict 2-View Dicotomy ('geographic' | 'connections')
 * - Project profiles management (LocalStorage persistence)
 * - Procedural generation & randomizing
 * - Bidirectional SVG import/export with adaptive geography
 * - Undo / Redo history management
 * - Viewport zoom/pan and tool selection
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  ContinentProject,
  ContinentNode,
  ContinentDimensions,
  ContinentGenConfig,
  UrbanScale,
  ContinentBiomeType,
  PlacedCustomSprite,
  CanonicalPresetId
} from '../types/map/continentTypes';
import {
  generateContinent,
  type GeneratedContinentResult
} from '../logic/map/continent/continentalEngine';
import {
  exportRoutesToSvg,
  importRoutesFromSvg,
  regenerateGeographyFromGraph
} from '../logic/map/continent/svgRouteAdapter';
import {
  saveProjectProfile,
  loadProjectProfile,
  listProjectProfiles,
  deleteProjectProfile,
  createBlankProject,
  createPresetProject
} from '../logic/map/continent/continentPersistence';

import { STUDIO_MAX_HISTORY_STEPS } from '../config/studioConstants';

const MAX_PROCEDURAL_SEED = 999999;

export type StudioActiveView = 'geographic' | 'connections';

export type StudioActiveTool =
  | 'pointer'
  | 'terrain'
  | 'structures'
  | 'add_node'
  | 'connect'
  | 'delete';

export const useContinentStudioStore = defineStore('continentStudio', () => {
  // 1. Active View ('geographic' | 'connections')
  const activeView = ref<StudioActiveView>('geographic');

  function setView(view: StudioActiveView): void {
    activeView.value = view;
  }

  function toggleView(): void {
    activeView.value = activeView.value === 'geographic' ? 'connections' : 'geographic';
  }

  // 2. Active Project Management
  const initialProject = createPresetProject('kanto');
  const projects = ref<Record<string, ContinentProject>>({
    [initialProject.id]: initialProject
  });
  const activeProjectId = ref<string>(initialProject.id);

  const activeProject = computed<ContinentProject>(() => {
    return projects.value[activeProjectId.value] ?? initialProject;
  });

  const profilesList = computed(() => listProjectProfiles());

  // Cached generated terrain result
  const cachedGenResult = ref<GeneratedContinentResult | null>(null);

  function ensureGeneratedResult(): GeneratedContinentResult {
    if (!cachedGenResult.value || cachedGenResult.value.dimensions.width !== activeProject.value.config.dimensions.width) {
      cachedGenResult.value = generateContinent(activeProject.value.config);
    }
    return cachedGenResult.value;
  }

  // 3. History Management (Undo / Redo)
  const history = ref<string[]>([]);
  const future = ref<string[]>([]);

  const canUndo = computed(() => history.value.length > 0);
  const canRedo = computed(() => future.value.length > 0);

  function pushHistory(): void {
    history.value.push(JSON.stringify(activeProject.value));
    if (history.value.length > STUDIO_MAX_HISTORY_STEPS) {
      history.value.shift();
    }
    future.value = [];
  }

  function undo(): void {
    if (history.value.length === 0) return;
    const currentState = JSON.stringify(activeProject.value);
    future.value.push(currentState);
    const prevState = history.value.pop()!;
    try {
      const restored = JSON.parse(prevState) as ContinentProject;
      projects.value[restored.id] = restored;
      activeProjectId.value = restored.id;
      cachedGenResult.value = null;
    } catch {
      // ignore
    }
  }

  function redo(): void {
    if (future.value.length === 0) return;
    const currentState = JSON.stringify(activeProject.value);
    history.value.push(currentState);
    const nextState = future.value.pop()!;
    try {
      const restored = JSON.parse(nextState) as ContinentProject;
      projects.value[restored.id] = restored;
      activeProjectId.value = restored.id;
      cachedGenResult.value = null;
    } catch {
      // ignore
    }
  }

  // 4. Project Operations
  function selectProject(id: string): void {
    const loaded = loadProjectProfile(id);
    if (loaded) {
      projects.value[loaded.id] = loaded;
      activeProjectId.value = loaded.id;
      cachedGenResult.value = null;
      history.value = [];
      future.value = [];
    } else if (projects.value[id]) {
      activeProjectId.value = id;
      cachedGenResult.value = null;
      history.value = [];
      future.value = [];
    }
  }

  function createNewProject(
    name: string,
    presetId?: 'kanto' | 'johto' | 'archipelago' | 'glacial',
    dimensions?: ContinentDimensions
  ): ContinentProject {
    const proj = presetId
      ? createPresetProject(presetId)
      : createBlankProject(name, dimensions);

    const namedProj: ContinentProject = { ...proj, name: name || proj.name };
    projects.value[namedProj.id] = namedProj;
    activeProjectId.value = namedProj.id;
    saveProjectProfile(namedProj);
    cachedGenResult.value = null;
    history.value = [];
    future.value = [];
    return namedProj;
  }

  function saveCurrentProject(): void {
    saveProjectProfile(activeProject.value);
  }

  function removeCurrentProject(id: string): boolean {
    const ok = deleteProjectProfile(id);
    delete projects.value[id];
    const remaining = Object.keys(projects.value);
    if (remaining.length > 0) {
      activeProjectId.value = remaining[0]!;
    } else {
      const fallback = createPresetProject('kanto');
      projects.value[fallback.id] = fallback;
      activeProjectId.value = fallback.id;
    }
    cachedGenResult.value = null;
    return ok;
  }

  // 5. Node & Route Mutations
  function addNode(name: string, x: number, y: number, scale: UrbanScale = 'town'): ContinentNode {
    pushHistory();
    const currentNodes = { ...activeProject.value.nodes };
    const id = `node_${Temporal.Now.instant().epochMilliseconds}_${Math.floor(Math.random() * 100)}`;
    const newNode: ContinentNode = {
      id,
      name,
      x,
      y,
      scale,
      amenities: ['center', 'mart']
    };
    currentNodes[id] = newNode;
    projects.value[activeProjectId.value] = {
      ...activeProject.value,
      nodes: currentNodes
    };
    return newNode;
  }

  function moveNode(id: string, x: number, y: number): void {
    const node = activeProject.value.nodes[id];
    if (!node) return;
    const currentNodes = { ...activeProject.value.nodes };
    currentNodes[id] = { ...node, x, y };
    projects.value[activeProjectId.value] = {
      ...activeProject.value,
      nodes: currentNodes
    };
  }

  function renameNode(id: string, newName: string): void {
    const node = activeProject.value.nodes[id];
    if (!node || !newName.trim()) return;
    pushHistory();
    const currentNodes = { ...activeProject.value.nodes };
    currentNodes[id] = { ...node, name: newName.trim() };
    projects.value[activeProjectId.value] = {
      ...activeProject.value,
      nodes: currentNodes
    };
  }

  function deleteNode(id: string): void {
    if (!activeProject.value.nodes[id]) return;
    pushHistory();
    const currentNodes = { ...activeProject.value.nodes };
    delete currentNodes[id];

    // Remove connected routes
    const currentConnections = activeProject.value.connections.filter(
      ([u, v]) => u !== id && v !== id
    );

    projects.value[activeProjectId.value] = {
      ...activeProject.value,
      nodes: currentNodes,
      connections: currentConnections
    };
  }

  function addConnection(u: string, v: string): void {
    if (u === v || !activeProject.value.nodes[u] || !activeProject.value.nodes[v]) return;
    const exists = activeProject.value.connections.some(
      ([a, b]) => (a === u && b === v) || (a === v && b === u)
    );
    if (exists) return;
    pushHistory();
    projects.value[activeProjectId.value] = {
      ...activeProject.value,
      connections: [...activeProject.value.connections, [u, v]]
    };
  }

  function removeConnection(u: string, v: string): void {
    pushHistory();
    const filtered = activeProject.value.connections.filter(
      ([a, b]) => !((a === u && b === v) || (a === v && b === u))
    );
    projects.value[activeProjectId.value] = {
      ...activeProject.value,
      connections: filtered
    };
  }

  // 6. Procedural Generation Action
  function loadCanonicalPreset(presetId: CanonicalPresetId = 'kanto'): void {
    pushHistory();
    const presetProj = createPresetProject(presetId);
    projects.value[presetProj.id] = presetProj;
    activeProjectId.value = presetProj.id;
    cachedGenResult.value = null;
  }

  // 6. Procedural Generation Action
  function generateGeography(randomizeSeed = false): void {
    pushHistory();
    const newSeed = randomizeSeed
      ? Math.floor(Math.random() * MAX_PROCEDURAL_SEED)
      : activeProject.value.config.seed;

    const newConfig: ContinentGenConfig = {
      ...activeProject.value.config,
      seed: newSeed,
      presetId: undefined
    };

    const genResult = generateContinent(newConfig);
    cachedGenResult.value = genResult;

    projects.value[activeProjectId.value] = {
      ...activeProject.value,
      name: `Región Procedural #${newSeed % 1000}`,
      config: newConfig,
      nodes: genResult.nodes,
      connections: genResult.connections,
      customTerrain: {}
    };
  }

  // 7. Bidirectional SVG
  function exportSvg(): string {
    return exportRoutesToSvg({
      width: activeProject.value.config.dimensions.width,
      height: activeProject.value.config.dimensions.height,
      nodes: activeProject.value.nodes,
      connections: activeProject.value.connections
    });
  }

  function importSvg(svgString: string): boolean {
    try {
      const parsed = importRoutesFromSvg(svgString);
      if (Object.keys(parsed.nodes).length === 0) return false;
      pushHistory();

      const regenerated = regenerateGeographyFromGraph(parsed, activeProject.value.config);
      cachedGenResult.value = regenerated;

      projects.value[activeProjectId.value] = {
        ...activeProject.value,
        nodes: regenerated.nodes,
        connections: regenerated.connections,
        customTerrain: {}
      };
      return true;
    } catch (e) {
      console.error('[continentStudio] Failed to import SVG:', e);
      return false;
    }
  }

  // 8. Viewport & Tooling State
  const activeTool = ref<StudioActiveTool>('pointer');
  const selectedNodeId = ref<string | null>(null);
  const connectSourceNodeId = ref<string | null>(null);
  const zoom = ref<number>(0.5);
  const panX = ref<number>(0);
  const panY = ref<number>(0);

  const showConfigModal = ref<boolean>(false);
  const showSpriteModal = ref<boolean>(false);

  function setZoom(z: number): void {
    zoom.value = Math.max(0.15, Math.min(3.0, z));
  }

  function setPan(x: number, y: number): void {
    panX.value = x;
    panY.value = y;
  }

  function updateProjectConfig(partial: Partial<ContinentGenConfig>): void {
    const currentProj = activeProject.value;
    const updatedConfig: ContinentGenConfig = {
      ...currentProj.config,
      ...partial,
      dimensions: partial.dimensions
        ? { ...currentProj.config.dimensions, ...partial.dimensions }
        : currentProj.config.dimensions,
      biomes: partial.biomes
        ? { ...currentProj.config.biomes, ...partial.biomes }
        : currentProj.config.biomes
    };
    projects.value[activeProjectId.value] = {
      ...currentProj,
      config: updatedConfig
    };
  }

  // 9. Terrain Brush & Structures Palette State
  const terrainBrushBiome = ref<ContinentBiomeType>('path');
  const terrainBrushSize = ref<1 | 2 | 4 | 8>(2);
  const selectedPrefabId = ref<string>('pokecenter');
  const selectedStructureIndex = ref<number | null>(null);

  function paintTerrainBrush(centerGx: number, centerGy: number): void {
    pushHistory();
    const currentTerrain = { ...(activeProject.value.customTerrain ?? {}) };
    const half = Math.floor(terrainBrushSize.value / 2);
    for (let dy = -half; dy < -half + terrainBrushSize.value; dy++) {
      for (let dx = -half; dx < -half + terrainBrushSize.value; dx++) {
        const gx = centerGx + dx;
        const gy = centerGy + dy;
        currentTerrain[`${gx},${gy}`] = terrainBrushBiome.value;
      }
    }
    projects.value[activeProjectId.value] = {
      ...activeProject.value,
      customTerrain: currentTerrain
    };
  }

  function addCustomStructure(item: PlacedCustomSprite): void {
    pushHistory();
    const currentPlaced = [...(activeProject.value.placedSprites ?? []), item];
    projects.value[activeProjectId.value] = {
      ...activeProject.value,
      placedSprites: currentPlaced
    };
  }

  function moveCustomStructure(index: number, x: number, y: number): void {
    const current = [...(activeProject.value.placedSprites ?? [])];
    const target = current[index];
    if (!target) return;
    current[index] = { ...target, x, y };
    projects.value[activeProjectId.value] = {
      ...activeProject.value,
      placedSprites: current
    };
  }

  function removeCustomStructure(index: number): void {
    pushHistory();
    const current = [...(activeProject.value.placedSprites ?? [])];
    current.splice(index, 1);
    projects.value[activeProjectId.value] = {
      ...activeProject.value,
      placedSprites: current
    };
  }

  return {
    activeView,
    setView,
    toggleView,
    projects,
    activeProjectId,
    activeProject,
    updateProjectConfig,
    profilesList,
    ensureGeneratedResult,
    canUndo,
    canRedo,
    undo,
    redo,
    pushHistory,
    selectProject,
    createNewProject,
    saveCurrentProject,
    removeCurrentProject,
    addNode,
    moveNode,
    renameNode,
    deleteNode,
    addConnection,
    removeConnection,
    loadCanonicalPreset,
    generateGeography,
    exportSvg,
    importSvg,
    activeTool,
    selectedNodeId,
    connectSourceNodeId,
    zoom,
    panX,
    panY,
    setZoom,
    setPan,
    showConfigModal,
    showSpriteModal,
    terrainBrushBiome,
    terrainBrushSize,
    selectedPrefabId,
    selectedStructureIndex,
    paintTerrainBrush,
    addCustomStructure,
    moveCustomStructure,
    removeCustomStructure
  };
});
