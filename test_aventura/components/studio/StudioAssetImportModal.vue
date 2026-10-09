<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  type RawPixelGrid,
  type ProcessTilesetOptions,
  type ProcessStructureOptions,
  extractTilePixels,
  isDiscardableTile,
  tilePixelsToDataUrl,
  processTilesetSheet,
  processCompoundStructure,
  TILE_SIZE
} from '../../logic/map/inBrowserTileProcessor';
import { type TileCategory, defaultTilesRegistry } from '../../logic/map/tilesRegistry';
import { type StructureCollisionType } from '../../config/mapStructures';
import { useMapStudioStore } from '../../stores/mapStudio';
import { saveCustomTilesToStorage } from '../../logic/map/customAssetsStorage';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const mapStudio = useMapStudioStore();

type ImportMode = 'tileset' | 'structure';
const activeMode = ref<ImportMode>('tileset');

const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragOver = ref<boolean>(false);
const rawGrid = ref<RawPixelGrid | null>(null);
const fileName = ref<string>('');
const isProcessing = ref<boolean>(false);

// Mode A: Tileset Settings
const targetCategory = ref<TileCategory>('terrain');
const filterDiscardable = ref<boolean>(true);

// Mode B: Structure Settings
const structureName = ref<string>('');
const structureId = ref<string>('');
const collisionGrid = ref<StructureCollisionType[][]>([]);

// Pre-sliced cell previews for Mode B interactive editor
interface PreSlicedCell {
  readonly r: number;
  readonly c: number;
  readonly dataUrl: string;
  readonly isDiscardable: boolean;
}
const preSlicedCells = ref<PreSlicedCell[][]>([]);

const footprint = computed(() => {
  if (!rawGrid.value) return { width: 0, height: 0 };
  return {
    width: Math.ceil(rawGrid.value.width / TILE_SIZE),
    height: Math.ceil(rawGrid.value.height / TILE_SIZE)
  };
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

watch(structureName, (val) => {
  if (!structureId.value || structureId.value.startsWith('struct_')) {
    structureId.value = val ? `struct_${slugify(val)}` : '';
  }
});

function handleFileSelect(e: Event): void {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    loadSourceFile(file);
  }
}

function handleDrop(e: DragEvent): void {
  isDragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    loadSourceFile(file);
  }
}

function loadSourceFile(file: File): void {
  if (!file.type.includes('png') && !file.name.endsWith('.png')) {
    alert('Por favor, selecciona un archivo de imagen en formato PNG.');
    return;
  }

  fileName.value = file.name;
  const baseName = file.name.replace(/\.png$/i, '');
  if (!structureName.value) {
    structureName.value = baseName.replace(/[_-]/g, ' ');
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const dataUrl = event.target?.result as string;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);

      rawGrid.value = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        data: imgData.data
      };

      prepareStructurePreviews();
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

function prepareStructurePreviews(): void {
  if (!rawGrid.value) return;

  const fp = footprint.value;
  const cells: PreSlicedCell[][] = [];
  const collisions: StructureCollisionType[][] = [];

  for (let r = 0; r < fp.height; r++) {
    const rowCells: PreSlicedCell[] = [];
    const rowCols: StructureCollisionType[] = [];

    for (let c = 0; c < fp.width; c++) {
      const pixels = extractTilePixels(rawGrid.value, c, r);
      const discard = isDiscardableTile(pixels);
      const url = tilePixelsToDataUrl(pixels);

      rowCells.push({
        r,
        c,
        dataUrl: url,
        isDiscardable: discard
      });

      // Default collision: solid (1) if visible content, walkable (0) if discardable/transparent
      rowCols.push(discard ? 0 : 1);
    }
    cells.push(rowCells);
    collisions.push(rowCols);
  }

  preSlicedCells.value = cells;
  collisionGrid.value = collisions;
}

function toggleCellCollision(r: number, c: number): void {
  const current = collisionGrid.value[r]?.[c] ?? 1;
  // Cycle: 1 (Solid) -> 0 (Walkable/Door) -> 2 (Water) -> 1
  const next: StructureCollisionType = current === 1 ? 0 : current === 0 ? 2 : 1;
  if (collisionGrid.value[r]) {
    collisionGrid.value[r][c] = next;
  }
}

async function handleImportTileset(): Promise<void> {
  if (!rawGrid.value) return;
  isProcessing.value = true;

  try {
    const options: ProcessTilesetOptions = {
      category: targetCategory.value,
      sourceName: fileName.value || 'imported_tileset',
      filterDiscardable: filterDiscardable.value,
      registry: defaultTilesRegistry
    };

    const res = await processTilesetSheet(rawGrid.value, options);
    await saveCustomTilesToStorage(res.tiles);

    if (res.tiles.length > 0) {
      mapStudio.selectedTileId = res.tiles[0]!.id;
      mapStudio.activeTool = 'brush';
    }

    alert(`¡Tileset importado con éxito!\n- Total celdas: ${res.totalSliced}\n- Nuevos tiles: ${res.addedCount}\n- Reutilizados: ${res.reusedCount}\n- Descartados: ${res.discardedCount}`);
    emit('close');
  } catch (_err) {
    alert('Ocurrió un error al procesar el tileset.');
  } finally {
    isProcessing.value = false;
  }
}

async function handleImportStructure(): Promise<void> {
  if (!rawGrid.value) return;
  if (!structureId.value.trim()) {
    alert('Por favor, ingresa un ID único para la estructura.');
    return;
  }
  isProcessing.value = true;

  try {
    const options: ProcessStructureOptions = {
      id: structureId.value.trim(),
      name: structureName.value.trim() || 'Estructura Personalizada',
      theme: 'universal',
      collisionMask: collisionGrid.value,
      registry: defaultTilesRegistry
    };

    const res = await processCompoundStructure(rawGrid.value, options);
    mapStudio.registerCustomStructure(res.template);
    await saveCustomTilesToStorage(res.generatedTiles);

    mapStudio.selectedStructureId = res.template.id;
    mapStudio.activeTool = 'stamp';

    alert(`¡Estructura "${res.template.name}" creada y registrada!\nHuella: ${res.footprint.width}x${res.footprint.height} tiles.\nHerramienta Estampador activada.`);
    emit('close');
  } catch (_err) {
    alert('Ocurrió un error al procesar la estructura.');
  } finally {
    isProcessing.value = false;
  }
}
</script>

<template>
  <div
    id="studio-asset-import-modal"
    class="import-modal-backdrop"
    @click.self="emit('close')"
  >
    <div class="import-modal-card">
      <header class="import-modal-header">
        <div class="header-title-box">
          <span class="icon">📥</span>
          <h3 class="modal-title">
            Ingesta Universal de Tiles y Spritesheets
          </h3>
        </div>
        <button
          id="btn-close-import-modal"
          class="btn-close"
          title="Cerrar modal"
          @click="emit('close')"
        >
          <span class="icon">✕</span>
        </button>
      </header>

      <div class="import-modal-body">
        <!-- Mode Switcher Tabs -->
        <div class="import-mode-tabs">
          <button
            id="tab-import-mode-tileset"
            type="button"
            class="mode-tab-btn"
            :class="{ 'is-active': activeMode === 'tileset' }"
            @click="activeMode = 'tileset'"
          >
            <span class="icon">🖌️</span>
            <span>Modo A: Tileset de Terreno</span>
          </button>
          <button
            id="tab-import-mode-structure"
            type="button"
            class="mode-tab-btn"
            :class="{ 'is-active': activeMode === 'structure' }"
            @click="activeMode = 'structure'"
          >
            <span class="icon">🏛️</span>
            <span>Modo B: Estructura Compuesta</span>
          </button>
        </div>

        <!-- Drag and Drop Zone -->
        <div
          id="dropzone-asset-import"
          class="import-dropzone"
          :class="{ 'is-dragover': isDragOver }"
          @dragover.prevent="isDragOver = true"
          @dragleave="isDragOver = false"
          @drop.prevent="handleDrop"
          @click="fileInputRef?.click()"
        >
          <input
            id="input-file-asset-import"
            ref="fileInputRef"
            type="file"
            accept=".png"
            class="hidden"
            style="display: none;"
            @change="handleFileSelect"
          >
          <div class="dropzone-icon">
            <span class="icon">🖼️</span>
          </div>
          <div class="dropzone-primary-text">
            {{ rawGrid ? fileName : 'Arrastra aquí tu imagen PNG o haz clic para seleccionarla' }}
          </div>
          <div class="dropzone-sub-text">
            Soporta cualquier sprite o tileset en formato PNG. Se cortará en cuadrícula de 16x16 px.
          </div>
        </div>

        <!-- Image Specs Banner -->
        <div
          v-if="rawGrid"
          class="source-specs-pill"
        >
          <span>Resolución: <strong class="specs-highlight">{{ rawGrid.width }} x {{ rawGrid.height }} px</strong></span>
          <span>Huella estimada: <strong class="specs-highlight">{{ footprint.width }} x {{ footprint.height }} tiles</strong></span>
        </div>

        <!-- MODO A: Tileset Form -->
        <template v-if="activeMode === 'tileset' && rawGrid">
          <div class="form-field-group">
            <label
              for="select-target-category"
              class="field-label"
            >Categoría Destino:</label>
            <select
              id="select-target-category"
              v-model="targetCategory"
              class="field-select"
            >
              <option value="terrain">
                Terreno (terrain)
              </option>
              <option value="water">
                Agua (water)
              </option>
              <option value="vegetation">
                Vegetación (vegetation)
              </option>
              <option value="elevation">
                Elevación / Roca (elevation)
              </option>
              <option value="objects_props">
                Props / Objetos (objects_props)
              </option>
            </select>
          </div>

          <div class="tileset-preview-container">
            <div class="preview-stats-bar">
              <span class="stat-badge stat-total">Total: {{ footprint.width * footprint.height }}</span>
              <span class="stat-badge stat-kept">Aceptados: {{ preSlicedCells.flat().filter(c => !c.isDiscardable).length }}</span>
              <span class="stat-badge stat-discarded">Descartables: {{ preSlicedCells.flat().filter(c => c.isDiscardable).length }}</span>
            </div>
            <div class="sliced-tiles-scroll">
              <div
                v-for="cell in preSlicedCells.flat()"
                :key="`${cell.r}_${cell.c}`"
                class="sliced-tile-item"
                :style="{ opacity: cell.isDiscardable ? 0.3 : 1 }"
                :title="cell.isDiscardable ? 'Tile descartable (vacío/chroma)' : 'Tile válido'"
              >
                <img
                  :src="cell.dataUrl"
                  alt="Tile slice"
                >
              </div>
            </div>
          </div>
        </template>

        <!-- MODO B: Structure Form & Collision Editor -->
        <template v-if="activeMode === 'structure' && rawGrid">
          <div class="form-field-group">
            <label
              for="input-structure-name"
              class="field-label"
            >Nombre del Edificio / Prefab:</label>
            <input
              id="input-structure-name"
              v-model="structureName"
              type="text"
              class="field-input"
              placeholder="Ej. Gimnasio de Kanto"
            >
          </div>

          <div class="form-field-group">
            <label
              for="input-structure-id"
              class="field-label"
            >ID Único (Template):</label>
            <input
              id="input-structure-id"
              v-model="structureId"
              type="text"
              class="field-input"
              placeholder="Ej. struct_kanto_gym"
            >
          </div>

          <!-- Collision Grid Editor -->
          <div class="collision-editor-wrapper">
            <label class="field-label">Máscara de Colisión (Haz clic en cada celda para alternar):</label>
            <div class="editor-legend">
              <span class="legend-item"><span class="dot dot-solid" /> <strong>🧱 Sólido (1)</strong></span>
              <span class="legend-item"><span class="dot dot-walkable" /> <strong>🚪 Transitable (0)</strong></span>
              <span class="legend-item"><span class="dot dot-water" /> <strong>🌊 Agua (2)</strong></span>
            </div>

            <div
              id="grid-collision-editor"
              class="collision-grid-board"
              :style="{ gridTemplateColumns: `repeat(${footprint.width}, 48px)` }"
            >
              <template
                v-for="(row, r) in preSlicedCells"
                :key="`row_${r}`"
              >
                <div
                  v-for="(cell, c) in row"
                  :id="`collision-cell-${r}-${c}`"
                  :key="`cell_${r}_${c}`"
                  class="collision-cell"
                  :title="`Fila ${r}, Col ${c} - Colisión: ${collisionGrid[r]?.[c] ?? 1}`"
                  @click="toggleCellCollision(r, c)"
                >
                  <img
                    :src="cell.dataUrl"
                    alt="Tile"
                    class="cell-thumb"
                  >
                  <div
                    class="cell-badge"
                    :class="{
                      'badge-solid': collisionGrid[r]?.[c] === 1,
                      'badge-walkable': collisionGrid[r]?.[c] === 0,
                      'badge-water': collisionGrid[r]?.[c] === 2
                    }"
                  >
                    <span
                      v-if="collisionGrid[r]?.[c] === 1"
                      class="icon"
                    >🧱</span>
                    <span
                      v-else-if="collisionGrid[r]?.[c] === 0"
                      class="icon"
                    >🚪</span>
                    <span
                      v-else-if="collisionGrid[r]?.[c] === 2"
                      class="icon"
                    >🌊</span>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </template>
      </div>

      <footer class="import-modal-footer">
        <button
          id="btn-cancel-import"
          type="button"
          class="btn-secondary"
          @click="emit('close')"
        >
          Cancelar
        </button>

        <button
          v-if="activeMode === 'tileset'"
          id="btn-confirm-import-tiles"
          type="button"
          class="btn-primary"
          :disabled="!rawGrid || isProcessing"
          @click="handleImportTileset"
        >
          <span class="icon">✨</span>
          <span>{{ isProcessing ? 'Procesando...' : 'Inyectar en Catálogo' }}</span>
        </button>

        <button
          v-else
          id="btn-confirm-import-structure"
          type="button"
          class="btn-primary"
          :disabled="!rawGrid || !structureId.trim() || isProcessing"
          @click="handleImportStructure"
        >
          <span class="icon">🏛️</span>
          <span>{{ isProcessing ? 'Creando...' : 'Crear Estructura y Estampar' }}</span>
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./StudioAssetImportModal.styles.scss"></style>
