/**
 * src/stores/mapAdventureStudio.ts
 *
 * ADVENTURE GRAPH & MULTI-REGION WORLD STUDIO PINIA STORE (SSoT)
 * Centralizes reactive state for the regional Adventure World Map editor:
 * - Multi-region projects (Kanto, Johto, custom) & JSON import/export
 * - 3-mode workspace partition ('graph' | 'terrain' | 'structures')
 * - Interactive square terrain painting (1x1 to 8x8) & autotiling recalculation
 * - Direct drag and visual stamping of GBA buildings and props
 * - Parametric procedural generation configuration & destructive regeneration modal
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  type MapNode,
  rawNodes as defaultRawNodes,
  connections as defaultConnections,
  officialMapIdMap as defaultOfficialMapIdMap
} from '../logic/adventure/mapData';
import { dijkstra } from '../logic/adventure/adventurePathfinding';
import {
  type AdventureProject,
  type RegionArchetype,
  type StudioMode,
  type BrushSize,
  type UrbanScale,
  type ProceduralGenerationConfig,
  type StampingPrefabDefinition,
  type ContinentalRoutesExportBundle
} from '../types/map/adventureWorldTypes';
import {
  generateCompleteContinentalWorld,
  exportContinentalRoutesBundle,
  type ContinentalWorldGenOptions
} from '../logic/map/continentalWorldGenerator';
import {
  getKantoDefaultProject,
  getJohtoDefaultProject,
  getBlankDefaultProject
} from '../logic/map/regionRegistry';
import { CELL_BIOME, type CellBiomeType } from '../logic/map/kantoRegionalGenerator';
import type { PlacedStructure } from '../logic/map/kantoTileEngine';
import type { GeneratedMap } from '../logic/map/proceduralMapGenerator';
import { defaultTilesRegistry } from '../logic/map/tilesRegistry';
import { getAllStructureTemplates, registerStructureTemplate } from '../config/mapStructures';
import { saveCustomTilesToStorage, saveCustomStructuresToStorage } from '../logic/map/customAssetsStorage';
import { generateLocalMapForNode } from '../logic/map/nodeLocalMapGenerator';
import { useMapStudioStore } from './mapStudio.ts';

import { STUDIO_MAX_HISTORY_STEPS } from '../config/studioConstants';

export type GraphStudioTool = 'pointer' | 'add_node' | 'connect' | 'delete' | 'test_gps' | 'stamp';

const STORAGE_PROJECTS_KEY = 'pokeVicioAdventureProjects_v2';
const STORAGE_ACTIVE_KEY = 'pokeVicioActiveProjectId_v2';
const DEFAULT_PAN_X = 0;
const DEFAULT_PAN_Y = 0;
const DEFAULT_ZOOM = 0.5;
const ADVENTURE_MIN_ZOOM = 0.2;
const ADVENTURE_MAX_ZOOM = 3.0;
const DEFAULT_VIEWPORT_WIDTH = 1000;
const DEFAULT_VIEWPORT_HEIGHT = 700;
const DEFAULT_STRUCTURE_WIDTH = 80;
const DEFAULT_STRUCTURE_HEIGHT = 60;
const INITIAL_CONTINENT_ZOOM = 0.22;
const INITIAL_CONTINENT_PAN_X = 150;
const INITIAL_CONTINENT_PAN_Y = -70;

export const useMapAdventureStudioStore = defineStore('mapAdventureStudio', () => {
  // 1. Projects Management & Persistence
  const projects = ref<Record<string, AdventureProject>>({
    kanto_canonical: getKantoDefaultProject(),
    johto_canonical: getJohtoDefaultProject()
  });
  const activeProjectId = ref<string>('kanto_canonical');

  // 2. Active Mode ('graph' | 'terrain' | 'structures' | 'tile')
  const activeMode = ref<StudioMode>('graph');
  const activeEditingNodeId = ref<string | null>(null);

  // 3. Core Graph Data (Synched to Active Project)
  const nodes = ref<Record<string, MapNode>>(JSON.parse(JSON.stringify(defaultRawNodes)));
  const connections = ref<[string, string][]>(JSON.parse(JSON.stringify(defaultConnections)));
  const officialMapMapping = ref<Record<string, string>>(JSON.parse(JSON.stringify(defaultOfficialMapIdMap)));

  // 4. Terrain Painting Mode State
  const brushSize = ref<BrushSize>(2);
  const selectedBiome = ref<CellBiomeType>(CELL_BIOME.DIRT_PATH);
  const customTerrain = ref<Record<string, CellBiomeType>>({});
  const terrainPaintTrigger = ref<{ gx: number; gy: number; size: number; biome: CellBiomeType } | null>(null);

  // 5. Structures & Props Mode State
  const customStructures = ref<PlacedStructure[]>([]);
  const selectedStructureIndex = ref<number | null>(null);
  const stampingPrefab = ref<StampingPrefabDefinition | null>(null);

  // 6. Tool & Selection State (Graph Mode)
  const activeTool = ref<GraphStudioTool>('pointer');
  const selectedNodeId = ref<string | null>(null);
  const connectSourceNodeId = ref<string | null>(null);

  // 7. Viewport & Canvas Controls
  const panX = ref<number>(DEFAULT_PAN_X);
  const panY = ref<number>(DEFAULT_PAN_Y);
  const zoom = ref<number>(DEFAULT_ZOOM);
  const showBackgroundMap = ref<boolean>(true);
  const showGrid = ref<boolean>(true);

  // 8. Procedural Generation Config & Seed
  const seed = ref<number>(42);
  const tilesetProfile = ref<'gba' | 'lpc'>('gba');
  const proceduralConfig = ref<ProceduralGenerationConfig>({
    treeDensity: 0.7,
    roadWidth: 2,
    autoOcean: true,
    autoBuildings: true,
    waterPercent: 14,
    mountainPercent: 10,
    forestPercent: 25,
    cityConfig: {
      scale: 'town',
      buildingDensity: 7,
      includeGym: true,
      includeLab: false,
      plazaType: 'fountain'
    }
  });
  const isBakingTiles = ref<boolean>(false);
  const tileTerrainTrigger = ref<number>(0);

  // 9. Modals & Catalog Drawers State
  const showConfigModal = ref<boolean>(false);
  const showConfirmRegenerateModal = ref<boolean>(false);
  const showTileCatalog = ref<boolean>(false);
  const isSyncingAssets = ref<boolean>(false);

  function toggleTileCatalog(): void {
    showTileCatalog.value = !showTileCatalog.value;
  }

  // 10. Interactive GPS Testing
  const gpsStartNodeId = ref<string | null>(null);
  const gpsTargetNodeId = ref<string | null>(null);
  const previewDijkstraNodes = ref<string[]>([]);

  // 11. Undo / Redo Stack
  const history = ref<string[]>([]);
  const future = ref<string[]>([]);

  const canUndo = computed(() => history.value.length > 0);
  const canRedo = computed(() => future.value.length > 0);

  const activeProject = computed<AdventureProject>(() => {
    return projects.value[activeProjectId.value] || projects.value.kanto_canonical || getKantoDefaultProject();
  });

  const hasManualModifications = computed(() => {
    return Object.keys(customTerrain.value).length > 0 || customStructures.value.length > 0;
  });

  function triggerRebake(): void {
    tileTerrainTrigger.value++;
    saveToStorage();
  }

  function teleportTo(targetPxX: number, targetPxY: number, vpW = DEFAULT_VIEWPORT_WIDTH, vpH = DEFAULT_VIEWPORT_HEIGHT): void {
    panX.value = Math.round(vpW / 2 - targetPxX * zoom.value);
    panY.value = Math.round(vpH / 2 - targetPxY * zoom.value);
  }

  function pushHistory(): void {
    const snapshot = JSON.stringify({
      nodes: nodes.value,
      connections: connections.value,
      officialMapMapping: officialMapMapping.value,
      customTerrain: customTerrain.value,
      customStructures: customStructures.value
    });
    history.value.push(snapshot);
    if (history.value.length > STUDIO_MAX_HISTORY_STEPS) history.value.shift();
    future.value = [];
    saveToStorage();
  }

  function undo(): void {
    const prevStr = history.value.pop();
    if (!prevStr) return;
    future.value.push(JSON.stringify({
      nodes: nodes.value,
      connections: connections.value,
      officialMapMapping: officialMapMapping.value,
      customTerrain: customTerrain.value,
      customStructures: customStructures.value
    }));
    const prev = JSON.parse(prevStr);
    nodes.value = prev.nodes;
    connections.value = prev.connections;
    officialMapMapping.value = prev.officialMapMapping;
    customTerrain.value = prev.customTerrain || {};
    customStructures.value = prev.customStructures || [];
    triggerRebake();
  }

  function redo(): void {
    const nextStr = future.value.pop();
    if (!nextStr) return;
    history.value.push(JSON.stringify({
      nodes: nodes.value,
      connections: connections.value,
      officialMapMapping: officialMapMapping.value,
      customTerrain: customTerrain.value,
      customStructures: customStructures.value
    }));
    const next = JSON.parse(nextStr);
    nodes.value = next.nodes;
    connections.value = next.connections;
    officialMapMapping.value = next.officialMapMapping;
    customTerrain.value = next.customTerrain || {};
    customStructures.value = next.customStructures || [];
    triggerRebake();
  }

  // --- Multi-Region Projects Actions ---
  function selectProject(projectId: string): void {
    if (!projects.value[projectId]) return;
    activeProjectId.value = projectId;
    const p = projects.value[projectId];
    if (!p) return;

    nodes.value = JSON.parse(JSON.stringify(p.nodes));
    connections.value = JSON.parse(JSON.stringify(p.connections));
    seed.value = p.seed;
    proceduralConfig.value = { ...p.config };
    customTerrain.value = p.customTerrain ? { ...p.customTerrain } : {};
    customStructures.value = p.customBuildings ? JSON.parse(JSON.stringify(p.customBuildings)) : [];

    selectedNodeId.value = null;
    selectedStructureIndex.value = null;
    clearGPS();
    triggerRebake();
  }

  function createProject(name: string, archetype: RegionArchetype): string {
    const newProj = archetype === 'johto'
      ? { ...getJohtoDefaultProject(), id: `johto_${Temporal.Now.instant().epochMilliseconds}`, name }
      : archetype === 'kanto'
        ? { ...getKantoDefaultProject(), id: `kanto_${Temporal.Now.instant().epochMilliseconds}`, name }
        : getBlankDefaultProject(name);

    projects.value[newProj.id] = newProj;
    selectProject(newProj.id);
    return newProj.id;
  }

  function deleteProject(projectId: string): void {
    if (projectId === 'kanto_canonical' || projectId === 'johto_canonical') return;
    delete projects.value[projectId];
    if (activeProjectId.value === projectId) {
      selectProject('kanto_canonical');
    } else {
      saveToStorage();
    }
  }

  function exportProjectJSON(): string {
    syncActiveProject();
    return JSON.stringify(activeProject.value, null, 2);
  }

  function importProjectJSON(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr) as AdventureProject;
      if (parsed && parsed.name && parsed.nodes && parsed.connections) {
        parsed.id = parsed.id || `imported_${Temporal.Now.instant().epochMilliseconds}`;
        if (parsed.customTiles && parsed.customTiles.length > 0) {
          defaultTilesRegistry.registerTiles(parsed.customTiles);
          void saveCustomTilesToStorage(parsed.customTiles);
        }
        if (parsed.customStructures && parsed.customStructures.length > 0) {
          for (const s of parsed.customStructures) {
            registerStructureTemplate(s);
          }
          void saveCustomStructuresToStorage(parsed.customStructures);
        }
        projects.value[parsed.id] = parsed;
        selectProject(parsed.id);
        return true;
      }
    } catch (err) {
      console.error('[MapAdventureStudio] Failed to parse project JSON:', err);
    }
    return false;
  }

  function syncActiveProject(): void {
    const cur = projects.value[activeProjectId.value];
    if (!cur) return;
    cur.nodes = JSON.parse(JSON.stringify(nodes.value));
    cur.connections = JSON.parse(JSON.stringify(connections.value));
    cur.seed = seed.value;
    cur.config = { ...proceduralConfig.value };
    cur.customTerrain = { ...customTerrain.value };
    cur.customBuildings = JSON.parse(JSON.stringify(customStructures.value));
    const customTiles = defaultTilesRegistry.getAllTiles().filter(t => t.subcategory === 'custom' || t.tags.includes('custom'));
    const customTemplates = getAllStructureTemplates().filter(s => !['kanto_house_small', 'pokemart', 'pokemon_center'].includes(s.id));
    if (customTiles.length > 0) cur.customTiles = customTiles;
    if (customTemplates.length > 0) cur.customStructures = customTemplates;
    cur.updatedAt = Temporal.Now.instant().toString();
  }

  // --- Terrain Brush Actions ---
  function paintTerrain(gx: number, gy: number): void {
    const size = brushSize.value;
    const biome = selectedBiome.value;

    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const px = gx + dx;
        const py = gy + dy;
        customTerrain.value[`${px}_${py}`] = biome;
      }
    }

    terrainPaintTrigger.value = { gx, gy, size, biome };
    saveToStorage();
  }

  // --- Structure & Prop Manipulation Actions ---
  function addStructure(style: string, x: number, y: number, w = DEFAULT_STRUCTURE_WIDTH, h = DEFAULT_STRUCTURE_HEIGHT): void {
    pushHistory();
    customStructures.value.push({ style, x: Math.round(x), y: Math.round(y), w, h });
    selectedStructureIndex.value = customStructures.value.length - 1;
    triggerRebake();
  }

  function moveStructure(index: number, x: number, y: number): void {
    const s = customStructures.value[index];
    if (!s) return;
    customStructures.value[index] = { ...s, x: Math.round(x), y: Math.round(y) };
    triggerRebake();
  }

  function deleteStructure(index: number): void {
    if (index < 0 || index >= customStructures.value.length) return;
    pushHistory();
    customStructures.value.splice(index, 1);
    selectedStructureIndex.value = null;
    triggerRebake();
  }

  function selectPrefab(prefab: StampingPrefabDefinition): void {
    stampingPrefab.value = prefab;
    activeTool.value = 'stamp';
  }

  function stampCurrentPrefab(x: number, y: number): void {
    if (!stampingPrefab.value) return;
    const p = stampingPrefab.value;
    addStructure(p.style || p.id, x, y, p.width, p.height);
  }

  // --- Node Actions ---
  function addNode(x: number, y: number, partialData?: Partial<MapNode>): string {
    pushHistory();
    const timestamp = Temporal.Now.instant().epochMilliseconds.toString(36);
    const newId = `node_${timestamp}`;
    const newNode: MapNode = {
      name: partialData?.name || `Parada ${Object.keys(nodes.value).length + 1}`,
      type: partialData?.type || 'route',
      x: Math.round(x),
      y: Math.round(y),
      hasCenter: partialData?.hasCenter ?? false,
      farm: partialData?.farm || { t: 0, w: 0, m: 0, f: 0 },
      requiresMO: partialData?.requiresMO,
      blockMsg: partialData?.blockMsg,
      hasEvent: partialData?.hasEvent,
      weather: partialData?.weather
    };

    nodes.value[newId] = newNode;
    selectedNodeId.value = newId;
    saveToStorage();
    return newId;
  }

  function moveNode(id: string, x: number, y: number): void {
    const node = nodes.value[id];
    if (!node) return;
    node.x = Math.round(x);
    node.y = Math.round(y);
    saveToStorage();
  }

  function updateNodeData(id: string, partial: Partial<MapNode>): void {
    const node = nodes.value[id];
    if (!node) return;
    pushHistory();
    Object.assign(node, partial);
    saveToStorage();
  }

  function deleteNode(id: string): void {
    if (!nodes.value[id]) return;
    pushHistory();
    delete nodes.value[id];
    delete officialMapMapping.value[id];
    connections.value = connections.value.filter(([a, b]) => a !== id && b !== id);
    if (selectedNodeId.value === id) selectedNodeId.value = null;
    if (connectSourceNodeId.value === id) connectSourceNodeId.value = null;
    if (gpsStartNodeId.value === id) gpsStartNodeId.value = null;
    if (gpsTargetNodeId.value === id) gpsTargetNodeId.value = null;
    saveToStorage();
  }

  function setOfficialMapId(nodeId: string, officialId: string): void {
    if (!nodes.value[nodeId]) return;
    pushHistory();
    if (!officialId) {
      delete officialMapMapping.value[nodeId];
    } else {
      officialMapMapping.value[nodeId] = officialId;
    }
    saveToStorage();
  }

  function saveLocalMapForNode(nodeId: string, map: GeneratedMap): void {
    const node = nodes.value[nodeId];
    if (!node) return;
    node.localMap = JSON.parse(JSON.stringify(map));
    pushHistory();
    saveToStorage();
  }

  function getLocalMapForNode(nodeId: string): GeneratedMap | null { // domain-ok: Identificador o estructura procedural de aventura
    const node = nodes.value[nodeId];
    return node?.localMap ?? null;
  }

  // --- Connection Actions ---
  function toggleConnection(idA: string, idB: string): void {
    if (idA === idB) return;
    pushHistory();
    const existingIndex = connections.value.findIndex(
      ([a, b]) => (a === idA && b === idB) || (a === idB && b === idA)
    );

    if (existingIndex >= 0) {
      connections.value.splice(existingIndex, 1);
    } else {
      connections.value.push([idA, idB]);
    }
    saveToStorage();
  }

  function removeConnection(idA: string, idB: string): void {
    const existingIndex = connections.value.findIndex(
      ([a, b]) => (a === idA && b === idB) || (a === idB && b === idA)
    );
    if (existingIndex >= 0) {
      pushHistory();
      connections.value.splice(existingIndex, 1);
      saveToStorage();
    }
  }

  // --- GPS / Dijkstra Testing ---
  function testGPS(startId?: string | null, targetId?: string | null): void {
    const sId = startId ?? gpsStartNodeId.value;
    const tId = targetId ?? gpsTargetNodeId.value;
    if (!sId || !tId) return;

    gpsStartNodeId.value = sId;
    gpsTargetNodeId.value = tId;

    const allDiscovered = Object.keys(nodes.value);
    const mockInventory: Record<string, boolean> = {
      'Corte': true, // spanish-ok: Estructura o identificador procedural de aventura
      'Surf': true, // spanish-ok: Estructura o identificador procedural de aventura
      'Vuelo': true, // spanish-ok: Estructura o identificador procedural de aventura
      'Flauta': true,
      'Medallas': true,
      'Bicicleta': true // spanish-ok: Estructura o identificador procedural de aventura
    };

    const result = dijkstra(sId, tId, nodes.value, mockInventory, allDiscovered, connections.value);
    previewDijkstraNodes.value = result ? result.nodes : [];
  }

  function clearGPS(): void {
    gpsStartNodeId.value = null;
    gpsTargetNodeId.value = null;
    previewDijkstraNodes.value = [];
  }

  // --- Regeneration Flow ---
  function requestRegenerate(): void {
    if (hasManualModifications.value) {
      showConfirmRegenerateModal.value = true;
    } else {
      executeRegenerate();
    }
  }

  function executeRegenerate(): void {
    customTerrain.value = {};
    customStructures.value = [];
    showConfirmRegenerateModal.value = false;

    if (activeMode.value === 'tile' && activeEditingNodeId.value) {
      const activeNode = nodes.value[activeEditingNodeId.value];
      if (activeNode) {
        const freshMap = generateLocalMapForNode(activeNode, seed.value, {
          theme: 'firered',
          waterPercent: proceduralConfig.value.waterPercent,
          mountainPercent: proceduralConfig.value.mountainPercent,
          forestPercent: proceduralConfig.value.forestPercent
        });
        saveLocalMapForNode(activeEditingNodeId.value, freshMap);
        const mapStudioStore = useMapStudioStore();
        mapStudioStore.setMap(freshMap);
      }
    }

    triggerRebake();
  }

  // Viewport Actions
  function setZoom(newZoom: number): void {
    zoom.value = Math.max(ADVENTURE_MIN_ZOOM, Math.min(ADVENTURE_MAX_ZOOM, Number(newZoom.toFixed(2))));
  }

  function setPan(x: number, y: number): void {
    panX.value = Math.round(x);
    panY.value = Math.round(y);
  }

  // --- Storage & Defaults ---
  function saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    syncActiveProject();
    localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects.value));
    localStorage.setItem(STORAGE_ACTIVE_KEY, activeProjectId.value);
  }

  function loadFromStorage(): boolean {
    if (typeof localStorage === 'undefined') return false;
    const rawProjects = localStorage.getItem(STORAGE_PROJECTS_KEY);
    const rawActive = localStorage.getItem(STORAGE_ACTIVE_KEY);
    if (!rawProjects) return false;
    try {
      const parsed = JSON.parse(rawProjects);
      if (parsed && typeof parsed === 'object') {
        projects.value = parsed;
        const targetId = rawActive && parsed[rawActive] ? rawActive : 'kanto_canonical';
        selectProject(targetId);
        return true;
      }
    } catch {
      // ignore parsing error
    }
    return false;
  }

  function resetToDefault(): void {
    pushHistory();
    if (activeProject.value.archetype === 'johto') {
      const defaultJohto = getJohtoDefaultProject();
      nodes.value = JSON.parse(JSON.stringify(defaultJohto.nodes));
      connections.value = JSON.parse(JSON.stringify(defaultJohto.connections));
      seed.value = defaultJohto.seed;
    } else {
      const defaultKanto = getKantoDefaultProject();
      nodes.value = JSON.parse(JSON.stringify(defaultKanto.nodes));
      connections.value = JSON.parse(JSON.stringify(defaultKanto.connections));
      seed.value = defaultKanto.seed;
    }
    customTerrain.value = {};
    customStructures.value = [];
    tilesetProfile.value = 'gba';
    selectedNodeId.value = null;
    connectSourceNodeId.value = null;
    clearGPS();
    triggerRebake();
  }

  // --- Overworld Studio Actions ---
  function setNodeUrbanScale(nodeId: string, scale: UrbanScale): void {
    const node = nodes.value[nodeId];
    if (!node) return;
    pushHistory();
    node.urbanScale = scale;
    if (scale === 'metropolis') {
      node.type = 'league';
    } else if (scale === 'hamlet' || scale === 'village' || scale === 'town' || scale === 'city') {
      if (node.type === 'league') {
        node.type = 'city';
      }
    }
    saveToStorage();
    triggerRebake();
  }

  function generateProceduralContinent(customOptions?: Partial<ContinentalWorldGenOptions>): void {
    pushHistory();
    const result = generateCompleteContinentalWorld({
      seed: seed.value,
      config: proceduralConfig.value,
      themeSource: proceduralConfig.value.themeSource ?? 'firered',
      archetype: activeProject.value.archetype,
      cityCount: 12,
      ...customOptions
    });

    nodes.value = JSON.parse(JSON.stringify(result.nodes));
    connections.value = JSON.parse(JSON.stringify(result.connections));
    customTerrain.value = { ...result.customTerrain };
    customStructures.value = [];
    selectedNodeId.value = null;
    selectedStructureIndex.value = null;
    clearGPS();
    zoom.value = INITIAL_CONTINENT_ZOOM;
    panX.value = INITIAL_CONTINENT_PAN_X;
    panY.value = INITIAL_CONTINENT_PAN_Y;
    const firstNodeId = Object.keys(nodes.value)[0];
    if (firstNodeId) {
      selectedNodeId.value = firstNodeId;
    }
    saveToStorage();
    triggerRebake();
  }

  function exportRoutesBundle(): ContinentalRoutesExportBundle {
    syncActiveProject();
    return exportContinentalRoutesBundle(activeProject.value);
  }

  function downloadRoutesBundleJSON(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const bundle = exportRoutesBundle();
    const jsonStr = JSON.stringify(bundle, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProject.value.name || 'world_map'}_routes.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportContinentalMapPng(canvasElement?: HTMLCanvasElement | null): string | null {
    if (typeof window === 'undefined' || typeof document === 'undefined') return null;
    const canvas = canvasElement || (document.getElementById('regional-tile-canvas') as HTMLCanvasElement) || (document.getElementById('adventure-map-canvas') as HTMLCanvasElement);
    if (!canvas) {
      console.warn('[MapAdventureStudio] Canvas element not found for PNG export');
      return null;
    }
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${activeProject.value.name || 'world_map'}_continental.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return dataUrl;
  }

  // --- Export / Code Generation ---
  function generateTypeScriptCode(): string {
    const nodesJson = JSON.stringify(nodes.value, null, 2);
    const connJson = JSON.stringify(connections.value, null, 2);
    const mapIdJson = JSON.stringify(officialMapMapping.value, null, 2);

    return `export const rawNodes: Record<string, MapNode> = ${nodesJson};\n\n` +
      `export const connections: [string, string][] = ${connJson};\n\n` +
      `export const officialMapIdMap: Record<string, string> = ${mapIdJson};\n`;
  }

  async function copyTypeScriptCode(): Promise<boolean> {
    try {
      const code = generateTypeScriptCode();
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(code);
        return true;
      }
    } catch (err) {
      console.error('[MapAdventureStudio] Failed to copy code:', err);
    }
    return false;
  }

  return {
    // Projects & Modes
    projects,
    activeProjectId,
    activeProject,
    activeMode,
    activeEditingNodeId,
    selectProject,
    createProject,
    deleteProject,
    exportProjectJSON,
    importProjectJSON,
    saveLocalMapForNode,
    getLocalMapForNode,
    // Graph
    nodes,
    connections,
    officialMapMapping,
    activeTool,
    selectedNodeId,
    connectSourceNodeId,
    // Terrain
    brushSize,
    selectedBiome,
    customTerrain,
    terrainPaintTrigger,
    paintTerrain,
    // Structures
    customStructures,
    selectedStructureIndex,
    stampingPrefab,
    addStructure,
    moveStructure,
    deleteStructure,
    selectPrefab,
    stampCurrentPrefab,
    // Overworld Studio & Continental Generation
    setNodeUrbanScale,
    generateProceduralContinent,
    exportRoutesBundle,
    downloadRoutesBundleJSON,
    exportContinentalMapPng,
    // Viewport
    panX,
    panY,
    zoom,
    showBackgroundMap,
    showGrid,
    seed,
    tilesetProfile,
    proceduralConfig,
    isBakingTiles,
    tileTerrainTrigger,
    triggerRebake,
    teleportTo,
    // Modals & Drawers
    showConfigModal,
    showConfirmRegenerateModal,
    showTileCatalog,
    isSyncingAssets,
    toggleTileCatalog,
    hasManualModifications,
    requestRegenerate,
    executeRegenerate,
    // GPS
    gpsStartNodeId,
    gpsTargetNodeId,
    previewDijkstraNodes,
    // History
    canUndo,
    canRedo,
    pushHistory,
    undo,
    redo,
    addNode,
    moveNode,
    updateNodeData,
    deleteNode,
    setOfficialMapId,
    toggleConnection,
    removeConnection,
    testGPS,
    clearGPS,
    setZoom,
    setPan,
    saveToStorage,
    loadFromStorage,
    resetToDefault,
    generateTypeScriptCode,
    copyTypeScriptCode
  };
});
