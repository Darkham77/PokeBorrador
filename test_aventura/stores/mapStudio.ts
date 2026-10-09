/**
 * src/stores/mapStudio.ts
 *
 * MAP STUDIO PINIA STORE (SSoT)
 * Centralizes the active map state, tool selection, layers, viewport pan/zoom,
 * undo/redo history stack, and interactive test-drive mechanics.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  type GeneratedMap,
  type MapCell,
  type CollisionType,
  type MapWarp,
  type MapSpawn,
  stampStructure
} from '../logic/map/proceduralMapGenerator';
import { defaultTilesRegistry } from '../logic/map/tilesRegistry';
import {
  type StructureTemplate,
  getStructureTemplate,
  STRUCTURE_TEMPLATES,
  registerStructureTemplate
} from '../config/mapStructures';
import {
  loadCustomTilesFromStorage,
  loadCustomStructuresFromStorage,
  saveCustomStructuresToStorage
} from '../logic/map/customAssetsStorage';
import {
  MAP_PROPS_REGISTRY,
  type MapPropDefinition
} from '../config/mapProps';
import { STUDIO_MAX_HISTORY_STEPS } from '../config/studioConstants';

function propToStructureTemplate(prop: MapPropDefinition): StructureTemplate {
  return {
    id: prop.id,
    name: prop.name,
    theme: 'universal',
    footprint: { width: prop.width, height: prop.height },
    tiles: prop.tiles,
    collisionMask: prop.collisionMask
  };
}

const PROP_STRUCTURE_TEMPLATES: Record<string, StructureTemplate> = Object.fromEntries(
  Object.values(MAP_PROPS_REGISTRY).map(p => [p.id, propToStructureTemplate(p)])
);

export type StudioTool =
  | 'pointer'
  | 'brush'
  | 'eraser'
  | 'stamp'
  | 'collision'
  | 'entity'
  | 'eyedropper';

export type StudioLayer = 'ground' | 'elevation' | 'decorations' | 'collision';

export type StudioLayerKey =
  | 'ground'
  | 'elevation'
  | 'decorations'
  | 'collision'
  | 'entities'
  | 'grid';

export interface TileHistoryAction {
  readonly type: 'tile';
  readonly layer: 'ground' | 'elevation' | 'decorations';
  readonly x: number;
  readonly y: number;
  readonly prev: MapCell | null;
  readonly next: MapCell | null;
}

export interface CollisionHistoryAction {
  readonly type: 'collision';
  readonly x: number;
  readonly y: number;
  readonly prev: CollisionType;
  readonly next: CollisionType;
}

export interface StructureHistoryAction {
  readonly type: 'structure';
  readonly x: number;
  readonly y: number;
  readonly prevElevation: readonly { readonly x: number; readonly y: number; readonly cell: MapCell | null }[];
  readonly prevDecorations: readonly { readonly x: number; readonly y: number; readonly cell: MapCell | null }[];
  readonly prevCollisions: readonly { readonly x: number; readonly y: number; readonly col: CollisionType }[];
  readonly addedWarps: readonly MapWarp[];
  readonly addedSpawns: readonly MapSpawn[];
}

export type EntityMutationType = 'add' | 'remove';

export interface WarpHistoryAction {
  readonly type: 'warp';
  readonly action: EntityMutationType;
  readonly warp: MapWarp;
}

export interface SpawnHistoryAction {
  readonly type: 'spawn';
  readonly action: EntityMutationType;
  readonly spawn: MapSpawn;
}

export type HistoryAction =
  | TileHistoryAction
  | CollisionHistoryAction
  | StructureHistoryAction
  | WarpHistoryAction
  | SpawnHistoryAction;

export const MAX_HISTORY_STEPS = STUDIO_MAX_HISTORY_STEPS; // alias-ok
export const AUTOSAVE_STORAGE_KEY = 'pokevicio_map_studio_autosave';
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 4.0;
export const ZOOM_STEP = 0.25;
export const DEFAULT_GROUND_TILE = 'tile_vegetation_184ee2f2ca';

export const useMapStudioStore = defineStore('mapStudio', () => {
  // Map Data
  const currentMap = ref<GeneratedMap | null>(null);

  // Active Tool & Brush Settings
  const activeTool = ref<StudioTool>('brush');
  const activeLayer = ref<StudioLayer>('ground');
  const selectedTileId = ref<string>(DEFAULT_GROUND_TILE);
  const selectedStructureId = ref<string>('pokemon_center');
  const selectedCollisionType = ref<CollisionType>(1);

  // Layer Visibility
  const layerVisibility = ref<Record<StudioLayerKey, boolean>>({
    ground: true,
    elevation: true,
    decorations: true,
    collision: true,
    entities: true,
    grid: true
  });

  // Selection & Hover
  const hoverCoords = ref<{ x: number; y: number } | null>(null);
  const selectedCoords = ref<{ x: number; y: number } | null>(null);

  // Viewport
  const zoom = ref<number>(1.0);
  const panX = ref<number>(0);
  const panY = ref<number>(0);

  // Undo / Redo Stacks
  const historyStack = ref<HistoryAction[][]>([]);
  const redoStack = ref<HistoryAction[][]>([]);

  // Test Drive (Avatar walk testing)
  const testDriveActive = ref<boolean>(false);
  const playerX = ref<number>(0);
  const playerY = ref<number>(0);
  const playerDirection = ref<'up' | 'down' | 'left' | 'right'>('down');

  // Custom User-Imported Structures & Props
  const customStructures = ref<Record<string, StructureTemplate>>({});
  const availableStructures = computed<Record<string, StructureTemplate>>(() => {
    return { ...STRUCTURE_TEMPLATES, ...PROP_STRUCTURE_TEMPLATES, ...customStructures.value };
  });

  const availableProps = computed<Record<string, MapPropDefinition>>(() => MAP_PROPS_REGISTRY);

  function selectProp(propId: string): void {
    selectedStructureId.value = propId;
    activeTool.value = 'stamp';
    activeLayer.value = 'decorations';
  }

  // Computed state
  const canUndo = computed(() => historyStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);
  const selectedStructure = computed(() => {
    return availableStructures.value[selectedStructureId.value] ?? getStructureTemplate(selectedStructureId.value);
  });

  function registerCustomStructure(template: StructureTemplate): void {
    registerStructureTemplate(template);
    customStructures.value = { ...customStructures.value, [template.id]: template };
    void saveCustomStructuresToStorage(Object.values(customStructures.value));
  }

  async function loadPersistedCustomAssets(): Promise<void> {
    const tiles = await loadCustomTilesFromStorage();
    if (tiles.length > 0) {
      defaultTilesRegistry.registerTiles(tiles);
    }
    const structs = await loadCustomStructuresFromStorage();
    if (structs.length > 0) {
      const map: Record<string, StructureTemplate> = {};
      for (const s of structs) {
        registerStructureTemplate(s);
        map[s.id] = s;
      }
      customStructures.value = map;
    }
  }

  void loadPersistedCustomAssets();

  /**
   * Initializes or replaces the active map.
   */
  function setMap(map: GeneratedMap): void {
    currentMap.value = map;
    historyStack.value = [];
    redoStack.value = [];
    selectedCoords.value = null;

    // Center player on player_start spawn if available
    const startSpawn = map.entities?.spawns.find(s => s.id === 'player_start');
    if (startSpawn) {
      playerX.value = startSpawn.x;
      playerY.value = startSpawn.y;
    } else {
      playerX.value = Math.floor(map.width / 2);
      playerY.value = Math.floor(map.height / 2);
    }
  }

  /**
   * Pushes a batch of actions to the undo stack.
   */
  function pushHistory(batch: HistoryAction[]): void {
    if (batch.length === 0) return;
    historyStack.value.push(batch);
    if (historyStack.value.length > MAX_HISTORY_STEPS) {
      historyStack.value.shift();
    }
    redoStack.value = [];
    autoSave();
  }

  /**
   * Builds a MapCell from tile ID.
   */
  function makeCell(tileId: string): MapCell {
    const entry = defaultTilesRegistry.getTileById(tileId);
    const filePath = entry ? entry.file_path : `/assets/tiles/structures/${tileId}.png`;
    return { tileId, filePath, collision: false };
  }

  /**
   * Paints a single tile on the active layer at (x, y).
   */
  function paintTile(x: number, y: number, tileId: string = selectedTileId.value): boolean {
    const map = currentMap.value;
    if (!map || x < 0 || y < 0 || x >= map.width || y >= map.height) return false;

    const layerName = activeLayer.value === 'collision' ? 'ground' : activeLayer.value;
    const targetLayer = map.layers[layerName] as (MapCell | null)[][];
    const prevCell = targetLayer[y]?.[x] ?? null;

    if (prevCell?.tileId === tileId) return false;

    const newCell = makeCell(tileId);
    targetLayer[y]![x] = newCell;

    pushHistory([
      {
        type: 'tile',
        layer: layerName,
        x,
        y,
        prev: prevCell,
        next: newCell
      }
    ]);

    return true;
  }

  /**
   * Erases a tile from the active layer at (x, y).
   */
  function eraseTile(x: number, y: number): boolean {
    const map = currentMap.value;
    if (!map || x < 0 || y < 0 || x >= map.width || y >= map.height) return false;

    const layerName = activeLayer.value === 'collision' ? 'ground' : activeLayer.value;
    const targetLayer = map.layers[layerName] as (MapCell | null)[][];
    const prevCell = targetLayer[y]?.[x] ?? null;

    if (layerName === 'ground') {
      if (prevCell?.tileId === DEFAULT_GROUND_TILE) return false;
      const grassCell = makeCell(DEFAULT_GROUND_TILE);
      targetLayer[y]![x] = grassCell;
      pushHistory([{ type: 'tile', layer: 'ground', x, y, prev: prevCell, next: grassCell }]);
    } else {
      if (prevCell === null) return false;
      targetLayer[y]![x] = null;
      pushHistory([{ type: 'tile', layer: layerName, x, y, prev: prevCell, next: null }]);
    }

    return true;
  }

  /**
   * Paints a collision value (0, 1, 2, 3) at (x, y).
   */
  function paintCollision(x: number, y: number, colType: CollisionType = selectedCollisionType.value): boolean {
    const map = currentMap.value;
    if (!map || x < 0 || y < 0 || x >= map.width || y >= map.height) return false;

    const matrix = map.collisionMatrix as CollisionType[][];
    const prevCol = matrix[y]?.[x] ?? 0;
    if (prevCol === colType) return false;

    matrix[y]![x] = colType;
    pushHistory([{ type: 'collision', x, y, prev: prevCol, next: colType }]);

    return true;
  }

  /**
   * Stamps the currently selected structure template at (gridX, gridY).
   */
  function stampCurrentStructure(gridX: number, gridY: number): boolean {
    const map = currentMap.value;
    const template = selectedStructure.value;
    if (!map || !template) return false;

    const { width: footW, height: footH } = template.footprint;
    if (gridX < 0 || gridY < 0 || gridX + footW > map.width || gridY + footH > map.height) {
      return false;
    }

    // Capture previous state for undo
    const prevElevation: { x: number; y: number; cell: MapCell | null }[] = [];
    const prevDecorations: { x: number; y: number; cell: MapCell | null }[] = [];
    const prevCollisions: { x: number; y: number; col: CollisionType }[] = [];

    const elevLayer = map.layers.elevation as (MapCell | null)[][];
    const decLayer = map.layers.decorations as (MapCell | null)[][];
    const colMatrix = map.collisionMatrix as CollisionType[][];

    for (let r = 0; r < footH; r++) {
      for (let c = 0; c < footW; c++) {
        const gx = gridX + c;
        const gy = gridY + r;
        prevElevation.push({ x: gx, y: gy, cell: elevLayer[gy]?.[gx] ?? null });
        prevDecorations.push({ x: gx, y: gy, cell: decLayer[gy]?.[gx] ?? null });
        prevCollisions.push({ x: gx, y: gy, col: colMatrix[gy]?.[gx] ?? 0 });
      }
    }

    const warpsBeforeCount = map.entities.warps.length;
    const spawnsBeforeCount = map.entities.spawns.length;

    const success = stampStructure(map, template, gridX, gridY, defaultTilesRegistry);
    if (!success) return false;

    const addedWarps = map.entities.warps.slice(warpsBeforeCount);
    const addedSpawns = map.entities.spawns.slice(spawnsBeforeCount);

    pushHistory([
      {
        type: 'structure',
        x: gridX,
        y: gridY,
        prevElevation,
        prevDecorations,
        prevCollisions,
        addedWarps,
        addedSpawns
      }
    ]);

    return true;
  }

  /**
   * Adds or updates a Warp entity.
   */
  function setWarp(warp: MapWarp): void {
    const map = currentMap.value;
    if (!map) return;
    const warps = map.entities.warps as MapWarp[];
    const idx = warps.findIndex(w => w.x === warp.x && w.y === warp.y);
    if (idx !== -1) warps.splice(idx, 1);
    warps.push(warp);
    pushHistory([{ type: 'warp', action: 'add', warp }]);
  }

  /**
   * Removes a Warp entity at (x, y).
   */
  function removeWarp(x: number, y: number): void {
    const map = currentMap.value;
    if (!map) return;
    const warps = map.entities.warps as MapWarp[];
    const idx = warps.findIndex(w => w.x === x && w.y === y);
    if (idx !== -1) {
      const removed = warps.splice(idx, 1)[0]!;
      pushHistory([{ type: 'warp', action: 'remove', warp: removed }]);
    }
  }

  /**
   * Adds or updates a Spawn entity.
   */
  function setSpawn(spawn: MapSpawn): void {
    const map = currentMap.value;
    if (!map) return;
    const spawns = map.entities.spawns as MapSpawn[];
    const idx = spawns.findIndex(s => s.id === spawn.id);
    if (idx !== -1) spawns.splice(idx, 1);
    spawns.push(spawn);
    pushHistory([{ type: 'spawn', action: 'add', spawn }]);
  }

  /**
   * Removes a Spawn entity by ID.
   */
  function removeSpawn(id: string): void {
    const map = currentMap.value;
    if (!map) return;
    const spawns = map.entities.spawns as MapSpawn[];
    const idx = spawns.findIndex(s => s.id === id);
    if (idx !== -1) {
      const removed = spawns.splice(idx, 1)[0]!;
      pushHistory([{ type: 'spawn', action: 'remove', spawn: removed }]);
    }
  }

  /**
   * Undo the last batch of actions.
   */
  function undo(): void {
    const map = currentMap.value;
    if (!map || historyStack.value.length === 0) return;

    const batch = historyStack.value.pop()!;
    for (let i = batch.length - 1; i >= 0; i--) {
      const act = batch[i]!;
      if (act.type === 'tile') {
        const layer = map.layers[act.layer] as (MapCell | null)[][];
        layer[act.y]![act.x] = act.prev;
      } else if (act.type === 'collision') {
        const colMat = map.collisionMatrix as CollisionType[][];
        colMat[act.y]![act.x] = act.prev;
      } else if (act.type === 'structure') {
        const elev = map.layers.elevation as (MapCell | null)[][];
        const dec = map.layers.decorations as (MapCell | null)[][];
        const colMat = map.collisionMatrix as CollisionType[][];
        for (const item of act.prevElevation) elev[item.y]![item.x] = item.cell;
        for (const item of act.prevDecorations) dec[item.y]![item.x] = item.cell;
        for (const item of act.prevCollisions) colMat[item.y]![item.x] = item.col;

        // Remove added warps and spawns
        const warps = map.entities.warps as MapWarp[];
        for (const w of act.addedWarps) {
          const idx = warps.findIndex(item => item.x === w.x && item.y === w.y);
          if (idx !== -1) warps.splice(idx, 1);
        }
        const spawns = map.entities.spawns as MapSpawn[];
        for (const s of act.addedSpawns) {
          const idx = spawns.findIndex(item => item.id === s.id);
          if (idx !== -1) spawns.splice(idx, 1);
        }
      } else if (act.type === 'warp') {
        const warps = map.entities.warps as MapWarp[];
        if (act.action === 'add') {
          const idx = warps.findIndex(w => w.x === act.warp.x && w.y === act.warp.y);
          if (idx !== -1) warps.splice(idx, 1);
        } else {
          warps.push(act.warp);
        }
      } else if (act.type === 'spawn') {
        const spawns = map.entities.spawns as MapSpawn[];
        if (act.action === 'add') {
          const idx = spawns.findIndex(s => s.id === act.spawn.id);
          if (idx !== -1) spawns.splice(idx, 1);
        } else {
          spawns.push(act.spawn);
        }
      }
    }

    redoStack.value.push(batch);
    autoSave();
  }

  /**
   * Redo the last undone batch of actions.
   */
  function redo(): void {
    const map = currentMap.value;
    if (!map || redoStack.value.length === 0) return;

    const batch = redoStack.value.pop()!;
    for (const act of batch) {
      if (act.type === 'tile') {
        const layer = map.layers[act.layer] as (MapCell | null)[][];
        layer[act.y]![act.x] = act.next;
      } else if (act.type === 'collision') {
        const colMat = map.collisionMatrix as CollisionType[][];
        colMat[act.y]![act.x] = act.next;
      } else if (act.type === 'structure') {
        const template = getStructureTemplate(selectedStructureId.value);
        if (template) stampStructure(map, template, act.x, act.y, defaultTilesRegistry);
      } else if (act.type === 'warp') {
        const warps = map.entities.warps as MapWarp[];
        if (act.action === 'add') {
          warps.push(act.warp);
        } else {
          const idx = warps.findIndex(w => w.x === act.warp.x && w.y === act.warp.y);
          if (idx !== -1) warps.splice(idx, 1);
        }
      } else if (act.type === 'spawn') {
        const spawns = map.entities.spawns as MapSpawn[];
        if (act.action === 'add') {
          spawns.push(act.spawn);
        } else {
          const idx = spawns.findIndex(s => s.id === act.spawn.id);
          if (idx !== -1) spawns.splice(idx, 1);
        }
      }
    }

    historyStack.value.push(batch);
    autoSave();
  }

  /**
   * Viewport zoom adjustments.
   */
  function zoomIn(): void {
    zoom.value = Math.min(MAX_ZOOM, Number((zoom.value + ZOOM_STEP).toFixed(2)));
  }

  function zoomOut(): void {
    zoom.value = Math.max(MIN_ZOOM, Number((zoom.value - ZOOM_STEP).toFixed(2)));
  }

  function resetZoom(): void {
    zoom.value = 1.0;
    panX.value = 0;
    panY.value = 0;
  }

  /**
   * Test Drive avatar movement and collision check.
   */
  function movePlayer(dx: number, dy: number, dir: 'up' | 'down' | 'left' | 'right'): boolean {
    const map = currentMap.value;
    if (!map || !testDriveActive.value) return false;

    playerDirection.value = dir;
    const nx = playerX.value + dx;
    const ny = playerY.value + dy;

    if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) return false;

    const col = map.collisionMatrix[ny]?.[nx] ?? 1;

    // 0: Walkable
    if (col === 0) {
      playerX.value = nx;
      playerY.value = ny;
      return true;
    }

    // 3: Jumpable Ledge (hop 2 tiles down if moving south)
    if (col === 3 && dy === 1 && dx === 0) {
      const hopY = ny + 1;
      if (hopY < map.height && map.collisionMatrix[hopY]?.[nx] === 0) {
        playerX.value = nx;
        playerY.value = hopY;
        return true;
      }
    }

    return false;
  }

  /**
   * Auto-save state to browser local storage.
   */
  function autoSave(): void {
    if (!currentMap.value || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(currentMap.value));
    } catch {
      // Storage full or restricted
    }
  }

  /**
   * Load saved map from browser local storage.
   */
  function loadFromStorage(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as GeneratedMap;
      setMap(parsed);
      return true;
    } catch {
      return false;
    }
  }

  return {
    currentMap,
    activeTool,
    activeLayer,
    selectedTileId,
    selectedStructureId,
    selectedCollisionType,
    layerVisibility,
    hoverCoords,
    selectedCoords,
    zoom,
    panX,
    panY,
    testDriveActive,
    playerX,
    playerY,
    playerDirection,
    canUndo,
    canRedo,
    selectedStructure,
    customStructures,
    availableStructures,
    availableProps,
    selectProp,
    registerCustomStructure,
    loadPersistedCustomAssets,
    setMap,
    paintTile,
    eraseTile,
    paintCollision,
    stampCurrentStructure,
    setWarp,
    removeWarp,
    setSpawn,
    removeSpawn,
    undo,
    redo,
    zoomIn,
    zoomOut,
    resetZoom,
    movePlayer,
    autoSave,
    loadFromStorage
  };
});
