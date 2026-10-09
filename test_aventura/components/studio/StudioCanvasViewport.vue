<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useMapStudioStore } from '../../stores/mapStudio';
import { defaultTilesRegistry } from '../../logic/map/tilesRegistry';
import type { CollisionType, MapCell } from '../../logic/map/proceduralMapGenerator';

const store = useMapStudioStore();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const imageCache = new Map<string, HTMLImageElement>();

// Pan state
const isPanning = ref<boolean>(false);
const panStart = ref<{ x: number; y: number }>({ x: 0, y: 0 });
const isSpacePressed = ref<boolean>(false);
const isDrawing = ref<boolean>(false);

const TILE_SIZE = 16;

/**
 * Preload needed tile assets into cache.
 */
async function preloadImages(): Promise<void> {
  const map = store.currentMap;
  if (!map) return;

  const paths = new Set<string>();
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const g = map.layers.ground[y]?.[x];
      if (g?.filePath) paths.add(g.filePath);
      const e = map.layers.elevation[y]?.[x];
      if (e?.filePath) paths.add(e.filePath);
      const d = map.layers.decorations[y]?.[x];
      if (d?.filePath) paths.add(d.filePath);
    }
  }

  // Also preload active tile
  const activeEntry = defaultTilesRegistry.getTileById(store.selectedTileId);
  if (activeEntry?.file_path) paths.add(activeEntry.file_path);

  // Also preload active structure tiles if present
  if (store.selectedStructure) {
    for (const row of store.selectedStructure.tiles) {
      for (const tId of row) {
        if (tId) {
          const entry = defaultTilesRegistry.getTileById(tId);
          if (entry?.file_path) paths.add(entry.file_path);
        }
      }
    }
  }

  const promises: Promise<void>[] = [];
  for (const p of paths) {
    if (!imageCache.has(p)) {
      promises.push(
        new Promise<void>((resolve) => {
          const img = new Image();
          let settled = false;
          const done = () => {
            if (!settled) {
              settled = true;
              resolve();
            }
          };
          img.onload = () => {
            imageCache.set(p, img);
            done();
          };
          img.onerror = () => done();
          img.src = p;
          setTimeout(done, 1500);
        })
      );
    }
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }
}

/**
 * Renders an entire tile layer onto the target canvas context.
 */
function renderTileLayer(
  ctx: CanvasRenderingContext2D,
  layer: readonly (readonly (MapCell | null)[])[],
  width: number,
  height: number
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = layer[y]?.[x];
      if (cell) {
        const img = imageCache.get(cell.filePath);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = cell.tileId.includes('water')
            ? '#12759e'
            : (cell.tileId.includes('path') || cell.tileId.includes('terrain')
              ? '#bc9052'
              : (cell.tileId.includes('elevation') || cell.tileId.includes('mountain') ? '#8e6642' : '#318236'));
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }
}

/**
 * Main Canvas Render Pipeline
 */
function renderCanvas(): void {
  const canvas = canvasRef.value;
  const map = store.currentMap;
  if (!canvas || !map) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const widthPx = map.width * TILE_SIZE;
  const heightPx = map.height * TILE_SIZE;

  if (canvas.width !== widthPx || canvas.height !== heightPx) {
    canvas.width = widthPx;
    canvas.height = heightPx;
  }

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, widthPx, heightPx);

  // 1. Ground Layer
  if (store.layerVisibility.ground) {
    renderTileLayer(ctx, map.layers.ground, map.width, map.height);
  }

  // 2. Elevation Layer
  if (store.layerVisibility.elevation) {
    renderTileLayer(ctx, map.layers.elevation, map.width, map.height);
  }

  // 3. Decorations Layer
  if (store.layerVisibility.decorations) {
    renderTileLayer(ctx, map.layers.decorations, map.width, map.height);
  }

  // 4. Collision Overlay
  if (store.layerVisibility.collision) {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const col: CollisionType = map.collisionMatrix[y]?.[x] ?? 0;
        if (col === 1) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.45)'; // Red solid
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
          ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        } else if (col === 2) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.50)'; // Blue water
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
          ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        } else if (col === 3) {
          ctx.fillStyle = 'rgba(234, 179, 8, 0.45)'; // Amber ledge
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = 'rgba(202, 138, 4, 0.6)';
          ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('▼', x * TILE_SIZE + 8, y * TILE_SIZE + 8);
        }
      }
    }
  }

  // 5. Entities Overlay (Warps & Spawns)
  if (store.layerVisibility.entities && map.entities) {
    for (const warp of map.entities.warps) {
      ctx.fillStyle = 'rgba(234, 179, 8, 0.75)';
      ctx.fillRect(warp.x * TILE_SIZE, warp.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#a16207';
      ctx.lineWidth = 2;
      ctx.strokeRect(warp.x * TILE_SIZE + 1, warp.y * TILE_SIZE + 1, 14, 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('W', warp.x * TILE_SIZE + 8, warp.y * TILE_SIZE + 8);
    }

    for (const spawn of map.entities.spawns) {
      ctx.fillStyle = 'rgba(6, 182, 212, 0.75)';
      ctx.fillRect(spawn.x * TILE_SIZE, spawn.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#0e7490';
      ctx.lineWidth = 2;
      ctx.strokeRect(spawn.x * TILE_SIZE + 1, spawn.y * TILE_SIZE + 1, 14, 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = spawn.id.includes('player') ? '★' : 'S';
      ctx.fillText(label, spawn.x * TILE_SIZE + 8, spawn.y * TILE_SIZE + 8);
    }
  }

  // 6. 16x16 Grid Overlay
  if (store.layerVisibility.grid) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= widthPx; x += TILE_SIZE) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, heightPx);
    }
    for (let y = 0; y <= heightPx; y += TILE_SIZE) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(widthPx, y + 0.5);
    }
    ctx.stroke();
  }

  // 7. Ghost Hover Preview
  if (store.hoverCoords && !isPanning.value && !store.testDriveActive) {
    const { x, y } = store.hoverCoords;
    if (x >= 0 && y >= 0 && x < map.width && y < map.height) {
      if (store.activeTool === 'brush') {
        const entry = defaultTilesRegistry.getTileById(store.selectedTileId);
        const img = entry ? imageCache.get(entry.file_path) : null;
        if (img) {
          ctx.save();
          ctx.globalAlpha = 0.6;
          ctx.drawImage(img, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          ctx.restore();
        }
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      } else if (store.activeTool === 'stamp' && store.selectedStructure) {
        const tpl = store.selectedStructure;
        const fits = x + tpl.footprint.width <= map.width && y + tpl.footprint.height <= map.height;
        ctx.save();
        ctx.globalAlpha = 0.5;
        for (let r = 0; r < tpl.footprint.height; r++) {
          for (let c = 0; c < tpl.footprint.width; c++) {
            const tId = tpl.tiles[r]?.[c];
            if (tId) {
              const e = defaultTilesRegistry.getTileById(tId);
              const img = e ? imageCache.get(e.file_path) : null;
              if (img) ctx.drawImage(img, (x + c) * TILE_SIZE, (y + r) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
          }
        }
        ctx.restore();
        ctx.strokeStyle = fits ? '#22c55e' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, tpl.footprint.width * TILE_SIZE, tpl.footprint.height * TILE_SIZE);
      } else if (store.activeTool === 'eraser') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // 8. Test Drive Player Avatar
  if (store.testDriveActive) {
    const px = store.playerX * TILE_SIZE;
    const py = store.playerY * TILE_SIZE;
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const arrow = store.playerDirection === 'up' ? '▲' : store.playerDirection === 'down' ? '▼' : store.playerDirection === 'left' ? '◀' : '▶';
    ctx.fillText(arrow, px + 8, py + 8);
  }
}

/**
 * Coordinate mapping from mouse event to grid tile coords
 */
function getGridCoords(e: MouseEvent): { x: number; y: number } | null {
  const canvas = canvasRef.value;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const rawX = (e.clientX - rect.left) / store.zoom;
  const rawY = (e.clientY - rect.top) / store.zoom;
  const gx = Math.floor(rawX / TILE_SIZE);
  const gy = Math.floor(rawY / TILE_SIZE);
  return { x: gx, y: gy };
}

/**
 * Mouse Handlers for Painting and Canvas Navigation
 */
function onMouseDown(e: MouseEvent): void {
  // Middle click or Space+click initiates Pan
  if (e.button === 1 || isSpacePressed.value) {
    isPanning.value = true;
    panStart.value = { x: e.clientX - store.panX, y: e.clientY - store.panY };
    return;
  }

  if (e.button === 0 && !store.testDriveActive) {
    isDrawing.value = true;
    const coords = getGridCoords(e);
    if (!coords) return;
    executeToolAction(coords.x, coords.y);
  }
}

function onMouseMove(e: MouseEvent): void {
  if (isPanning.value) {
    store.panX = e.clientX - panStart.value.x;
    store.panY = e.clientY - panStart.value.y;
    return;
  }

  const coords = getGridCoords(e);
  store.hoverCoords = coords;

  if (isDrawing.value && coords && !store.testDriveActive) {
    executeToolAction(coords.x, coords.y);
  } else {
    renderCanvas();
  }
}

function onMouseUp(): void {
  isPanning.value = false;
  isDrawing.value = false;
  renderCanvas();
}

function onMouseLeave(): void {
  isPanning.value = false;
  isDrawing.value = false;
  store.hoverCoords = null;
  renderCanvas();
}

function onWheel(e: WheelEvent): void {
  e.preventDefault();
  if (e.deltaY < 0) {
    store.zoomIn();
  } else {
    store.zoomOut();
  }
}

/**
 * Executes current tool on grid cell (x, y)
 */
function executeToolAction(x: number, y: number): void {
  const tool = store.activeTool;
  if (tool === 'brush') {
    const painted = store.paintTile(x, y);
    if (painted) renderCanvas();
  } else if (tool === 'eraser') {
    const erased = store.eraseTile(x, y);
    if (erased) renderCanvas();
  } else if (tool === 'collision') {
    const painted = store.paintCollision(x, y);
    if (painted) renderCanvas();
  } else if (tool === 'stamp') {
    const stamped = store.stampCurrentStructure(x, y);
    if (stamped) {
      preloadImages().then(() => renderCanvas());
    }
  } else if (tool === 'eyedropper') {
    const map = store.currentMap;
    if (map) {
      const cell = map.layers[store.activeLayer === 'collision' ? 'ground' : store.activeLayer][y]?.[x];
      if (cell?.tileId) {
        store.selectedTileId = cell.tileId;
        store.activeTool = 'brush';
      }
    }
  } else if (tool === 'pointer') {
    store.selectedCoords = { x, y };
  }
}

/**
 * Keyboard Navigation & Test Drive Controls
 */
function onKeyDown(e: KeyboardEvent): void {
  if (e.code === 'Space') isSpacePressed.value = true;

  if (store.testDriveActive) {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      store.movePlayer(0, -1, 'up');
      renderCanvas();
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      store.movePlayer(0, 1, 'down');
      renderCanvas();
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      store.movePlayer(-1, 0, 'left');
      renderCanvas();
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      store.movePlayer(1, 0, 'right');
      renderCanvas();
    }
  }
}

function onKeyUp(e: KeyboardEvent): void {
  if (e.code === 'Space') isSpacePressed.value = false;
}

// Watchers
watch(
  () => store.currentMap,
  async () => {
    await preloadImages();
    renderCanvas();
  },
  { deep: false }
);

function centerMap(): void {
  const map = store.currentMap;
  if (!map) return;
  const container = canvasRef.value?.parentElement?.parentElement;
  if (!container) return;
  const cw = container.clientWidth || 800;
  const ch = container.clientHeight || 600;
  const mw = map.width * TILE_SIZE * store.zoom;
  const mh = map.height * TILE_SIZE * store.zoom;
  store.panX = Math.max(20, Math.round((cw - mw) / 2));
  store.panY = Math.max(20, Math.round((ch - mh) / 2));
}

watch(
  () => store.currentMap,
  (newMap) => {
    if (newMap) {
      centerMap();
      renderCanvas();
      preloadImages().then(() => {
        centerMap();
        renderCanvas();
      });
    }
  },
  { deep: true }
);

watch(
  () => [store.layerVisibility, store.activeTool, store.selectedStructureId, store.testDriveActive],
  () => {
    preloadImages().then(() => renderCanvas());
  },
  { deep: true }
);

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  if (store.currentMap) {
    centerMap();
    renderCanvas();
    preloadImages().then(() => {
      centerMap();
      renderCanvas();
    });
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
});

defineExpose({
  getCanvas: () => canvasRef.value,
  renderCanvas
});
</script>

<template>
  <div
    id="studio-viewport"
    class="studio-canvas-container"
    :class="{ 'space-panning': isSpacePressed }"
    @wheel="onWheel"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseLeave"
    @contextmenu.prevent
  >
    <div
      class="canvas-wrapper"
      :style="{
        transform: `translate(${store.panX}px, ${store.panY}px) scale(${store.zoom})`,
        transformOrigin: '0 0'
      }"
    >
      <canvas
        ref="canvasRef"
        class="viewport-canvas"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.studio-canvas-container {
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
  background: #020617;
  overflow: hidden;
  position: relative;
  cursor: crosshair;

  &.space-panning {
    cursor: grab;
    &:active {
      cursor: grabbing;
    }
  }
}

.canvas-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}

.viewport-canvas {
  image-rendering: pixelated;
  box-shadow: 0 8px 24px Rgba(0, 0, 0, 0.8);
  border: 1px solid #334155;
}
</style>
