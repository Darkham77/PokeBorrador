<script setup lang="ts">
import { ref, computed } from 'vue';
import StudioModalShell from './StudioModalShell.vue';
import { useContinentStudioStore } from '../../stores/continentStudio';
import {
  processSpriteSheet,
  type RawImageBuffer
} from '../../logic/map/continent/spritePipelineEngine';
import { SPRITE_CATEGORIES, type SlicedSpriteMetadata, type SpriteCategory } from '../../types/map/continentTypes';
import { defaultPrefabsRegistry, type PrefabCategory } from '../../logic/map/prefabsRegistry';

const DEFAULT_SPRITE_SLICE_TOLERANCE = 25;

const store = useContinentStudioStore();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isProcessing = ref(false);
const slicedSprites = ref<SlicedSpriteMetadata[]>([]);
const activeTab = ref<'all' | 'buildings' | 'props' | 'terrain'>('all');

function handleFileChange(e: Event): void {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    processImageFile(file);
    target.value = '';
  }
}

function handleDrop(e: DragEvent): void {
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    processImageFile(file);
  }
}

function processImageFile(file: File): void {
  if (!file.type.includes('png') && !file.name.endsWith('.png')) {
    alert('Por favor selecciona un archivo PNG válido.');
    return;
  }

  isProcessing.value = true;
  const img = new Image();
  const reader = new FileReader();

  reader.onload = (readEvent) => {
    img.src = readEvent.target?.result as string;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        isProcessing.value = false;
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, img.width, img.height);
      const rawBuf: RawImageBuffer = {
        width: img.width,
        height: img.height,
        data: imgData.data
      };

      const baseName = file.name.replace(/\.png$/i, '');
      const results = processSpriteSheet(rawBuf, { sourceName: baseName, tolerance: DEFAULT_SPRITE_SLICE_TOLERANCE });
      slicedSprites.value = results;
      isProcessing.value = false;
    };
  };

  reader.readAsDataURL(file);
}

const filteredSprites = computed(() => {
  if (activeTab.value === 'all') return slicedSprites.value;
  if (activeTab.value === 'buildings') {
    return slicedSprites.value.filter((s) => s.category === 'building');
  }
  if (activeTab.value === 'props') {
    return slicedSprites.value.filter((s) => s.category === 'prop' || s.category === 'tree' || s.category === 'decor');
  }
  return slicedSprites.value.filter((s) => s.category === 'water_edge' || s.category === 'mountain' || s.category === 'snow' || s.category === 'path');
});

function mapToPrefabCategory(cat: SpriteCategory): PrefabCategory {
  if (cat === 'building') return 'buildings';
  if (cat === 'tree') return 'vegetation';
  return 'props';
}

function handleApproveAndIncorporate(): void {
  if (slicedSprites.value.length === 0) return;

  defaultPrefabsRegistry.setPrefabs([
    ...defaultPrefabsRegistry.getAllPrefabs(),
    ...slicedSprites.value.map((s) => ({
      id: s.id,
      name: s.name,
      category: mapToPrefabCategory(s.category),
      width: s.width,
      height: s.height,
      file_path: s.dataUrl,
      source: 'custom_import'
    }))
  ]);

  alert(`¡${slicedSprites.value.length} sprites aprobados e incorporados al catálogo con éxito!`);
  store.showSpriteModal = false;
}
</script>

<template>
  <StudioModalShell
    v-if="store.showSpriteModal"
    id="modal-sprite-pipeline"
    title="Pipeline Inteligente de Spritesheets"
    icon="📚"
    max-width="800px"
    @close="store.showSpriteModal = false"
  >
    <!-- Drop Zone for Spritesheets -->
    <div
      id="studio-sprite-pipeline-modal-div-fileinputref-click"
      v-gsap-hover="{ scale: 1.01 }"
      class="drop-zone"
      @dragover.prevent
      @drop="handleDrop"
      @click="fileInputRef?.click()"
    >
      <input
        id="studio-sprite-pipeline-modal-input-filechange"
        ref="fileInputRef"
        type="file"
        accept=".png"
        class="hidden-input"
        @change="handleFileChange"
      >
      <span class="drop-icon">📥</span>
      <p class="drop-text">
        Arrastra carpetas o imágenes PNG aquí, o haz clic para seleccionar
      </p>
      <span class="drop-hint">Elimina fondos transparentes/chroma, separa componentes conexos y clasifica automáticamente</span>
    </div>

    <!-- Processing Indicator -->
    <div
      v-if="isProcessing"
      class="processing-banner"
    >
      <span><span class="icon">⏳</span> Analizando componentes conexos y removiendo fondo...</span>
    </div>

    <!-- Results Catalog with Tab Navigation -->
    <div
      v-if="slicedSprites.length > 0"
      class="results-container"
    >
      <div class="results-header">
        <h4>Sprites Recortados ({{ slicedSprites.length }})</h4>
        <div class="filter-tabs">
          <button
            id="studio-sprite-pipeline-modal-btn-todos"
            class="tab-btn"
            :class="{ active: activeTab === 'all' }"
            @click="activeTab = 'all'"
          >
            <span class="icon">📦</span> Todos
          </button>
          <button
            id="studio-sprite-pipeline-modal-btn-edificios"
            class="tab-btn"
            :class="{ active: activeTab === 'buildings' }"
            @click="activeTab = 'buildings'"
          >
            <span class="icon">🏛️</span> Edificios
          </button>
          <button
            id="studio-sprite-pipeline-modal-btn-decoraciones"
            class="tab-btn"
            :class="{ active: activeTab === 'props' }"
            @click="activeTab = 'props'"
          >
            <span class="icon">🌲</span> Decoraciones
          </button>
          <button
            id="studio-sprite-pipeline-modal-btn-terrenos"
            class="tab-btn"
            :class="{ active: activeTab === 'terrain' }"
            @click="activeTab = 'terrain'"
          >
            <span class="icon">🌿</span> Terrenos
          </button>
        </div>
      </div>

      <div class="sprites-grid">
        <div
          v-for="sprite in filteredSprites"
          :key="sprite.id"
          class="sprite-card"
        >
          <div class="sprite-preview-box">
            <img
              :src="sprite.dataUrl"
              :alt="sprite.name"
              class="preview-img"
            
              width="32"
              height="32"
            >
          </div>
          <div class="sprite-info">
            <select
              id="studio-sprite-pipeline-modal-select-category"
              v-model="sprite.category"
              class="cat-select"
              title="Reclasificar categoría"
            >
              <option
                v-for="c in SPRITE_CATEGORIES"
                :key="c"
                :value="c"
              >
                {{ c }}
              </option>
            </select>
            <span class="sprite-dims">{{ sprite.width }}×{{ sprite.height }} px</span>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <button
        id="studio-sprite-pipeline-modal-btn-cancelar"
        type="button"
        class="btn-secondary"
        @click="store.showSpriteModal = false"
      >
        Cancelar
      </button>

      <button
        id="btn-approve-sprites"
        type="button"
        class="btn-primary"
        :disabled="slicedSprites.length === 0"
        @click="handleApproveAndIncorporate"
      >
        <span class="btn-emoji">✨</span> Aprobar e Incorporar al Generador
      </button>
    </template>
  </StudioModalShell>
</template>

<style scoped lang="scss">

.drop-zone {
  padding: 24px;
  border: 2px dashed Rgb(56 189 248 / 40%);
  border-radius: $radius-lg-alt;
  background: Rgb(56 189 248 / 4%);
  text-align: center;
  cursor: pointer;

  &:hover {
    background: Rgb(56 189 248 / 8%);
    border-color: var(--sky);
  }

  .drop-icon {
    display: block;
    font-size: var(--font-32);
    margin-bottom: 8px;
  }

  .drop-text {
    margin: 0 0 4px;
    color: var(--slate-100);
    font-size: var(--font-14);
    font-weight: 600;
  }

  .drop-hint {
    color: var(--slate-400);
    font-size: var(--font-11);
  }
}

.hidden-input {
  display: none;
}

.processing-banner {
  padding: 10px 16px;
  border: 1px solid var(--blue-500);
  border-radius: $radius-md;
  background: var(--slate-800);
  color: var(--blue-300);
  font-size: var(--font-12);
  text-align: center;
}

.results-container {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  h4 {
    margin: 0;
    color: var(--slate-50);
    font-size: var(--font-13);
  }
}

.filter-tabs {
  display: flex;
  gap: $spacing-xs;
  padding: 3px;
  border-radius: $radius-md;
  background: var(--slate-900);

  .tab-btn {
    padding: 4px 10px;
    border: none;
    border-radius: $radius-sm;
    background: transparent;
    color: var(--slate-400);
    font-size: var(--font-11);
    font-weight: 600;
    cursor: pointer;

    &.active {
      background: var(--blue-500);
      color: var(--white);
    }
  }
}

.sprites-grid {
  display: grid;
  gap: $spacing-md;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  max-height: 320px;
  overflow-y: auto;
  padding-right: 4px;
}

.sprite-card {
  display: flex;
  flex-direction: column;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: $radius-lg;
  background: var(--slate-800);
  overflow: hidden;
}

.sprite-preview-box {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 90px;
  padding: 6px;
  background: repeating-conic-gradient(var(--slate-800) 0% 25%, var(--slate-700) 0% 50%) 50% / 16px 16px;

  .preview-img {
    max-width: 100%;
    max-height: 100%;
    image-rendering: pixelated;
    object-fit: contain;
  }
}

.sprite-info {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  padding: 8px;

  .cat-select {
    padding: 2px 4px;
    border: 1px solid Rgb(255 255 255 / 15%);
    border-radius: $radius-sm;
    background: var(--slate-900);
    color: var(--slate-50);
    font-size: var(--font-10);
    cursor: pointer;
  }

  .sprite-dims {
    color: var(--slate-400);
    font-size: var(--font-9);
    text-align: right;
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-md-alt;
  padding: 14px 20px;
  background: var(--slate-800);
  border-top: 1px solid Rgb(255 255 255 / 10%);

  .btn-secondary {
    padding: 8px 14px;
    border: none;
    border-radius: $radius-md;
    background: var(--slate-700);
    color: var(--slate-100);
    font-size: var(--font-12);
    font-weight: 600;
    cursor: pointer;

    &:hover {
      background: var(--slate-600);
    }
  }

  .btn-primary {
    padding: 8px 16px;
    border: none;
    border-radius: $radius-md;
    background: linear-gradient(135deg, var(--emerald-500) 0%, var(--emerald-500) 100%);
    color: var(--white);
    font-size: var(--font-12);
    font-weight: 700;
    cursor: pointer;
    box-shadow: var(--shadow-subtle);

    &:hover:not(:disabled) {
      filter: Brightness(1.1);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>
