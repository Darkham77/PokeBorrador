<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useContinentStudioStore } from '../../stores/continentStudio';
import {
  DynamicCatalogLoader,
  UniversalAutotiler,
  SemanticPrefabRenderer
} from '../../logic/map/kantoTileEngine';
import { ChunkManager } from '../../logic/map/kantoChunkManager';
import {
  CELL_BIOME,
  OCCUPANCY_FLAGS,
  KANTO_WORLD_WIDTH,
  KANTO_WORLD_HEIGHT,
  KANTO_TILE_SIZE,
  KANTO_GRID_W,
  KANTO_GRID_H,
  type CellBiomeType
} from '../../types/map/kantoGridModel';
import { KantoRegionalWorldGenerator } from '../../logic/map/kantoRegionalGenerator';
import { bakeUrbanMaquette } from '../../logic/map/continentalWorldGenerator';
import { defaultPrefabsRegistry } from '../../logic/map/prefabsRegistry';
import { findValidBuildingPlacementSpot } from '../../logic/map/buildingPlacementSolver';
import {
  VIEWPORT_ZOOM_IN_STEP,
  VIEWPORT_ZOOM_OUT_STEP,
  MIN_PLAZA_CLEARANCE_RADIUS_PX,
  DEFAULT_PREFAB_FALLBACK_WIDTH,
  DEFAULT_PREFAB_FALLBACK_HEIGHT
} from '../../config/studioConstants.ts';
import type { PlacedCustomSprite, SpriteCategory } from '../../types/map/continentTypes';
import { PERCENT_BASE_MULTIPLIER } from '@/logic/constants/gameplay';

const MIN_GEOGRAPHIC_VIEWPORT_ZOOM = 0.15;
const MOUNTAIN_INFILL_NEIGHBOR_THRESHOLD = 6 as const;

interface WorldPoint {
  readonly x: number;
  readonly y: number;
}

function countMountainNeighbors(
  grid: readonly (ArrayLike<number> | undefined)[],
  x: number,
  y: number
): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (grid[y + dy]?.[x + dx] === CELL_BIOME.MOUNTAIN_DIRT) count++;
    }
  }
  return count;
}

function checkMountainTier2Margin(
  grid: readonly (ArrayLike<number> | undefined)[],
  x: number,
  y: number,
  radius: number
): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (grid[y + dy]?.[x + dx] !== CELL_BIOME.MOUNTAIN_DIRT) {
        return false;
      }
    }
  }
  return true;
}

const store = useContinentStudioStore();

const zoomPercentText = computed(() => `${Math.round(store.zoom * PERCENT_BASE_MULTIPLIER)}% Zoom`);

const canvasRef = ref<HTMLCanvasElement | null>(null);
const viewportRef = ref<HTMLDivElement | null>(null);

// Interaction & Navigation State
const isPanning = ref(false);
const isSpacePressed = ref(false);
const panStart = ref({ x: 0, y: 0 });
const panOrigin = ref({ x: 0, y: 0 });
const mouseWorldPos = ref({ x: 0, y: 0 });

// Editing State
const isPaintingTerrain = ref(false);
const lastPaintedTile = ref<{ gx: number; gy: number } | null>(null);
const isDraggingStructure = ref(false);
const draggedStructureIdx = ref<number | null>(null);
const dragStartMouse = ref({ x: 0, y: 0 });
const dragStartStructPos = ref({ x: 0, y: 0 });

// Engine Singletons
const catalogLoader = new DynamicCatalogLoader();
const autotiler = new UniversalAutotiler(catalogLoader);
const prefabRenderer = new SemanticPrefabRenderer(catalogLoader);
const kantoGenerator = new KantoRegionalWorldGenerator(catalogLoader);
const chunkManager = new ChunkManager();
const isBaking = ref(false);

const transformStyle = computed(() => ({
  transform: `translate3d(${store.panX}px, ${store.panY}px, 0) scale(${store.zoom})`,
  transformOrigin: '0 0'
}));

function screenToWorld(clientX: number, clientY: number) {
  if (!viewportRef.value) return { x: 0, y: 0 };
  const rect = viewportRef.value.getBoundingClientRect();
  const x = (clientX - rect.left - store.panX) / store.zoom;
  const y = (clientY - rect.top - store.panY) / store.zoom;
  return {
    x: Math.max(0, Math.min(KANTO_WORLD_WIDTH, x)),
    y: Math.max(0, Math.min(KANTO_WORLD_HEIGHT, y))
  };
}

function handleWheel(e: WheelEvent) {
  e.preventDefault();
  if (!viewportRef.value) return;
  const rect = viewportRef.value.getBoundingClientRect();
  const cursorX = e.clientX - rect.left;
  const cursorY = e.clientY - rect.top;

  const currentZoom = store.zoom;
  const zoomFactor = e.deltaY < 0 ? VIEWPORT_ZOOM_IN_STEP : VIEWPORT_ZOOM_OUT_STEP;
  const nextZoom = Math.max(MIN_GEOGRAPHIC_VIEWPORT_ZOOM, Math.min(3.0, currentZoom * zoomFactor));

  const newPanX = cursorX - (cursorX - store.panX) * (nextZoom / currentZoom);
  const newPanY = cursorY - (cursorY - store.panY) * (nextZoom / currentZoom);

  store.setZoom(nextZoom);
  store.setPan(newPanX, newPanY);
}

function drawBakedChunks(): void {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, KANTO_WORLD_WIDTH, KANTO_WORLD_HEIGHT);
  chunkManager.renderTo(ctx, 0, 0, KANTO_WORLD_WIDTH, KANTO_WORLD_HEIGHT);
}

function inferUrbanScale(id: string, name: string): 'metropolis' | 'city' | 'town' | 'village' {
  const lower = `${id}_${name}`.toLowerCase();
  if (
    lower.includes('saffron') ||
    lower.includes('celadon') ||
    lower.includes('goldenrod') ||
    lower.includes('metro')
  )
    return 'metropolis';
  if (
    lower.includes('cerulean') ||
    lower.includes('vermilion') ||
    lower.includes('fuchsia') ||
    lower.includes('cinnabar') ||
    lower.includes('pewter') ||
    lower.includes('gym')
  )
    return 'city';
  if (
    lower.includes('pallet') ||
    lower.includes('lavender') ||
    lower.includes('village') ||
    lower.includes('lab')
  )
    return 'village';
  return 'town';
}

function syncUrbanMaquettes(gen: KantoRegionalWorldGenerator): void {
  // If editing canonical Kanto preset, preserve canonical town architectures generated by kantoRegionalGenerator
  if (store.activeProject.config.presetId === 'kanto') {
    return;
  }

  const g = gen.grid;
  for (const node of Object.values(store.activeProject.nodes)) {
    if (!node) continue;
    const id = node.id;
    const cx = Math.round(node.x);
    const cy = Math.round(node.y);

    // Clear auto-generated structures near this city center for procedural maps
    gen.buildings = gen.buildings.filter(
      (b) => Math.hypot(b.x - cx, b.y - cy) > MIN_PLAZA_CLEARANCE_RADIUS_PX
    );
    gen.props = gen.props.filter(
      (p) => Math.hypot(p.x - cx, p.y - cy) > MIN_PLAZA_CLEARANCE_RADIUS_PX
    );

    const urbanScale = node.scale ?? inferUrbanScale(id, node.name);
    const maquette = bakeUrbanMaquette(
      {
        id,
        name: node.name,
        type: 'town',
        x: cx,
        y: cy,
        urbanScale
      },
      store.activeProject.config.seed
    );

    // Pave central plaza if defined with clean dirt paths
    if (maquette.plazaRect) {
      const pxStart = Math.floor(maquette.plazaRect.x / KANTO_TILE_SIZE);
      const pyStart = Math.floor(maquette.plazaRect.y / KANTO_TILE_SIZE);
      const pw = Math.ceil(maquette.plazaRect.w / KANTO_TILE_SIZE);
      const ph = Math.ceil(maquette.plazaRect.h / KANTO_TILE_SIZE);
      for (let y = pyStart; y < pyStart + ph; y++) {
        for (let x = pxStart; x < pxStart + pw; x++) {
          if (x < 0 || x >= KANTO_GRID_W || y < 0 || y >= KANTO_GRID_H) continue;
          const row = g[y];
          if (!row || row[x] === CELL_BIOME.WATER || row[x] === CELL_BIOME.MOUNTAIN_DIRT) continue;
          row[x] = CELL_BIOME.DIRT_PATH;
          gen.occupancy.set(x, y, OCCUPANCY_FLAGS.ROAD);
        }
      }
    }

    // Place buildings snapped to 32px
    for (const b of maquette.buildings) {
      const snapX = Math.round(b.x / KANTO_TILE_SIZE) * KANTO_TILE_SIZE;
      const snapY = Math.round(b.y / KANTO_TILE_SIZE) * KANTO_TILE_SIZE;
      const placement = findValidBuildingPlacementSpot(gen, snapX, snapY, b.w, b.h);
      if (!placement.found) continue;

      const bx = placement.tx;
      const by = placement.ty;
      const bw = Math.ceil(b.w / KANTO_TILE_SIZE);
      const bh = Math.ceil(b.h / KANTO_TILE_SIZE);

      // Clear trees from footprint (keeping natural grass base)
      for (let y = by; y < by + bh; y++) {
        for (let x = bx; x < bx + bw; x++) {
          if (x >= 0 && x < KANTO_GRID_W && y >= 0 && y < KANTO_GRID_H) {
            const row = g[y];
            if (row && row[x] === CELL_BIOME.FOREST_WALL) {
              row[x] = CELL_BIOME.GRASS;
            }
          }
        }
      }
      gen.buildings.push({ style: b.style, x: snapX, y: snapY, w: b.w, h: b.h });
      if (bx >= 0 && bx + bw < KANTO_GRID_W && by >= 0 && by + bh < KANTO_GRID_H) {
        gen.occupancy.reserveRect(bx, by, bw, bh, OCCUPANCY_FLAGS.BUILDING);
      }

      // Pave 1-tile door path downward
      const doorX = bx + Math.floor(bw / 2);
      const doorY = by + bh;
      for (let step = 0; step <= 2; step++) {
        const cy = doorY + step;
        if (cy >= 0 && cy < KANTO_GRID_H && doorX >= 0 && doorX < KANTO_GRID_W) {
          const row = g[cy];
          if (row && row[doorX] !== CELL_BIOME.WATER && row[doorX] !== CELL_BIOME.MOUNTAIN_DIRT) {
            row[doorX] = CELL_BIOME.DIRT_PATH;
            gen.occupancy.set(doorX, cy, OCCUPANCY_FLAGS.SIDEWALK);
          }
        }
      }
    }

    for (const p of maquette.props) {
      const snapPx = Math.round(p.x / KANTO_TILE_SIZE) * KANTO_TILE_SIZE;
      const snapPy = Math.round(p.y / KANTO_TILE_SIZE) * KANTO_TILE_SIZE;
      gen.props.push({
        style: p.style,
        x: snapPx,
        y: snapPy,
        w: KANTO_TILE_SIZE,
        h: KANTO_TILE_SIZE
      });
    }
  }
}

function syncPlacedStructures(gen: KantoRegionalWorldGenerator): void {
  for (const s of store.activeProject.placedSprites ?? []) {
    if (s.category === 'building') {
      gen.buildings.push({ style: s.spriteId, x: s.x, y: s.y, w: s.width, h: s.height });
    } else if (s.category === 'tree') {
      gen.trees.push({ style: s.spriteId, x: s.x, y: s.y });
    } else {
      gen.props.push({ style: s.spriteId, x: s.x, y: s.y, w: s.width, h: s.height });
    }
  }
}

function biomeToCellType(biome: string): CellBiomeType {
  switch (biome) {
    case 'path':
      return CELL_BIOME.DIRT_PATH;
    case 'water':
    case 'ocean':
    case 'beach':
      return CELL_BIOME.WATER;
    case 'forest':
      return CELL_BIOME.TALL_GRASS;
    case 'mountain':
    case 'snow':
      return CELL_BIOME.MOUNTAIN_DIRT;
    case 'grass':
    default:
      return CELL_BIOME.GRASS;
  }
}

async function bakeWorld(): Promise<void> {
  if (isBaking.value) return;
  isBaking.value = true;
  try {
    await catalogLoader.init();
    await defaultPrefabsRegistry.loadManifest();

    const gen = kantoGenerator;
    const project = store.activeProject;

    // 1. Generate base Kanto layout or procedural continent
    const kantoNodesRecord: Record<string, { name: string; type: string; x: number; y: number }> = // open-record: Procedural project node coordinates indexed by node id
      {};
    for (const node of Object.values(project.nodes)) {
      kantoNodesRecord[node.id] = {
        name: node.name,
        type: 'city',
        x: Math.round(node.x),
        y: Math.round(node.y)
      };
    }
    const kantoConns: [string, string][] = project.connections.map(([u, v]) => [u, v]);

    gen.generate(kantoNodesRecord, kantoConns, project.config.seed);

    // 2. Overlay procedural or custom terrain biomes
    const genResult = store.ensureGeneratedResult();
    const { gridWidth, gridHeight, biomeGrid } = genResult;

    if (project.config.presetId !== 'kanto' && biomeGrid.length > 0) {
      for (let y = 0; y < Math.min(KANTO_GRID_H, gridHeight); y++) {
        const row = gen.grid[y];
        const bRow = biomeGrid[y];
        if (!row || !bRow) continue;
        for (let x = 0; x < Math.min(KANTO_GRID_W, gridWidth); x++) {
          row[x] = biomeToCellType(bRow[x] ?? 'grass');
        }
      }
    }

    // Apply custom terrain overrides
    for (const [key, b] of Object.entries(project.customTerrain ?? {})) {
      const [gxStr, gyStr] = key.split(',');
      const gx = Number(gxStr);
      const gy = Number(gyStr);
      if (gx >= 0 && gx < KANTO_GRID_W && gy >= 0 && gy < KANTO_GRID_H) {
        const r = gen.grid[gy];
        if (r && typeof b === 'string') r[gx] = biomeToCellType(b);
      }
    }

    // 2.1 Calculate multi-tier elevation and filter obstacles for procedural geography
    if (project.config.presetId !== 'kanto') {
      const H = KANTO_GRID_H;
      const W = KANTO_GRID_W;

      // Clear canonical Kanto structures so they do not bleed onto procedural geography
      gen.buildings = [];
      gen.props = [];
      gen.trees = [];
      gen.occupancy.clearAll();

      // Morphological smoothing for mountains:
      // 1. Fill 1x1 holes inside mountain massifs (non-mountain cells with >= 6 mountain neighbors)
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const cell = gen.grid[y]?.[x];
          if (cell === CELL_BIOME.MOUNTAIN_DIRT || cell === CELL_BIOME.WATER) continue;
          if (countMountainNeighbors(gen.grid, x, y) >= MOUNTAIN_INFILL_NEIGHBOR_THRESHOLD) {
            gen.grid[y]![x] = CELL_BIOME.MOUNTAIN_DIRT;
          }
        }
      }

      // 2. Clean up 1x1 isolated mountain noise (mountain cells with <= 1 mountain neighbor)
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          if (gen.grid[y]?.[x] === CELL_BIOME.MOUNTAIN_DIRT) {
            let mtNeighbors = 0;
            if (gen.grid[y - 1]?.[x] === CELL_BIOME.MOUNTAIN_DIRT) mtNeighbors++;
            if (gen.grid[y + 1]?.[x] === CELL_BIOME.MOUNTAIN_DIRT) mtNeighbors++;
            if (gen.grid[y]?.[x - 1] === CELL_BIOME.MOUNTAIN_DIRT) mtNeighbors++;
            if (gen.grid[y]?.[x + 1] === CELL_BIOME.MOUNTAIN_DIRT) mtNeighbors++;
            if (mtNeighbors <= 1) {
              gen.grid[y]![x] = CELL_BIOME.GRASS;
              gen.nature.push({
                style: 'rock_small_01',
                x: x * KANTO_TILE_SIZE,
                y: y * KANTO_TILE_SIZE
              });
            }
          }
        }
      }

      // 3. Clean up 1-tile thin pinches iteratively until 0 remain
      let pinchesPruned = true;
      while (pinchesPruned) {
        pinchesPruned = false;
        for (let y = 1; y < H - 1; y++) {
          for (let x = 1; x < W - 1; x++) {
            if (gen.grid[y]?.[x] === CELL_BIOME.MOUNTAIN_DIRT) {
              const n = gen.grid[y - 1]?.[x] === CELL_BIOME.MOUNTAIN_DIRT;
              const s = gen.grid[y + 1]?.[x] === CELL_BIOME.MOUNTAIN_DIRT;
              const w = gen.grid[y]?.[x - 1] === CELL_BIOME.MOUNTAIN_DIRT;
              const e = gen.grid[y]?.[x + 1] === CELL_BIOME.MOUNTAIN_DIRT;
              if ((!n && !s) || (!w && !e)) {
                gen.grid[y]![x] = CELL_BIOME.GRASS;
                pinchesPruned = true;
              }
            }
          }
        }
      }

      if (!gen.elevation || gen.elevation.length !== H) {
        gen.elevation = Array.from({ length: H }, () => new Uint8Array(W).fill(1));
      }

      // Base elevation assignment
      for (let y = 0; y < H; y++) {
        const row = gen.grid[y];
        const eRow = gen.elevation[y];
        if (!row || !eRow) continue;
        for (let x = 0; x < W; x++) {
          if (row[x] === CELL_BIOME.MOUNTAIN_DIRT) {
            eRow[x] = 2; // Tier 1: Mountain on grass
          } else if (row[x] === CELL_BIOME.WATER) {
            eRow[x] = 0; // Water
          } else {
            eRow[x] = 1; // Ground level
          }
        }
      }

      // Multi-tier promotion for interior mountain cells (solid cohesive upper rock plateaus)
      // Candidates must have a margin of at least 2 tiles from non-mountain cells to prevent
      // Tier 2 cliffs from directly abutting lower grass borders.
      const MOUNTAIN_TIER2_SETBACK_RADIUS = 2 as const;
      const tier2Candidates = new Set<number>();
      for (let y = 2; y < H - 2; y++) {
        for (let x = 2; x < W - 2; x++) {
          if (gen.grid[y]?.[x] !== CELL_BIOME.MOUNTAIN_DIRT) continue;
          if (checkMountainTier2Margin(gen.grid, x, y, MOUNTAIN_TIER2_SETBACK_RADIUS)) {
            tier2Candidates.add(y * W + x);
          }
        }
      }

      // Keep only cells that form a cohesive cluster (>= 4 candidate neighbors) to avoid 1-tile spikes
      for (const key of tier2Candidates) {
        const cx = key % W;
        const cy = Math.floor(key / W);
        let candidateNeighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (tier2Candidates.has((cy + dy) * W + (cx + dx))) {
              candidateNeighbors++;
            }
          }
        }
        if (candidateNeighbors >= 4) {
          const eRow = gen.elevation[cy];
          if (eRow) eRow[cx] = 3; // Tier 2: Mountain on rock
        }
      }

      // In procedural mode, replace dense canonical forest wall with trees only in actual 'forest' biomes
      gen.trees = [];
      if (biomeGrid.length > 0) {
        for (let y = 0; y < Math.min(KANTO_GRID_H - 1, gridHeight); y += 2) {
          const bRow = biomeGrid[y];
          if (!bRow) continue;
          for (let x = 0; x < Math.min(KANTO_GRID_W - 1, gridWidth); x += 2) {
            if (
              bRow[x] === 'forest' &&
              gen.grid[y]?.[x] !== CELL_BIOME.MOUNTAIN_DIRT &&
              gen.grid[y]?.[x] !== CELL_BIOME.WATER
            ) {
              gen.trees.push({
                style: 'tree_viridian_forest',
                x: x * KANTO_TILE_SIZE,
                y: y * KANTO_TILE_SIZE
              });
            }
          }
        }
      }

      gen.nature = gen.nature.filter((n) => {
        const gx = Math.floor(n.x / KANTO_TILE_SIZE);
        const gy = Math.floor(n.y / KANTO_TILE_SIZE);
        const cell = gen.grid[gy]?.[gx];
        return cell !== CELL_BIOME.MOUNTAIN_DIRT && cell !== CELL_BIOME.WATER;
      });
    }

    // 3. Bake cities & structures
    syncUrbanMaquettes(gen);
    syncPlacedStructures(gen);

    // 4. Bake all chunks
    chunkManager.bakeAll(autotiler, prefabRenderer, gen);
    drawBakedChunks();
  } catch (err) {
    console.error('[StudioGeographicViewport] Error baking world:', err);
  } finally {
    isBaking.value = false;
  }
}

function paintBrushAt(gx: number, gy: number): void {
  store.paintTerrainBrush(gx, gy);
  const gen = kantoGenerator;
  const targetBiome = biomeToCellType(store.terrainBrushBiome);
  const size = store.terrainBrushSize;
  const half = Math.floor(size / 2);

  for (let dy = -half; dy < -half + size; dy++) {
    for (let dx = -half; dx < -half + size; dx++) {
      const px = gx + dx;
      const py = gy + dy;
      if (px >= 0 && px < KANTO_GRID_W && py >= 0 && py < KANTO_GRID_H) {
        const row = gen.grid[py];
        if (row) row[px] = targetBiome;
        if (gen.elevation?.[py]) {
          if (targetBiome === CELL_BIOME.MOUNTAIN_DIRT) {
            gen.elevation[py]![px] = Math.abs(dx) < half && Math.abs(dy) < half && size > 2 ? 3 : 2;
          } else if (targetBiome === CELL_BIOME.WATER) {
            gen.elevation[py]![px] = 0;
          } else {
            gen.elevation[py]![px] = 1;
          }
        }
      }
    }
  }

  chunkManager.bakeArea(autotiler, prefabRenderer, gen, gx - half, gy - half, size);
  drawBakedChunks();
}

function stampStructureAt(worldPos: WorldPoint): void {
  const prefab = defaultPrefabsRegistry.getPrefabById(store.selectedPrefabId);
  const w = prefab?.width ?? DEFAULT_PREFAB_FALLBACK_WIDTH;
  const h = prefab?.height ?? DEFAULT_PREFAB_FALLBACK_HEIGHT;
  const cat: SpriteCategory =
    prefab?.category === 'vegetation' ? 'tree' : prefab?.category === 'props' ? 'prop' : 'building';

  const newStruct: PlacedCustomSprite = {
    id: `struct_${Temporal.Now.instant().epochMilliseconds}`,
    spriteId: store.selectedPrefabId,
    x: Math.round(worldPos.x - w / 2),
    y: Math.round(worldPos.y - h / 2),
    width: w,
    height: h,
    category: cat
  };

  store.addCustomStructure(newStruct);
  bakeWorld();
}

function handlePointerDown(e: PointerEvent): void {
  const worldPos = screenToWorld(e.clientX, e.clientY);

  // 1. Panning check
  if (
    e.button === 1 ||
    isSpacePressed.value ||
    (e.button === 0 && store.activeTool === 'pointer')
  ) {
    isPanning.value = true;
    panStart.value = { x: e.clientX, y: e.clientY };
    panOrigin.value = { x: store.panX, y: store.panY };
    (e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId);
    return;
  }

  // 2. Terrain Brush Mode
  if (e.button === 0 && store.activeTool === 'terrain') {
    isPaintingTerrain.value = true;
    const gx = Math.floor(worldPos.x / KANTO_TILE_SIZE);
    const gy = Math.floor(worldPos.y / KANTO_TILE_SIZE);
    lastPaintedTile.value = { gx, gy };
    paintBrushAt(gx, gy);
    (e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId);
    return;
  }

  // 3. Structures Stamp Mode
  if (e.button === 0 && store.activeTool === 'structures') {
    // Check if clicking an existing structure to drag it
    const sprites = store.activeProject.placedSprites ?? [];
    for (let i = sprites.length - 1; i >= 0; i--) {
      const s = sprites[i]!;
      if (
        worldPos.x >= s.x &&
        worldPos.x <= s.x + s.width &&
        worldPos.y >= s.y &&
        worldPos.y <= s.y + s.height
      ) {
        isDraggingStructure.value = true;
        draggedStructureIdx.value = i;
        store.selectedStructureIndex = i;
        dragStartMouse.value = { x: e.clientX, y: e.clientY };
        dragStartStructPos.value = { x: s.x, y: s.y };
        (e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId);
        return;
      }
    }

    // Otherwise stamp a new structure
    stampStructureAt(worldPos);
  }
}

function handlePointerMove(e: PointerEvent): void {
  const worldPos = screenToWorld(e.clientX, e.clientY);
  mouseWorldPos.value = worldPos;

  if (isPanning.value) {
    const dx = e.clientX - panStart.value.x;
    const dy = e.clientY - panStart.value.y;
    store.setPan(panOrigin.value.x + dx, panOrigin.value.y + dy);
    return;
  }

  if (isPaintingTerrain.value && store.activeTool === 'terrain') {
    const gx = Math.floor(worldPos.x / KANTO_TILE_SIZE);
    const gy = Math.floor(worldPos.y / KANTO_TILE_SIZE);
    if (
      !lastPaintedTile.value ||
      lastPaintedTile.value.gx !== gx ||
      lastPaintedTile.value.gy !== gy
    ) {
      lastPaintedTile.value = { gx, gy };
      paintBrushAt(gx, gy);
    }
    return;
  }

  if (isDraggingStructure.value && draggedStructureIdx.value !== null) {
    const dx = (e.clientX - dragStartMouse.value.x) / store.zoom;
    const dy = (e.clientY - dragStartMouse.value.y) / store.zoom;
    const newX = Math.round(dragStartStructPos.value.x + dx);
    const newY = Math.round(dragStartStructPos.value.y + dy);
    store.moveCustomStructure(draggedStructureIdx.value, newX, newY);
    bakeWorld();
  }
}

function handlePointerUp(e: PointerEvent): void {
  isPaintingTerrain.value = false;
  lastPaintedTile.value = null;
  if (isDraggingStructure.value) {
    isDraggingStructure.value = false;
    draggedStructureIdx.value = null;
  }
  if (isPanning.value) {
    isPanning.value = false;
  }
  try {
    (e.currentTarget as HTMLElement)?.releasePointerCapture(e.pointerId);
  } catch {
    // catch-ok: Pointer capture release fails gracefully if pointer was lost
  }
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.code === 'Space') isSpacePressed.value = true;
}

function handleKeyUp(e: KeyboardEvent): void {
  if (e.code === 'Space') isSpacePressed.value = false;
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  bakeWorld();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
});

watch([() => store.activeProjectId, () => store.activeProject.config.seed], () => {
  bakeWorld();
});

async function forceRebake(): Promise<void> {
  catalogLoader.reset();
  await bakeWorld();
}

defineExpose({
  getCanvas: () => canvasRef.value,
  forceRebake
});
</script>

<template>
  <div
    id="studio-geographic-viewport"
    ref="viewportRef"
    class="geographic-viewport-container"
    :class="{ 'is-panning': isPanning, 'is-painting': isPaintingTerrain }"
    @wheel="handleWheel"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
  >
    <div class="canvas-world-wrapper" :style="transformStyle">
      <canvas
        ref="canvasRef"
        :width="KANTO_WORLD_WIDTH"
        :height="KANTO_WORLD_HEIGHT"
        class="continental-canvas"
      />

      <!-- Ghost Stamp Preview when in Structures tool -->
      <div
        v-if="store.activeTool === 'structures' && !isDraggingStructure"
        class="stamp-ghost-preview"
        :style="{
          left: `${mouseWorldPos.x}px`,
          top: `${mouseWorldPos.y}px`
        }"
      >
        <span class="ghost-badge"><span class="icon">🏛️</span> {{ store.selectedPrefabId }}</span>
      </div>
    </div>

    <!-- Viewport Info Overlay -->
    <div class="viewport-hud">
      <span class="badge"><span class="icon">🗺️</span> Vista Geográfica (Overworld GBA)</span>
      <span class="badge">{{ Object.keys(store.activeProject.nodes).length }} Ciudades</span>
      <span class="badge">Herramienta: {{ store.activeTool }}</span>
      <span class="badge">{{ zoomPercentText }}</span>
      <button
        id="btn-viewport-rebake"
        class="badge btn-rebake"
        title="Forzar re-dibujado y horneado de todos los chunks"
        @click="forceRebake"
      >
        <span class="btn-emoji">🔄</span> Re-Bake Canvas
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.geographic-viewport-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--slate-900);
  overflow: hidden;
  user-select: none;
  cursor: grab;

  &.is-panning {
    cursor: grabbing;
  }

  &.is-painting {
    cursor: crosshair;
  }
}

.canvas-world-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}

.continental-canvas {
  display: block;
  border: 1px solid Rgb(255 255 255 / 10%);
  image-rendering: pixelated;
  box-shadow: var(--shadow-card);
}

.stamp-ghost-preview {
  position: absolute;
  z-index: var(--z-map-spawns);
  transform: Translate(-50%, -50%);
  pointer-events: none;

  .ghost-badge {
    padding: 4px 10px;
    border: 1px solid Rgb(255 255 255 / 40%);
    border-radius: $radius-md;
    background: Rgb(56 189 248 / 85%);
    color: var(--slate-900);
    font-size: var(--font-12);
    font-weight: 700;
    box-shadow: $shadow-card;
  }
}

.viewport-hud {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: var(--z-modal-step);
  display: flex;
  gap: $spacing-sm;
  pointer-events: none;

  .badge {
    padding: 4px 10px;
    border: 1px solid Rgb(255 255 255 / 12%);
    border-radius: $radius-md;
    background: Rgb(15 23 42 / 85%);
    color: var(--slate-50);
    font-size: var(--font-11);
    font-weight: 600;
    backdrop-filter: Blur(6px);
  }

  .btn-rebake {
    background: var(--sky-dark);
    color: var(--white);
    pointer-events: auto;
    cursor: pointer;
    border-color: var(--sky);

    &:hover {
      background: var(--sky-dark);
    }
  }
}
</style>
