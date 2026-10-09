<script setup lang="ts">
import { ref, computed } from 'vue';
import { useContinentStudioStore } from '../../stores/continentStudio';
import {
  processSpriteSheet,
  type RawImageBuffer
} from '../../logic/map/continent/spritePipelineEngine';
import type { SlicedSpriteMetadata, SpriteCategory } from '../../types/map/continentTypes';
import { defaultPrefabsRegistry, type PrefabCategory } from '../../logic/map/prefabsRegistry';

const store = useContinentStudioStore();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isProcessing = ref(false);
const slicedSprites = ref<SlicedSpriteMetadata[]>([]);
const activeTab = ref<'all' | 'buildings' | 'props' | 'terrain'>('all');

const ALL_CATEGORIES: readonly SpriteCategory[] = [
  'building',
  'prop',
  'tree',
  'decor',
  'water_edge',
  'mountain',
  'snow',
  'path'
];

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
      const results = processSpriteSheet(rawBuf, { sourceName: baseName, tolerance: 25 });
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
  <div
    v-if="store.showSpriteModal"
    id="modal-sprite-pipeline"
    class="modal-backdrop"
    @click.self="store.showSpriteModal = false"
  >
    <div class="modal-card">
      <header class="modal-header">
        <div class="flex items-center gap-2">
          <span class="icon text-xl">📚</span>
          <h3 class="modal-title">
            Pipeline Inteligente de Spritesheets
          </h3>
        </div>
        <button
          id="btn-close-sprite-modal"
          class="btn-close"
          @click="store.showSpriteModal = false"
        >
          <span class="emoji-inline">✕</span>
        </button>
      </header>

      <div class="modal-body">
        <!-- Drop Zone for Spritesheets -->
        <div
          class="drop-zone"
          @dragover.prevent
          @drop="handleDrop"
          @click="fileInputRef?.click()"
        >
          <input
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
                class="tab-btn"
                :class="{ active: activeTab === 'all' }"
                @click="activeTab = 'all'"
              >
                <span class="icon">📦</span> Todos
              </button>
              <button
                class="tab-btn"
                :class="{ active: activeTab === 'buildings' }"
                @click="activeTab = 'buildings'"
              >
                <span class="icon">🏛️</span> Edificios
              </button>
              <button
                class="tab-btn"
                :class="{ active: activeTab === 'props' }"
                @click="activeTab = 'props'"
              >
                <span class="icon">🌲</span> Decoraciones
              </button>
              <button
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
                >
              </div>
              <div class="sprite-info">
                <select
                  v-model="sprite.category"
                  class="cat-select"
                  title="Reclasificar categoría"
                >
                  <option
                    v-for="c in ALL_CATEGORIES"
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
      </div>

      <footer class="modal-footer">
        <button
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
      </footer>
    </div>
  </div>
</template>

<style scoped lang="scss">
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: Rgba(0, 0, 0, 0.8);
  backdrop-filter: Blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-hud);
}

.modal-card {
  width: 90%;
  max-width: 800px;
  max-height: dvh;
  background: #0f172a;
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 16px 36px Rgba(0, 0, 0, 0.6);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.1);
  background: #1e293b;
}

.modal-title {
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}

.btn-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;

  &:hover {
    color: #ffffff;
  }
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.drop-zone {
  border: 2px dashed Rgba(56, 189, 248, 0.4);
  background: Rgba(56, 189, 248, 0.04);
  border-radius: 10px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: Rgba(56, 189, 248, 0.08);
    border-color: #38bdf8;
  }

  .drop-icon {
    font-size: 32px;
    display: block;
    margin-bottom: 8px;
  }

  .drop-text {
    color: #f1f5f9;
    font-weight: 600;
    font-size: 14px;
    margin: 0 0 4px 0;
  }

  .drop-hint {
    color: #94a3b8;
    font-size: 11px;
  }
}

.hidden-input {
  display: none;
}

.processing-banner {
  background: #1e293b;
  border: 1px solid #3b82f6;
  padding: 10px 16px;
  border-radius: 6px;
  color: #93c5fd;
  font-size: 12px;
  text-align: center;
}

.results-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  h4 {
    color: #f8fafc;
    font-size: 13px;
    margin: 0;
  }
}

.filter-tabs {
  display: flex;
  gap: 4px;
  background: #090d16;
  padding: 3px;
  border-radius: 6px;

  .tab-btn {
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;

    &.active {
      background: #3b82f6;
      color: #ffffff;
    }
  }
}

.sprites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 4px;
}

.sprite-card {
  background: #1e293b;
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sprite-preview-box {
  background: repeating-conic-gradient(#1a202c 0% 25%, #2d3748 0% 50%) 50% / 16px 16px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;

  .preview-img {
    max-width: 100%;
    max-height: 100%;
    image-rendering: pixelated;
    object-fit: contain;
  }
}

.sprite-info {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  .cat-select {
    background: #0f172a;
    color: #f8fafc;
    border: 1px solid Rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    font-size: 10px;
    padding: 2px 4px;
    cursor: pointer;
  }

  .sprite-dims {
    color: #94a3b8;
    font-size: 9px;
    text-align: right;
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid Rgba(255, 255, 255, 0.1);
  background: #1e293b;

  .btn-secondary {
    background: #334155;
    color: #f1f5f9;
    border: none;
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;

    &:hover {
      background: #475569;
    }
  }

  .btn-primary {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: #ffffff;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 2px 8px Rgba(16, 185, 129, 0.4);

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
