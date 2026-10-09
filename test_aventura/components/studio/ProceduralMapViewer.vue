<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import {
  generateProceduralMap,
  stampStructure,
  type GeneratedMap,
  type CollisionType,
  type MapType
} from '../../logic/map/proceduralMapGenerator';
import type { CanonicalThemeSource } from '../../types/map/adventureWorldTypes';
import {
  defaultTilesRegistry,
  loadTilesRegistry,
  type TilesRegistryJson
} from '../../logic/map/tilesRegistry';
import {
  STRUCTURE_TEMPLATES,
  getStructureTemplate
} from '../../config/mapStructures';

const props = withDefaults(
  defineProps<{
    initialTheme?: CanonicalThemeSource;
    initialSeed?: number;
    initialWidth?: number;
    initialHeight?: number;
  }>(),
  {
    initialTheme: 'firered',
    initialSeed: 42,
    initialWidth: 30,
    initialHeight: 30
  }
);

// Reactive Controls
const theme = ref<CanonicalThemeSource>(props.initialTheme);
const mapType = ref<MapType>('town');
const seed = ref<number>(props.initialSeed);
const mapWidth = ref<number>(props.initialWidth);
const mapHeight = ref<number>(props.initialHeight);
const showCollisions = ref<boolean>(false);
const showEntities = ref<boolean>(false);
const withTown = ref<boolean>(true);

// Structure Stamper State
const selectedStructureId = ref<string>('pokemon_center');
const stampGridX = ref<number>(12);
const stampGridY = ref<number>(10);
const structureMessage = ref<string>('');

// Metrics & Telemetry
const isGenerating = ref<boolean>(false);
const isLoadingRegistry = ref<boolean>(false);
const generationTimeMs = ref<number>(0);
const renderTimeMs = ref<number>(0);
const totalPlacedTiles = ref<number>(0);
const distinctTilesNeeded = ref<number>(0);
const newTilesDownloaded = ref<number>(0);
const cacheHits = ref<number>(0);

// DOM Elements & In-Memory Cache
const canvasRef = ref<HTMLCanvasElement | null>(null);
const currentMap = ref<GeneratedMap | null>(null);
const imageCache = new Map<string, HTMLImageElement>();

/**
 * Ensures the tiles registry is available in the browser client.
 * Lazy-loads public/assets/tiles_registry.json on first run.
 */
async function ensureRegistryLoaded(): Promise<void> {
  if (defaultTilesRegistry.isLoaded) return;

  isLoadingRegistry.value = true;
  try {
    const res = await fetch('/assets/tiles_registry.json');
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching tiles registry`);
    const data = (await res.json()) as TilesRegistryJson;
    loadTilesRegistry(data);
  } catch (err) {
    console.error('[ProceduralMapViewer] Failed to load registry:', err);
  } finally {
    isLoadingRegistry.value = false;
  }
}

/**
 * Preloads all distinct tile images required by the map into memory.
 * Fulfills lazy-loading verification (only downloads needed tiles).
 */
async function preloadMapImages(map: GeneratedMap): Promise<void> {
  const neededPaths = new Set<string>();

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const g = map.layers.ground[y]?.[x];
      if (g?.filePath) neededPaths.add(g.filePath);

      const e = map.layers.elevation[y]?.[x];
      if (e?.filePath) neededPaths.add(e.filePath);

      const d = map.layers.decorations[y]?.[x];
      if (d?.filePath) neededPaths.add(d.filePath);
    }
  }

  distinctTilesNeeded.value = neededPaths.size;
  let newDownloads = 0;
  let hits = 0;

  const loadPromises: Promise<void>[] = [];

  for (const p of neededPaths) {
    if (imageCache.has(p)) {
      hits++;
    } else {
      newDownloads++;
      const pLoad = new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          imageCache.set(p, img);
          resolve();
        };
        img.onerror = () => {
          console.warn(`[ProceduralMapViewer] Failed to load tile asset: ${p}`);
          resolve();
        };
        img.src = p;
      });
      loadPromises.push(pLoad);
    }
  }

  newTilesDownloaded.value = newDownloads;
  cacheHits.value = hits;

  if (loadPromises.length > 0) {
    await Promise.all(loadPromises);
  }
}

/**
 * Draws the layered map onto the HTML5 2D Canvas.
 */
function renderCanvas(): void {
  const canvas = canvasRef.value;
  const map = currentMap.value;
  if (!canvas || !map) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const t0 = performance.now();

  const canvasWidth = map.width * 16;
  const canvasHeight = map.height * 16;
  if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
  }

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // 1. Ground Layer
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const cell = map.layers.ground[y]?.[x];
      if (cell) {
        const img = imageCache.get(cell.filePath);
        if (img) ctx.drawImage(img, x * 16, y * 16, 16, 16);
      }
    }
  }

  // 2. Elevation Layer
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const cell = map.layers.elevation[y]?.[x];
      if (cell) {
        const img = imageCache.get(cell.filePath);
        if (img) ctx.drawImage(img, x * 16, y * 16, 16, 16);
      }
    }
  }

  // 3. Decorations Layer
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const cell = map.layers.decorations[y]?.[x];
      if (cell) {
        const img = imageCache.get(cell.filePath);
        if (img) ctx.drawImage(img, x * 16, y * 16, 16, 16);
      }
    }
  }

  // 4. Collision Overlay (Semi-transparent)
  if (showCollisions.value) {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const col: CollisionType = map.collisionMatrix[y]?.[x] ?? 0;
        if (col === 1) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.45)'; // Red = solid
        } else if (col === 2) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.50)'; // Blue = water
        } else if (col === 3) {
          ctx.fillStyle = 'rgba(234, 179, 8, 0.45)'; // Amber = ledge (jump south)
        } else {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.35)'; // Green = walkable
        }
        ctx.fillRect(x * 16, y * 16, 16, 16);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * 16, y * 16, 16, 16);

        if (col === 3) {
          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('▼', x * 16 + 8, y * 16 + 8);
        }
      }
    }
  }

  // 5. Entities Overlay (Warps & Spawns)
  if (showEntities.value && map.entities) {
    // Render Warps (Yellow badge)
    for (const warp of map.entities.warps) {
      ctx.fillStyle = 'rgba(234, 179, 8, 0.75)';
      ctx.fillRect(warp.x * 16, warp.y * 16, 16, 16);
      ctx.strokeStyle = '#a16207';
      ctx.lineWidth = 2;
      ctx.strokeRect(warp.x * 16 + 1, warp.y * 16 + 1, 14, 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('W', warp.x * 16 + 8, warp.y * 16 + 8);
    }

    // Render Spawns (Cyan badge)
    for (const spawn of map.entities.spawns) {
      ctx.fillStyle = 'rgba(6, 182, 212, 0.75)';
      ctx.fillRect(spawn.x * 16, spawn.y * 16, 16, 16);
      ctx.strokeStyle = '#0e7490';
      ctx.lineWidth = 2;
      ctx.strokeRect(spawn.x * 16 + 1, spawn.y * 16 + 1, 14, 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = spawn.id.includes('player') ? '★' : 'S';
      ctx.fillText(label, spawn.x * 16 + 8, spawn.y * 16 + 8);
    }
  }

  renderTimeMs.value = Math.round(performance.now() - t0);
}

/**
 * Handles map type selector changes.
 */
function onMapTypeChange(): void {
  if (mapType.value === 'route') {
    withTown.value = false;
  } else {
    withTown.value = true;
  }
  generateAndRender();
}

/**
 * Orchestrates full generation, asset preloading, and canvas draw.
 */
async function generateAndRender(): Promise<void> {
  if (isGenerating.value) return;
  isGenerating.value = true;
  structureMessage.value = '';

  try {
    await ensureRegistryLoaded();

    const t0 = performance.now();
    const map = generateProceduralMap({
      width: Math.max(16, Math.min(60, Number(mapWidth.value) || 30)),
      height: Math.max(16, Math.min(60, Number(mapHeight.value) || 30)),
      seed: Number(seed.value) || 42,
      theme: theme.value,
      type: mapType.value,
      withTown: mapType.value === 'town' && withTown.value
    });
    generationTimeMs.value = Math.round(performance.now() - t0);
    totalPlacedTiles.value = map.totalTilesPlaced;
    currentMap.value = map;

    await preloadMapImages(map);
    renderCanvas();
  } catch (err) {
    console.error('[ProceduralMapViewer] Generation error:', err);
  } finally {
    isGenerating.value = false;
  }
}

/**
 * Handles stamping the selected structure template onto the active map.
 */
async function handleStampStructure(): Promise<void> {
  if (!currentMap.value) return;

  const template = getStructureTemplate(selectedStructureId.value);
  if (!template) {
    structureMessage.value = 'Plantilla no encontrada.';
    return;
  }

  const success = stampStructure(
    currentMap.value,
    template,
    Number(stampGridX.value) || 0,
    Number(stampGridY.value) || 0
  );

  if (!success) {
    structureMessage.value = `❌ Fuera de límites (${template.footprint.width}x${template.footprint.height} no cabe en ${stampGridX.value}, ${stampGridY.value})`;
    return;
  }

  structureMessage.value = `✅ Estampado: ${template.name} en (${stampGridX.value}, ${stampGridY.value})`;
  await preloadMapImages(currentMap.value);
  renderCanvas();
}

/**
 * Randomizes seed and triggers instant regeneration.
 */
function randomizeSeed(): void {
  seed.value = Math.floor(Math.random() * 999999);
  generateAndRender();
}

// Watchers
watch([showCollisions, showEntities], () => {
  renderCanvas();
});

onMounted(() => {
  generateAndRender();
});
</script>

<template>
  <div class="procedural-viewer-card">
    <!-- Header Bar -->
    <div class="viewer-header">
      <div class="title-group">
        <span class="icon">🗺️</span>
        <h3 class="viewer-title">
          VISOR PROCEDURAL DE MAPAS GBA (v2.1)
        </h3>
      </div>
      <div
        class="badge-status"
        :class="{ ready: !isGenerating && !isLoadingRegistry }"
      >
        {{ isLoadingRegistry ? 'CARGANDO REGISTRO...' : isGenerating ? 'GENERANDO...' : 'LISTO' }}
      </div>
    </div>

    <!-- Controls Toolbar -->
    <div class="viewer-controls">
      <!-- Theme Selector -->
      <div class="control-item">
        <label for="theme-select">Tema:</label>
        <select
          id="theme-select"
          v-model="theme"
          class="retro-select"
          @change="generateAndRender"
        >
          <option value="firered">
            Rojo Fuego (Kanto)
          </option>
          <option value="emerald">
            Esmeralda (Hoenn)
          </option>
          <option value="ruby_sapphire">
            Rubí / Zafiro
          </option>
        </select>
      </div>

      <!-- Seed Input -->
      <div class="control-item">
        <label for="seed-input">Semilla (Seed):</label>
        <div class="input-with-button">
          <input
            id="seed-input"
            v-model.number="seed"
            type="number"
            class="retro-input"
            @keyup.enter="generateAndRender"
          >
          <button
            id="btn-rnd-seed"
            class="small-btn btn-rnd"
            title="Semilla Aleatoria"
            @click="randomizeSeed"
          >
            <span class="icon">🎲</span>
          </button>
        </div>
      </div>

      <!-- Dimensions -->
      <div class="control-item dim-item">
        <label>Dimensiones:</label>
        <div class="dim-inputs">
          <input
            id="input-map-width"
            v-model.number="mapWidth"
            type="number"
            min="16"
            max="60"
            class="retro-input-sm"
          >
          <span>x</span>
          <input
            id="input-map-height"
            v-model.number="mapHeight"
            type="number"
            min="16"
            max="60"
            class="retro-input-sm"
          >
        </div>
      </div>

      <!-- Action Button -->
      <button
        id="btn-generate-map"
        class="generate-btn"
        :disabled="isGenerating || isLoadingRegistry"
        @click="generateAndRender"
      >
        <span class="icon">⚡</span> GENERAR MAPA
      </button>

      <!-- Map Mode Selector -->
      <div class="control-item">
        <label for="type-select">Modo:</label>
        <select
          id="type-select"
          v-model="mapType"
          class="retro-select"
          @change="onMapTypeChange"
        >
          <option value="town">
            Pueblo (Town)
          </option>
          <option value="route">
            Ruta (Route)
          </option>
        </select>
      </div>

      <!-- Collision Toggle -->
      <label class="collision-toggle">
        <input
          id="chk-collisions"
          v-model="showCollisions"
          type="checkbox"
        >
        <span class="toggle-label">Colisiones</span>
      </label>

      <!-- Entities Toggle -->
      <label class="collision-toggle">
        <input
          id="chk-entities"
          v-model="showEntities"
          type="checkbox"
        >
        <span class="toggle-label">Warps &amp; Spawns</span>
      </label>

      <!-- Town Pass Toggle (Town mode only) -->
      <label
        v-if="mapType === 'town'"
        class="collision-toggle"
      >
        <input
          id="chk-town-pass"
          v-model="withTown"
          type="checkbox"
          @change="generateAndRender"
        >
        <span class="toggle-label">Estructuras Urbanas</span>
      </label>
    </div>

    <!-- Structure Stamping Bar -->
    <div class="stamping-toolbar">
      <div class="stamping-title">
        <span><span class="icon">🏛️</span> Estampar Estructura:</span>
      </div>
      <div class="stamping-controls">
        <select
          id="select-structure"
          v-model="selectedStructureId"
          class="retro-select"
        >
          <option
            v-for="s in Object.values(STRUCTURE_TEMPLATES)"
            :key="s.id"
            :value="s.id"
          >
            {{ s.name }} ({{ s.footprint.width }}x{{ s.footprint.height }})
          </option>
        </select>
        <div class="coords-group">
          <span>X:</span>
          <input
            id="input-stamp-x"
            v-model.number="stampGridX"
            type="number"
            min="0"
            max="60"
            class="retro-input-sm"
          >
          <span>Y:</span>
          <input
            id="input-stamp-y"
            v-model.number="stampGridY"
            type="number"
            min="0"
            max="60"
            class="retro-input-sm"
          >
        </div>
        <button
          id="btn-stamp-structure"
          class="stamp-btn"
          :disabled="!currentMap"
          @click="handleStampStructure"
        >
          ESTAMPAR
        </button>
      </div>
      <div
        v-if="structureMessage"
        class="stamp-feedback"
      >
        {{ structureMessage }}
      </div>
    </div>

    <!-- Canvas Viewport -->
    <div class="canvas-viewport">
      <canvas
        ref="canvasRef"
        class="map-canvas"
      />
    </div>

    <!-- Telemetry & Diagnostics Bar -->
    <div class="diagnostics-bar">
      <div class="diag-col">
        <span class="diag-label">Motor Gen:</span>
        <span class="diag-value">{{ generationTimeMs }}ms</span>
      </div>
      <div class="diag-col">
        <span class="diag-label">Lienzo Canvas:</span>
        <span class="diag-value">{{ renderTimeMs }}ms</span>
      </div>
      <div class="diag-col">
        <span class="diag-label">Tiles Únicos:</span>
        <span class="diag-value">{{ distinctTilesNeeded }}</span>
      </div>
      <div class="diag-col">
        <span class="diag-label">Nuevas Descargas:</span>
        <span class="diag-value text-green">{{ newTilesDownloaded }}</span>
      </div>
      <div class="diag-col">
        <span class="diag-label">Impactos Caché:</span>
        <span class="diag-value text-cyan">{{ cacheHits }}</span>
      </div>
      <div
        v-if="showCollisions"
        class="legend-group"
      >
        <span class="legend-badge leg-walkable">0: Libre</span>
        <span class="legend-badge leg-solid">1: Sólido</span>
        <span class="legend-badge leg-water">2: Agua</span>
        <span class="legend-badge leg-ledge">3: Salto ▼</span>
      </div>
      <div
        v-if="showEntities"
        class="legend-group"
      >
        <span class="legend-badge leg-warp">W: Warp</span>
        <span class="legend-badge leg-spawn"><span class="icon">★</span>/S: Spawn</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.procedural-viewer-card {
  display: flex;
  flex-direction: column;
  background: #0f172a;
  border: 2px solid #334155;
  border-radius: 8px;
  padding: 12px;
  color: #f8fafc;
  font-family: monospace, sans-serif;
  gap: 10px;
}

.viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #1e293b;
  padding-bottom: 8px;

  .title-group {
    display: flex;
    align-items: center;
    gap: 8px;

    .viewer-title {
      font-size: 14px;
      font-weight: bold;
      color: #38bdf8;
      margin: 0;
      letter-spacing: 0.5px;
    }
  }

  .badge-status {
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 4px;
    background: #475569;
    color: #cbd5e1;
    font-weight: 600;

    &.ready {
      background: #15803d;
      color: #bbf7d0;
    }
  }
}

.viewer-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  background: #1e293b;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;

  .control-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .input-with-button {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .dim-inputs {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.retro-select,
.retro-input,
.retro-input-sm {
  background: #090d16;
  border: 1px solid #475569;
  color: #f1f5f9;
  border-radius: 4px;
  padding: 4px 6px;
  font-family: inherit;
  font-size: 12px;
}

.retro-input {
  width: 90px;
}

.retro-input-sm {
  width: 44px;
  text-align: center;
}

.small-btn,
.btn-rnd {
  background: #334155;
  border: 1px solid #64748b;
  color: #f8fafc;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  transition: background 0.15s ease;

  &:hover {
    background: #475569;
  }
}

.generate-btn {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  border: 1px solid #60a5fa;
  color: #ffffff;
  font-weight: bold;
  padding: 5px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.collision-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  margin-left: auto;

  input[type="checkbox"] {
    accent-color: #22c55e;
  }

  .toggle-label {
    color: #94a3b8;
    font-size: 11px;
  }
}

.stamping-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  background: #1e293b;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 11px;

  .stamping-title {
    font-weight: 600;
    color: #e2e8f0;
  }

  .stamping-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .coords-group {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #94a3b8;
  }

  .stamp-btn {
    background: #d97706;
    border: 1px solid #f59e0b;
    color: #ffffff;
    padding: 3px 10px;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    font-size: 11px;

    &:hover:not(:disabled) {
      background: #b45309;
    }
  }

  .stamp-feedback {
    color: #a7f3d0;
    font-size: 11px;
  }
}

.canvas-viewport {
  display: flex;
  justify-content: center;
  align-items: center;
  background: #020617;
  border: 1px solid #1e293b;
  border-radius: 6px;
  padding: 12px;
  overflow: auto;
  min-height: 380px;

  .map-canvas {
    image-rendering: pixelated;
    max-width: 100%;
    max-height: 520px;
    border: 2px solid #3b82f6;
    border-radius: 4px;
    box-shadow: 0 4px 14px Rgba(0, 0, 0, 0.6);
  }
}

.diagnostics-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  background: #090d16;
  border: 1px solid #1e293b;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 11px;

  .diag-col {
    display: flex;
    gap: 4px;

    .diag-label {
      color: #64748b;
    }

    .diag-value {
      font-weight: bold;
      color: #f1f5f9;

      &.text-green {
        color: #4ade80;
      }

      &.text-cyan {
        color: #38bdf8;
      }
    }
  }

  .legend-group {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;

    .legend-badge {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: bold;

      &.leg-walkable {
        background: Rgba(34, 197, 94, 0.2);
        color: #4ade80;
        border: 1px solid #22c55e;
      }

      &.leg-solid {
        background: Rgba(239, 68, 68, 0.2);
        color: #f87171;
        border: 1px solid #ef4444;
      }

      &.leg-water {
        background: Rgba(59, 130, 246, 0.2);
        color: #60a5fa;
        border: 1px solid #3b82f6;
      }

      &.leg-ledge {
        background: Rgba(234, 179, 8, 0.2);
        color: #fde047;
        border: 1px solid #eab308;
      }

      &.leg-warp {
        background: Rgba(234, 179, 8, 0.25);
        color: #facc15;
        border: 1px solid #ca8a04;
      }

      &.leg-spawn {
        background: Rgba(6, 182, 212, 0.25);
        color: #22d3ee;
        border: 1px solid #0891b2;
      }
    }
  }
}
</style>
