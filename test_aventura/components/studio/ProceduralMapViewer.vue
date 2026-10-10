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
import {
  STUDIO_TILE_SIZE,
  TILE_CENTER_OFFSET,
  CONTINENT_DEFAULT_SEED,
  SUBTILE_INNER_SIZE,
  MAX_RANDOM_SEED
} from '../../config/studioConstants.ts';

const DEFAULT_VIEWER_MAP_WIDTH = 30;
const DEFAULT_VIEWER_MAP_HEIGHT = 30;
const DEFAULT_STAMP_GRID_X = 12;
const DEFAULT_STAMP_GRID_Y = 10;
const MIN_MAP_DIMENSION = 16;
const MAX_MAP_DIMENSION = 60;

const props = withDefaults(
  defineProps<{
    initialTheme?: CanonicalThemeSource;
    initialSeed?: number;
    initialWidth?: number;
    initialHeight?: number;
  }>(),
  {
    initialTheme: 'firered',
    initialSeed: CONTINENT_DEFAULT_SEED,
    initialWidth: DEFAULT_VIEWER_MAP_WIDTH,
    initialHeight: DEFAULT_VIEWER_MAP_HEIGHT
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
const stampGridX = ref<number>(DEFAULT_STAMP_GRID_X);
const stampGridY = ref<number>(DEFAULT_STAMP_GRID_Y);
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
  const T = STUDIO_TILE_SIZE;
  const innerSize = SUBTILE_INNER_SIZE;

  const canvasWidth = map.width * T;
  const canvasHeight = map.height * T;
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
        if (img) ctx.drawImage(img, x * T, y * T, T, T);
      }
    }
  }

  // 2. Elevation Layer
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const cell = map.layers.elevation[y]?.[x];
      if (cell) {
        const img = imageCache.get(cell.filePath);
        if (img) ctx.drawImage(img, x * T, y * T, T, T);
      }
    }
  }

  // 3. Decorations Layer
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const cell = map.layers.decorations[y]?.[x];
      if (cell) {
        const img = imageCache.get(cell.filePath);
        if (img) ctx.drawImage(img, x * T, y * T, T, T);
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
        ctx.fillRect(x * T, y * T, T, T);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * T, y * T, T, T);

        if (col === 3) {
          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('▼', x * T + TILE_CENTER_OFFSET, y * T + TILE_CENTER_OFFSET);
        }
      }
    }
  }

  // 5. Entities Overlay (Warps & Spawns)
  if (showEntities.value && map.entities) {
    // Render Warps (Yellow badge)
    for (const warp of map.entities.warps) {
      ctx.fillStyle = 'rgba(234, 179, 8, 0.75)';
      ctx.fillRect(warp.x * T, warp.y * T, T, T);
      ctx.strokeStyle = '#a16207';
      ctx.lineWidth = 2;
      ctx.strokeRect(warp.x * T + 1, warp.y * T + 1, innerSize, innerSize);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('W', warp.x * T + TILE_CENTER_OFFSET, warp.y * T + TILE_CENTER_OFFSET);
    }

    // Render Spawns (Cyan badge)
    for (const spawn of map.entities.spawns) {
      ctx.fillStyle = 'rgba(6, 182, 212, 0.75)';
      ctx.fillRect(spawn.x * T, spawn.y * T, T, T);
      ctx.strokeStyle = '#0e7490';
      ctx.lineWidth = 2;
      ctx.strokeRect(spawn.x * T + 1, spawn.y * T + 1, innerSize, innerSize);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = spawn.id.includes('player') ? '★' : 'S';
      ctx.fillText(label, spawn.x * T + TILE_CENTER_OFFSET, spawn.y * T + TILE_CENTER_OFFSET);
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
      width: Math.max(MIN_MAP_DIMENSION, Math.min(MAX_MAP_DIMENSION, Number(mapWidth.value) || DEFAULT_VIEWER_MAP_WIDTH)),
      height: Math.max(MIN_MAP_DIMENSION, Math.min(MAX_MAP_DIMENSION, Number(mapHeight.value) || DEFAULT_VIEWER_MAP_HEIGHT)),
      seed: Number(seed.value) || CONTINENT_DEFAULT_SEED,
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
  seed.value = Math.floor(Math.random() * MAX_RANDOM_SEED);
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
  gap: $spacing-md-alt;
  padding: 12px;
  border: 2px solid var(--slate-700);
  border-radius: $radius-lg;
  background: var(--slate-900);
  color: var(--slate-50);
  font-family: $font-family-mono;
}

.viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--slate-800);
  padding-bottom: 8px;

  .title-group {
    display: flex;
    align-items: center;
    gap: $spacing-sm;

    .viewer-title {
      margin: 0;
      color: var(--sky);
      font-size: var(--font-14);
      font-weight: bold;
      letter-spacing: 0.5px;
    }
  }

  .badge-status {
    padding: 3px 8px;
    border-radius: $radius-sm;
    background: var(--slate-600);
    color: var(--slate-300);
    font-size: var(--font-10);
    font-weight: 600;

    &.ready {
      background: var(--emerald-500);
      color: var(--green-light);
    }
  }
}

.viewer-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $spacing-md;
  padding: 8px 12px;
  border-radius: $radius-md;
  background: var(--slate-800);
  font-size: var(--font-12);

  .control-item {
    display: flex;
    align-items: center;
    gap: $spacing-sm-alt;
  }

  .input-with-button {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
  }

  .dim-inputs {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
  }
}

.retro-select {
  padding: 4px 6px;
  border: 1px solid var(--slate-600);
  border-radius: $radius-sm;
  background: #090d16;
  color: var(--slate-100);
  font-family: inherit;
  font-size: var(--font-12);
}

.retro-input {
  width: 90px;
  padding: 4px 6px;
  border: 1px solid var(--slate-600);
  border-radius: $radius-sm;
  background: #090d16;
  color: var(--slate-100);
  font-family: inherit;
  font-size: var(--font-12);
}

.retro-input-sm {
  width: 44px;
  padding: 4px 6px;
  border: 1px solid var(--slate-600);
  border-radius: $radius-sm;
  background: #090d16;
  color: var(--slate-100);
  font-family: inherit;
  font-size: var(--font-12);
  text-align: center;
}

.small-btn,
.btn-rnd {
  padding: 4px 8px;
  border: 1px solid var(--slate-500);
  border-radius: $radius-sm;
  background: var(--slate-700);
  color: var(--slate-50);
  font-size: var(--font-12);
  cursor: pointer;

  &:hover {
    background: var(--slate-600);
  }
}

.generate-btn {
  padding: 5px 12px;
  border: 1px solid var(--blue-400);
  border-radius: $radius-sm;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: var(--white);
  font-size: var(--font-12);
  font-weight: bold;
  cursor: pointer;

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
  gap: $spacing-sm-alt;
  cursor: pointer;
  user-select: none;
  margin-left: auto;

  input[type="checkbox"] {
    accent-color: var(--emerald);
  }

  .toggle-label {
    color: var(--slate-400);
    font-size: var(--font-11);
  }
}

.stamping-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $spacing-md-alt;
  padding: 6px 12px;
  border-radius: $radius-md;
  background: var(--slate-800);
  font-size: var(--font-11);

  .stamping-title {
    color: var(--slate-200);
    font-weight: 600;
  }

  .stamping-controls {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  .coords-group {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    color: var(--slate-400);
  }

  .stamp-btn {
    padding: 3px 10px;
    border: 1px solid var(--amber-dark);
    border-radius: $radius-sm;
    background: #d97706;
    color: var(--white);
    font-size: var(--font-11);
    font-weight: bold;
    cursor: pointer;

    &:hover:not(:disabled) {
      background: var(--amber-dark);
    }
  }

  .stamp-feedback {
    color: var(--green-light);
    font-size: var(--font-11);
  }
}

.canvas-viewport {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 380px;
  padding: 12px;
  border: 1px solid var(--slate-800);
  border-radius: $radius-md;
  background: #020617;
  overflow: auto;

  .map-canvas {
    max-width: 100%;
    max-height: 520px;
    border: 2px solid var(--blue-500);
    border-radius: $radius-sm;
    image-rendering: pixelated;
    box-shadow: var(--shadow-card);
  }
}

.diagnostics-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $spacing-md-lg;
  padding: 6px 12px;
  border: 1px solid var(--slate-800);
  border-radius: $radius-md;
  background: #090d16;
  font-size: var(--font-11);

  .diag-col {
    display: flex;
    gap: $spacing-xs;

    .diag-label {
      color: var(--slate-500);
    }

    .diag-value {
      color: var(--slate-100);
      font-weight: bold;

      &.text-green {
        color: var(--green-light);
      }

      &.text-cyan {
        color: var(--sky);
      }
    }
  }

  .legend-group {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    margin-left: auto;

    .legend-badge {
      padding: 2px 6px;
      border-radius: $radius-xs-alt;
      font-size: var(--font-10);
      font-weight: bold;

      &.leg-walkable {
        border: 1px solid var(--emerald);
        background: Rgb(34 197 94 / 20%);
        color: var(--green-light);
      }

      &.leg-solid {
        border: 1px solid var(--red-light);
        background: Rgb(239 68 68 / 20%);
        color: var(--rose);
      }

      &.leg-water {
        border: 1px solid var(--blue-500);
        background: Rgb(59 130 246 / 20%);
        color: var(--blue-400);
      }

      &.leg-ledge {
        border: 1px solid var(--amber-dark);
        background: Rgb(234 179 8 / 20%);
        color: var(--amber-300);
      }

      &.leg-warp {
        border: 1px solid var(--amber-dark);
        background: Rgb(234 179 8 / 25%);
        color: var(--amber-400);
      }

      &.leg-spawn {
        border: 1px solid #0891b2;
        background: Rgb(6 182 212 / 25%);
        color: var(--cyan);
      }
    }
  }
}
</style>
