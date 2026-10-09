<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useMapAdventureStudioStore } from '../../stores/mapAdventureStudio';
import {
  KANTO_WORLD_WIDTH,
  KANTO_WORLD_HEIGHT,
  KANTO_TILE_SIZE,
  KANTO_GRID_W,
  KANTO_GRID_H,
  CELL_BIOME,
  OCCUPANCY_FLAGS,
  DynamicCatalogLoader,
  UniversalAutotiler,
  SemanticPrefabRenderer,
  KantoRegionalWorldGenerator,
  ChunkManager
} from '../../logic/map/kantoRegionalGenerator';
import { JohtoRegionalWorldGenerator } from '../../logic/map/regionRegistry';
import { bakeUrbanMaquette } from '../../logic/map/continentalWorldGenerator';

const store = useMapAdventureStudioStore();

const WORLD_WIDTH = KANTO_WORLD_WIDTH;
const WORLD_HEIGHT = KANTO_WORLD_HEIGHT;

const viewportRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const isPanning = ref(false);
const isSpacePressed = ref(false);
const isDraggingNode = ref(false);
const draggedNodeId = ref<string | null>(null);
const dragStartMouse = ref({ x: 0, y: 0 });
const dragStartNodePos = ref({ x: 0, y: 0 });
const panStartMouse = ref({ x: 0, y: 0 });
const panStartOrigin = ref({ x: 0, y: 0 });

// Mode-specific interaction state
const isPaintingTerrain = ref(false);
const lastPaintedTile = ref<{ gx: number; gy: number } | null>(null);

const isDraggingStructure = ref(false);
const draggedStructureIndex = ref<number | null>(null);
const dragStartStructPos = ref({ x: 0, y: 0 });

// World cursor for elastic connecting line
const worldCursor = ref({ x: 0, y: 0 });

const transformStyle = computed(() => ({
  transform: `translate3d(${store.panX}px, ${store.panY}px, 0) scale(${store.zoom})`,
  transformOrigin: '0 0'
}));

// Procedural Regional Engine instances
const catalogLoader = new DynamicCatalogLoader();
const autotiler = new UniversalAutotiler(catalogLoader);
const prefabRenderer = new SemanticPrefabRenderer(catalogLoader);
const kantoWorldGenerator = new KantoRegionalWorldGenerator(catalogLoader);
const johtoWorldGenerator = new JohtoRegionalWorldGenerator(catalogLoader);
const chunkManager = new ChunkManager();

const activeGenerator = computed(() => {
  return store.activeProject?.archetype === 'johto' ? johtoWorldGenerator : kantoWorldGenerator;
});

function screenToWorld(clientX: number, clientY: number) {
  if (!viewportRef.value) return { x: 0, y: 0 };
  const rect = viewportRef.value.getBoundingClientRect();
  const screenX = clientX - rect.left;
  const screenY = clientY - rect.top;
  const x = (screenX - store.panX) / store.zoom;
  const y = (screenY - store.panY) / store.zoom;
  return { x: Math.max(0, Math.min(WORLD_WIDTH, x)), y: Math.max(0, Math.min(WORLD_HEIGHT, y)) };
}

function handleWheelZoom(e: WheelEvent) {
  e.preventDefault();
  if (!viewportRef.value) return;
  const rect = viewportRef.value.getBoundingClientRect();
  const cursorX = e.clientX - rect.left;
  const cursorY = e.clientY - rect.top;

  const currentZoom = store.zoom;
  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
  const nextZoom = Math.max(0.2, Math.min(3.0, currentZoom * zoomFactor));

  const newPanX = cursorX - (cursorX - store.panX) * (nextZoom / currentZoom);
  const newPanY = cursorY - (cursorY - store.panY) * (nextZoom / currentZoom);

  store.setZoom(nextZoom);
  store.setPan(newPanX, newPanY);
}

function handleViewportPointerDown(e: PointerEvent) {
  // Panning: middle-click, space pressed, or graph mode pointer tool click on empty space
  if (e.button === 1 || isSpacePressed.value || (e.button === 0 && store.activeMode === 'graph' && store.activeTool === 'pointer')) {
    isPanning.value = true;
    panStartMouse.value = { x: e.clientX, y: e.clientY };
    panStartOrigin.value = { x: store.panX, y: store.panY };
    (e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId);
    return;
  }

  // Terrain brush painting
  if (e.button === 0 && store.activeMode === 'terrain') {
    isPaintingTerrain.value = true;
    const worldPos = screenToWorld(e.clientX, e.clientY);
    const gx = Math.floor(worldPos.x / KANTO_TILE_SIZE);
    const gy = Math.floor(worldPos.y / KANTO_TILE_SIZE);
    lastPaintedTile.value = { gx, gy };
    paintBrushAt(gx, gy);
    (e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId);
    return;
  }
}

function handleViewportPointerMove(e: PointerEvent) {
  const worldPos = screenToWorld(e.clientX, e.clientY);
  worldCursor.value = worldPos;

  if (isPanning.value) {
    const dx = e.clientX - panStartMouse.value.x;
    const dy = e.clientY - panStartMouse.value.y;
    store.setPan(panStartOrigin.value.x + dx, panStartOrigin.value.y + dy);
    return;
  }

  if (isDraggingNode.value && draggedNodeId.value) {
    const dx = (e.clientX - dragStartMouse.value.x) / (store.zoom * 2.5);
    const dy = (e.clientY - dragStartMouse.value.y) / (store.zoom * 2.5);
    const newX = Math.round(dragStartNodePos.value.x + dx);
    const newY = Math.round(dragStartNodePos.value.y + dy);
    store.moveNode(draggedNodeId.value, newX, newY);
    return;
  }

  if (isPaintingTerrain.value && store.activeMode === 'terrain') {
    const gx = Math.floor(worldPos.x / KANTO_TILE_SIZE);
    const gy = Math.floor(worldPos.y / KANTO_TILE_SIZE);
    if (!lastPaintedTile.value || lastPaintedTile.value.gx !== gx || lastPaintedTile.value.gy !== gy) {
      lastPaintedTile.value = { gx, gy };
      paintBrushAt(gx, gy);
    }
    return;
  }

  if (isDraggingStructure.value && draggedStructureIndex.value !== null) {
    const dx = (e.clientX - dragStartMouse.value.x) / store.zoom;
    const dy = (e.clientY - dragStartMouse.value.y) / store.zoom;
    store.moveStructure(
      draggedStructureIndex.value,
      Math.round(dragStartStructPos.value.x + dx),
      Math.round(dragStartStructPos.value.y + dy)
    );
    return;
  }
}

function handleViewportPointerUp(e: PointerEvent) {
  if (isPanning.value) {
    isPanning.value = false;
    try {
      (e.currentTarget as HTMLElement)?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  if (isDraggingNode.value) {
    isDraggingNode.value = false;
    draggedNodeId.value = null;
    store.pushHistory();
    bakeTerrainTiles().catch(() => {});
  }

  if (isPaintingTerrain.value) {
    isPaintingTerrain.value = false;
    lastPaintedTile.value = null;
    store.pushHistory();
    try {
      (e.currentTarget as HTMLElement)?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  if (isDraggingStructure.value) {
    isDraggingStructure.value = false;
    draggedStructureIndex.value = null;
    store.pushHistory();
    bakeTerrainTiles().catch(() => {});
    try {
      (e.currentTarget as HTMLElement)?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }
}

function handleCanvasClick(e: MouseEvent) {
  if (isPanning.value) return;

  if ((store.activeTool === 'stamp' || store.activeMode === 'structures') && store.stampingPrefab) {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    const p = store.stampingPrefab;
    const px = Math.round(worldPos.x - p.width / 2);
    const py = Math.round(worldPos.y - p.height / 2);
    store.stampCurrentPrefab(px, py);
    bakeTerrainTiles().catch(() => {});
    return;
  }

  if (store.activeTool === 'add_node') {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    const newId = store.addNode(Math.round(worldPos.x / 2.5), Math.round(worldPos.y / 2.5));
    store.selectedNodeId = newId;
    store.activeTool = 'pointer';
    bakeTerrainTiles().catch(() => {});
    return;
  }

  if (store.activeTool === 'connect' && store.connectSourceNodeId) {
    store.connectSourceNodeId = null;
  }
}

function handleNodePointerDown(e: PointerEvent, nodeId: string) {
  e.stopPropagation();

  if (store.activeTool === 'pointer') {
    store.selectedNodeId = nodeId;
    const node = store.nodes[nodeId];
    if (node) {
      isDraggingNode.value = true;
      draggedNodeId.value = nodeId;
      dragStartMouse.value = { x: e.clientX, y: e.clientY };
      dragStartNodePos.value = { x: node.x, y: node.y };
      (e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId);
    }
    return;
  }

  if (store.activeTool === 'delete') {
    store.deleteNode(nodeId);
    bakeTerrainTiles().catch(() => {});
    return;
  }

  if (store.activeTool === 'connect') {
    if (!store.connectSourceNodeId) {
      store.connectSourceNodeId = nodeId;
    } else {
      if (store.connectSourceNodeId !== nodeId) {
        store.toggleConnection(store.connectSourceNodeId, nodeId);
        bakeTerrainTiles().catch(() => {});
      }
      store.connectSourceNodeId = null;
    }
    return;
  }

  if (store.activeTool === 'test_gps') {
    if (!store.gpsStartNodeId) {
      store.gpsStartNodeId = nodeId;
    } else if (!store.gpsTargetNodeId) {
      store.gpsTargetNodeId = nodeId;
      store.testGPS();
    } else {
      store.gpsStartNodeId = nodeId;
      store.gpsTargetNodeId = null;
      store.clearGPS();
    }
  }
}

function handleNodeClick(e: MouseEvent, nodeId: string) {
  e.stopPropagation();
  store.selectedNodeId = nodeId;
}

const renderedConnections = computed(() => {
  return store.connections.map(([idA, idB]) => {
    const a = store.nodes[idA];
    const b = store.nodes[idB];
    if (!a || !b) return null;
    const isWater = (a.type === 'route_water' || b.type === 'route_water' || a.requiresMO === 'Surf' || b.requiresMO === 'Surf');
    return {
      idA,
      idB,
      x1: a.x * 2.5,
      y1: a.y * 2.5,
      x2: b.x * 2.5,
      y2: b.y * 2.5,
      isWater
    };
  }).filter((c): c is NonNullable<typeof c> => c !== null);
});

const elasticLine = computed(() => {
  if (store.activeTool !== 'connect' || !store.connectSourceNodeId) return null;
  const src = store.nodes[store.connectSourceNodeId];
  if (!src) return null;
  return { x1: src.x * 2.5, y1: src.y * 2.5, x2: worldCursor.value.x, y2: worldCursor.value.y };
});

const dijkstraLegs = computed(() => {
  const path = store.previewDijkstraNodes;
  if (path.length < 2) return [];
  const legs: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const idA = path[i];
    const idB = path[i + 1];
    if (!idA || !idB) continue;
    const a = store.nodes[idA];
    const b = store.nodes[idB];
    if (a && b) {
      legs.push({ x1: a.x * 2.5, y1: a.y * 2.5, x2: b.x * 2.5, y2: b.y * 2.5 });
    }
  }
  return legs;
});

function drawBakedChunksToCanvas(): void {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  chunkManager.renderTo(ctx, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
}

function paintBrushAt(gx: number, gy: number): void {
  const size = store.brushSize;
  const biome = store.selectedBiome;
  const gen = activeGenerator.value;

  store.paintTerrain(gx, gy);

  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      const px = gx + dx;
      const py = gy + dy;
      if (px >= 0 && px < KANTO_GRID_W && py >= 0 && py < KANTO_GRID_H) {
        const row = gen.grid[py];
        if (row) {
          row[px] = biome;
          if (biome === CELL_BIOME.WATER) {
            gen.occupancy.set(px, py, OCCUPANCY_FLAGS.WATER);
            gen.occupancy.clear(px, py, OCCUPANCY_FLAGS.ROAD);
          } else if (biome === CELL_BIOME.MOUNTAIN_DIRT) {
            gen.occupancy.set(px, py, OCCUPANCY_FLAGS.CLIFF);
            gen.occupancy.clear(px, py, OCCUPANCY_FLAGS.ROAD);
          } else if (biome === CELL_BIOME.DIRT_PATH || biome === CELL_BIOME.PLAZA_STONE || biome === CELL_BIOME.BRIDGE) {
            gen.occupancy.clear(px, py, OCCUPANCY_FLAGS.WATER | OCCUPANCY_FLAGS.CLIFF);
            gen.occupancy.set(px, py, OCCUPANCY_FLAGS.ROAD);
          } else {
            gen.occupancy.clear(px, py, OCCUPANCY_FLAGS.WATER | OCCUPANCY_FLAGS.CLIFF | OCCUPANCY_FLAGS.ROAD);
          }
        }
      }
    }
  }

  // Recalculate 9-slice autotiling dynamically on modified tiles and 8-neighbor borders
  chunkManager.bakeArea(autotiler, prefabRenderer, gen, gx, gy, size);
  drawBakedChunksToCanvas();
}

function syncCustomStructuresToGen(gen: KantoRegionalWorldGenerator): void {
  for (const s of (store.customStructures ?? [])) {
    const w = s.w ?? 80;
    const h = s.h ?? 60;
    gen.buildings.push({
      style: s.style,
      x: s.x,
      y: s.y,
      w,
      h
    });
    const tx = Math.floor(s.x / KANTO_TILE_SIZE);
    const ty = Math.floor(s.y / KANTO_TILE_SIZE);
    const bw = Math.ceil(w / KANTO_TILE_SIZE);
    const bh = Math.ceil(h / KANTO_TILE_SIZE);
    gen.occupancy.reserveRect(tx, ty, bw, bh, OCCUPANCY_FLAGS.BUILDING);
  }
}

function syncUrbanMaquettesToGen(gen: KantoRegionalWorldGenerator): void {
  const g = gen.grid;
  const T = KANTO_TILE_SIZE;

  for (const [id, node] of Object.entries(store.nodes)) {
    if (!node) continue;
    if (node.urbanScale) {
      const cx = Math.round(node.x * 2.5);
      const cy = Math.round(node.y * 2.5);

      // Clear default buildings within radius to apply custom urban maquette
      gen.buildings = gen.buildings.filter(b => Math.hypot(b.x - cx, b.y - cy) > 250);
      gen.props = gen.props.filter(p => Math.hypot(p.x - cx, p.y - cy) > 250);

      const maquette = bakeUrbanMaquette({
        id,
        name: node.name,
        type: node.type,
        x: cx,
        y: cy,
        urbanScale: node.urbanScale
      }, store.seed);

      const plazaRadius = Math.max(260, Math.round(maquette.plazaRect.w / 2) + 20);

      // Clear default buildings within plaza radius to apply custom urban maquette
      gen.buildings = gen.buildings.filter(b => Math.hypot(b.x - cx, b.y - cy) > plazaRadius);
      gen.props = gen.props.filter(p => Math.hypot(p.x - cx, p.y - cy) > plazaRadius);

      // 1. Organic paving: 1-tile sidewalk directly under building footprints
      for (const b of maquette.buildings) {
        const bx = Math.floor(b.x / T);
        const by = Math.floor(b.y / T);
        const bw = Math.ceil(b.w / T);
        const bh = Math.ceil(b.h / T);
        for (let y = by - 1; y <= by + bh; y++) {
          for (let x = bx - 1; x <= bx + bw; x++) {
            if (x >= 0 && x < KANTO_GRID_W && y >= 0 && y < KANTO_GRID_H) {
              const row = g[y];
              if (row && row[x] !== CELL_BIOME.WATER) {
                row[x] = CELL_BIOME.PLAZA_STONE;
                gen.occupancy.set(x, y, OCCUPANCY_FLAGS.ROAD);
              }
            }
          }
        }
      }

      // 2. Compact central civic square for Metropolises and Cities only (not towns/villages)
      const uScale = node.urbanScale;
      if (uScale === 'metropolis' || uScale === 'city') {
        const plazaRadiusTiles = uScale === 'metropolis' ? 2 : 1;
        const centerTx = Math.round(cx / T);
        const centerTy = Math.round(cy / T);
        for (let dy = -plazaRadiusTiles; dy <= plazaRadiusTiles; dy++) {
          for (let dx = -plazaRadiusTiles; dx <= plazaRadiusTiles; dx++) {
            const px = centerTx + dx;
            const py = centerTy + dy;
            if (px >= 0 && px < KANTO_GRID_W && py >= 0 && py < KANTO_GRID_H) {
              const row = g[py];
              if (row && row[px] !== CELL_BIOME.WATER && row[px] !== CELL_BIOME.MOUNTAIN_DIRT) {
                row[px] = CELL_BIOME.PLAZA_STONE;
                gen.occupancy.set(px, py, OCCUPANCY_FLAGS.ROAD);
              }
            }
          }
        }
      }

      // 2. Place maquette buildings
      for (const b of maquette.buildings) {
        let bX = b.x;
        let bY = b.y;
        let bx = Math.floor(bX / T);
        let by = Math.floor(bY / T);
        const bw = Math.ceil(b.w / T);
        const bh = Math.ceil(b.h / T);

        const isSpotValid = (tx: number, ty: number) => {
          if (tx < 1 || tx + bw >= KANTO_GRID_W - 1 || ty < 1 || ty + bh >= KANTO_GRID_H - 1) return false;
          for (let y = ty - 1; y <= ty + bh; y++) {
            for (let x = tx - 1; x <= tx + bw; x++) {
              const row = g[y];
              const eRow = gen.elevation[y];
              if (!row || !eRow) return false;
              const cell = row[x];
              const elev = eRow[x];
              if (cell === undefined || cell === CELL_BIOME.WATER || cell === CELL_BIOME.MOUNTAIN_DIRT) return false;
              if (elev === undefined || elev >= 2) return false;
              if (gen.occupancy.has(x, y, OCCUPANCY_FLAGS.CLIFF | OCCUPANCY_FLAGS.BUILDING | OCCUPANCY_FLAGS.DOOR_ACCESS)) return false;
            }
          }
          for (const eb of gen.buildings) {
            const ebx = Math.floor(eb.x / T);
            const eby = Math.floor(eb.y / T);
            const ebw = Math.ceil((eb.w ?? 128) / T);
            const ebh = Math.ceil((eb.h ?? 128) / T);
            if (tx < ebx + ebw + 1 && tx + bw + 1 > ebx && ty < eby + ebh + 1 && ty + bh + 1 > eby) {
              return false;
            }
          }
          return true;
        };

        let found = false;
        if (isSpotValid(bx, by)) {
          found = true;
        } else {
          for (let r = 1; r <= 12 && !found; r++) {
            for (let dy = -r; dy <= r; dy++) {
              for (let dx = -r; dx <= r; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                if (isSpotValid(bx + dx, by + dy)) {
                  bx += dx;
                  by += dy;
                  bX = bx * T;
                  bY = by * T;
                  found = true;
                  break;
                }
              }
              if (found) break;
            }
          }
        }

        if (!found) continue;

        gen.buildings.push({
          style: b.style,
          x: bX,
          y: bY,
          w: b.w,
          h: b.h
        });

        if (bx >= 0 && bx + bw < KANTO_GRID_W && by >= 0 && by + bh < KANTO_GRID_H) {
          gen.occupancy.reserveRect(bx, by, bw, bh, OCCUPANCY_FLAGS.BUILDING);
        }
      }

      // 3. Place decorative props
      for (const p of maquette.props) {
        gen.props.push({
          style: p.style,
          x: p.x,
          y: p.y,
          w: 32,
          h: 32
        });
      }
    }
  }
}

function handleStructurePointerDown(e: PointerEvent, index: number): void {
  if (store.activeMode !== 'structures' || store.stampingPrefab) return;
  e.stopPropagation();
  store.selectedStructureIndex = index;
  const struct = store.customStructures[index];
  if (struct) {
    isDraggingStructure.value = true;
    draggedStructureIndex.value = index;
    dragStartMouse.value = { x: e.clientX, y: e.clientY };
    dragStartStructPos.value = { x: struct.x, y: struct.y };
    (e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId);
  }
}

async function bakeTerrainTiles(): Promise<void> {
  store.isBakingTiles = true;
  try {
    await catalogLoader.init();
    const gen = activeGenerator.value;
    gen.generate(store.nodes, store.connections, store.seed, store.proceduralConfig);

    // Apply custom terrain overrides
    const terrain = store.customTerrain ?? {};
    for (const [coordKey, biome] of Object.entries(terrain)) {
      const [xStr, yStr] = coordKey.split('_');
      const gx = Number(xStr);
      const gy = Number(yStr);
      if (gx >= 0 && gx < KANTO_GRID_W && gy >= 0 && gy < KANTO_GRID_H) {
        const row = gen.grid[gy];
        if (row) {
          row[gx] = biome;
          if (biome === CELL_BIOME.WATER) {
            gen.occupancy.set(gx, gy, OCCUPANCY_FLAGS.WATER);
            gen.occupancy.clear(gx, gy, OCCUPANCY_FLAGS.ROAD);
          } else if (biome === CELL_BIOME.MOUNTAIN_DIRT) {
            gen.occupancy.set(gx, gy, OCCUPANCY_FLAGS.CLIFF);
            gen.occupancy.clear(gx, gy, OCCUPANCY_FLAGS.ROAD);
          } else if (biome === CELL_BIOME.DIRT_PATH || biome === CELL_BIOME.PLAZA_STONE || biome === CELL_BIOME.BRIDGE) {
            gen.occupancy.clear(gx, gy, OCCUPANCY_FLAGS.WATER | OCCUPANCY_FLAGS.CLIFF);
            gen.occupancy.set(gx, gy, OCCUPANCY_FLAGS.ROAD);
          } else {
            gen.occupancy.clear(gx, gy, OCCUPANCY_FLAGS.WATER | OCCUPANCY_FLAGS.CLIFF | OCCUPANCY_FLAGS.ROAD);
          }
        }
      }
    }

    // Apply custom structures and urban maquettes
    syncCustomStructuresToGen(gen);
    syncUrbanMaquettesToGen(gen);

    // Populate dense natural trees on continental TALL_GRASS forest cells
    const mult = Math.max(0.1, (store.proceduralConfig?.forestPercent ?? 25) / 25);
    for (let gy = 0; gy < KANTO_GRID_H; gy++) {
      const row = gen.grid[gy];
      if (!row) continue;
      for (let gx = 0; gx < KANTO_GRID_W; gx++) {
        if (row[gx] === CELL_BIOME.TALL_GRASS) {
          const rnd = ((gx * 374761393 + gy * 668265263 + store.seed * 91) >>> 0) / 4294967296;
          if (rnd < 0.60 * mult) {
            const styleRnd = ((gx * 1234567 + gy * 7654321 + store.seed) >>> 0) / 4294967296;
            const style = styleRnd > 0.4 ? 'pine' : 'oak';
            gen.trees.push({
              style,
              x: gx * KANTO_TILE_SIZE,
              y: gy * KANTO_TILE_SIZE
            });
          }
        }
      }
    }

    // Strict tree clearance: remove any tree within 2 tiles of roads, bridges, plazas, water or buildings
    const T = KANTO_TILE_SIZE;
    gen.trees = gen.trees.filter((tree) => {
      const tgx = Math.floor(tree.x / T);
      const tgy = Math.floor(tree.y / T);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = tgx + dx;
          const ny = tgy + dy;
          if (nx >= 0 && nx < KANTO_GRID_W && ny >= 0 && ny < KANTO_GRID_H) {
            const row = gen.grid[ny];
            if (row && (row[nx] === CELL_BIOME.DIRT_PATH || row[nx] === CELL_BIOME.BRIDGE || row[nx] === CELL_BIOME.PLAZA_STONE || row[nx] === CELL_BIOME.WATER)) {
              return false;
            }
            if (gen.occupancy.has(nx, ny, OCCUPANCY_FLAGS.ROAD | OCCUPANCY_FLAGS.BUILDING | OCCUPANCY_FLAGS.WATER)) {
              return false;
            }
          }
        }
      }
      return true;
    });

    chunkManager.bakeAll(autotiler, prefabRenderer, gen);
    drawBakedChunksToCanvas();
  } catch (err) {
    console.error('[StudioAdventureGraphViewport] Error baking tiles:', err);
  } finally {
    store.isBakingTiles = false;
  }
}

watch(() => store.tileTerrainTrigger, () => {
  bakeTerrainTiles().catch(() => {});
});

function onKeyDown(e: KeyboardEvent) {
  if (e.code === 'Space') isSpacePressed.value = true;
  if (e.key === 'p' || e.key === 'P') store.activeTool = 'pointer';
  if (e.key === 'a' || e.key === 'A') store.activeTool = 'add_node';
  if (e.key === 'c' || e.key === 'C') store.activeTool = 'connect';
  if (e.key === 'd' || e.key === 'D') store.activeTool = 'delete';
  if (e.key === 'g' || e.key === 'G') store.activeTool = 'test_gps';
}

function onKeyUp(e: KeyboardEvent) {
  if (e.code === 'Space') isSpacePressed.value = false;
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }
  bakeTerrainTiles().catch(() => {});
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  }
});

defineExpose({
  getCanvas: () => canvasRef.value
});
</script>

<template>
  <div
    id="studio-adventure-viewport"
    ref="viewportRef"
    class="graph-viewport"
    :class="[
      `tool-cursor-${store.activeTool}`,
      `mode-${store.activeMode}`,
      {
        'is-panning': isPanning,
        'is-painting': isPaintingTerrain,
        'is-stamping': store.activeMode === 'structures' && !!store.stampingPrefab
      }
    ]"
    @pointerdown="handleViewportPointerDown"
    @pointermove="handleViewportPointerMove"
    @pointerup="handleViewportPointerUp"
    @pointercancel="handleViewportPointerUp"
    @wheel="handleWheelZoom"
    @click="handleCanvasClick"
  >
    <!-- Canvas World Container -->
    <div
      id="graph-world-container"
      class="graph-world"
      :style="transformStyle"
    >
      <!-- Procedural Regional Tiles Base Layer -->
      <canvas
        v-show="store.showBackgroundMap"
        id="kanto-world-canvas"
        ref="canvasRef"
        :width="WORLD_WIDTH"
        :height="WORLD_HEIGHT"
        class="kanto-tiles-canvas"
      />

      <!-- Coordinate Grid Lines & Labels -->
      <svg
        v-if="store.showGrid"
        class="grid-svg-layer"
        :viewBox="`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`"
        :width="WORLD_WIDTH"
        :height="WORLD_HEIGHT"
      >
        <defs>
          <pattern
            id="subgrid"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="rgba(255, 255, 255, 0.07)"
              stroke-width="1"
            />
          </pattern>
          <pattern
            id="main-grid"
            width="200"
            height="200"
            patternUnits="userSpaceOnUse"
          >
            <rect
              width="200"
              height="200"
              fill="url(#subgrid)"
            />
            <path
              d="M 200 0 L 0 0 0 200"
              fill="none"
              stroke="rgba(255, 255, 255, 0.18)"
              stroke-width="2"
            />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="url(#main-grid)"
        />
      </svg>

      <!-- SVG Routes & Interactive Overlay -->
      <svg
        class="routes-svg-layer"
        :viewBox="`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`"
        :width="WORLD_WIDTH"
        :height="WORLD_HEIGHT"
      >
        <!-- Standard Route Edges (Outer Stroke + Inner Road) -->
        <g class="route-connections">
          <template
            v-for="(c, idx) in renderedConnections"
            :key="'conn-' + idx"
          >
            <!-- Outer Road Border -->
            <line
              :x1="c.x1"
              :y1="c.y1"
              :x2="c.x2"
              :y2="c.y2"
              stroke="#0f172a"
              stroke-width="10"
              stroke-linecap="round"
            />
            <!-- Inner Road Surface (Water routes = dotted cyan, Land = warm sand) -->
            <line
              :x1="c.x1"
              :y1="c.y1"
              :x2="c.x2"
              :y2="c.y2"
              :stroke="c.isWater ? '#38bdf8' : '#fde047'"
              :stroke-dasharray="c.isWater ? '8 6' : 'none'"
              stroke-width="5"
              stroke-linecap="round"
            />
          </template>
        </g>

        <!-- Elastic Connecting Line when dragging/linking from source node -->
        <g
          v-if="elasticLine"
          class="elastic-link-line"
        >
          <line
            :x1="elasticLine.x1"
            :y1="elasticLine.y1"
            :x2="elasticLine.x2"
            :y2="elasticLine.y2"
            stroke="#f59e0b"
            stroke-width="3"
            stroke-dasharray="6 4"
            stroke-linecap="round"
          />
        </g>

        <!-- Dijkstra GPS Highlight Route -->
        <g
          v-if="dijkstraLegs.length > 0"
          class="gps-highlight-route"
        >
          <line
            v-for="(leg, idx) in dijkstraLegs"
            :key="'gps-' + idx"
            :x1="leg.x1"
            :y1="leg.y1"
            :x2="leg.x2"
            :y2="leg.y2"
            stroke="#fbbf24"
            stroke-width="12"
            stroke-linecap="round"
            class="dijkstra-glow-line"
          />
        </g>
      </svg>

      <!-- Draggable Stop Markers (DOM Overlays) -->
      <div
        class="nodes-overlay-layer"
        :class="{
          'is-interactive': store.activeMode === 'graph',
          'compact-view': store.zoom < 0.65
        }"
      >
        <div
          v-for="(node, id) in store.nodes"
          :id="'node-marker-' + id"
          :key="id"
          class="node-marker-container"
          :class="{
            'is-selected': store.selectedNodeId === id,
            'is-connect-source': store.connectSourceNodeId === id,
            'is-gps-start': store.gpsStartNodeId === id,
            'is-gps-target': store.gpsTargetNodeId === id,
            'is-in-dijkstra': store.previewDijkstraNodes.includes(String(id))
          }"
          :style="{ left: `${node.x * 2.5}px`, top: `${node.y * 2.5}px` }"
          @pointerdown="(e) => handleNodePointerDown(e, String(id))"
          @click="(e) => handleNodeClick(e, String(id))"
        >
          <!-- Marker Pin -->
          <div
            class="node-pin"
            :class="'type-' + node.type"
          >
            <span class="pin-icon">
              {{ node.type === 'city' ? '🏙️' : node.type === 'league' ? '🏆' : node.type === 'poi' ? '📍' : '🌾' }}
            </span>
            <span
              v-if="node.hasCenter"
              class="pc-badge"
              title="Centro Pokémon"
            >❤️</span>
            <span
              v-if="node.requiresMO"
              class="mo-badge"
              :title="'Requiere ' + node.requiresMO"
            >🔒</span>
          </div>

          <!-- Label with Name & Coordinates -->
          <div class="node-label">
            <span class="label-name">{{ node.name }}</span>
            <span class="label-coords">{{ Math.round(node.x) }},{{ Math.round(node.y) }}</span>
          </div>
        </div>
      </div>

      <!-- Structures Bounding Boxes & Drag Overlays (Mode Structures) -->
      <div
        v-if="store.activeMode === 'structures'"
        class="structures-overlay-layer"
      >
        <div
          v-for="(s, idx) in store.customStructures"
          :id="'structure-box-' + idx"
          :key="'struct-' + idx"
          class="structure-bounding-box"
          :class="{ 'is-selected': store.selectedStructureIndex === idx }"
          :style="{
            left: `${s.x}px`,
            top: `${s.y}px`,
            width: `${s.w}px`,
            height: `${s.h}px`
          }"
          @pointerdown.stop="(e) => handleStructurePointerDown(e, idx)"
        >
          <div class="structure-tag">
            {{ s.style }}
          </div>
          <button
            v-if="store.selectedStructureIndex === idx"
            class="structure-del-btn"
            title="Eliminar estructura"
            @click.stop="store.deleteStructure(idx)"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Stamping Ghost Prefab Preview (Transparent Ghost Sprite following cursor) -->
      <div
        v-if="(store.activeTool === 'stamp' || store.activeMode === 'structures') && store.stampingPrefab"
        class="stamping-ghost-preview"
        :style="{
          left: `${worldCursor.x - store.stampingPrefab.width / 2}px`,
          top: `${worldCursor.y - store.stampingPrefab.height / 2}px`,
          width: `${store.stampingPrefab.width}px`,
          height: `${store.stampingPrefab.height}px`
        }"
      >
        <img
          v-if="store.stampingPrefab.file_path"
          :src="store.stampingPrefab.file_path"
          :alt="store.stampingPrefab.name"
          class="ghost-prefab-img"
        >
        <div class="ghost-tag">
          {{ store.stampingPrefab.name }} ({{ store.stampingPrefab.width }}x{{ store.stampingPrefab.height }})
        </div>
      </div>

      <!-- Terrain Brush Grid Cursor (Mode Terrain) -->
      <div
        v-if="store.activeMode === 'terrain'"
        class="terrain-brush-cursor"
        :style="{
          left: `${Math.floor(worldCursor.x / 32) * 32}px`,
          top: `${Math.floor(worldCursor.y / 32) * 32}px`,
          width: `${store.brushSize * 32}px`,
          height: `${store.brushSize * 32}px`
        }"
      >
        <span class="brush-size-tag">{{ store.brushSize }}x{{ store.brushSize }}</span>
      </div>
    </div>

    <!-- Floating Mini HUD Controls -->
    <div class="viewport-hud">
      <div class="hud-item">
        <span class="hud-label">Semilla:</span>
        <span class="hud-val">#{{ store.seed }}</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">Zoom:</span>
        <span class="hud-val">{{ Math.round(store.zoom * 100) }}%</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">Cursor:</span>
        <span class="hud-val">{{ Math.round(worldCursor.x / 2.5) }}, {{ Math.round(worldCursor.y / 2.5) }}</span>
      </div>
    </div>
  </div>
</template>

<style src="./StudioAdventureGraphViewport.styles.scss" scoped lang="scss"></style>
