<script setup lang="ts">
/**
 * src/components/studio/assets/AssetGalleryPanel.vue
 *
 * PANEL B: REGISTERED CANONICAL ASSETS GALLERY
 *
 * Features:
 *   1. Search filter by ID or Name.
 *   2. Category pills (roads_curbs, buildings, nature, props, terrain).
 *   3. Thumbnail cards with retro checkered background for alpha transparency.
 *   4. Tile dimension metadata reporting.
 *   5. Bidirectional click-to-focus camera synchronization.
 */

import { ref, computed } from 'vue';
import type { CanonicalAssetEntry } from '../../logic/map/canonicalAssetsRegistry.ts';

const props = defineProps<{
  entries: readonly CanonicalAssetEntry[];
  selectedAssetId: string | null;
}>();

const emit = defineEmits<{
  (e: 'select-asset', entry: CanonicalAssetEntry): void;
}>();

const searchQuery = ref<string>('');
const selectedCategory = ref<string>('all');

const categoryPills = [
  { id: 'all', label: 'Todos' },
  { id: 'buildings', label: 'Edificios' },
  { id: 'elevation', label: 'Riscos & Montañas' },
  { id: 'water', label: 'Aguas & Costas' },
  { id: 'terrain', label: 'Terreno & Suelo' },
  { id: 'roads_curbs', label: 'Calzadas & Cordones' },
  { id: 'nature', label: 'Naturaleza (Flora)' },
  { id: 'props', label: 'Mobiliario (Props)' }
] as const;

const filteredEntries = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const cat = selectedCategory.value;

  return props.entries.filter((entry) => {
    // Category match
    if (cat === 'roads_curbs') {
      if (entry.category !== 'roads' && entry.category !== 'curbs') return false;
    } else if (cat === 'elevation') {
      if (entry.category !== 'elevation') return false;
    } else if (cat === 'water') {
      if (entry.category !== 'water') return false;
    } else if (cat === 'terrain') {
      if (entry.category !== 'terrain') return false;
    } else if (cat === 'nature') {
      const isNature = entry.category === 'vegetation' || entry.id.includes('tree') || entry.id.includes('flower') || entry.id.includes('bush');
      if (!isNature) return false;
    } else if (cat === 'buildings') {
      if (entry.category !== 'buildings') return false;
    } else if (cat === 'props') {
      if (entry.category !== 'props') return false;
    }

    // Search query match
    if (q) {
      const matchId = entry.id.toLowerCase().includes(q);
      const matchName = entry.name.toLowerCase().includes(q);
      const matchSrc = entry.sourceImage.toLowerCase().includes(q);
      if (!matchId && !matchName && !matchSrc) return false;
    }

    return true;
  });
});

function getAssetUrl(entry: CanonicalAssetEntry): string {
  return `/assets/${entry.runtimePath}`;
}
</script>

<template>
  <aside class="asset-gallery-panel">
    <!-- Header & Search -->
    <header class="gallery-header">
      <div class="header-top">
        <h2 class="gallery-title">
          Assets Registrados
        </h2>
        <span class="gallery-count-badge">{{ filteredEntries.length }} / {{ entries.length }}</span>
      </div>

      <div class="search-box">
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Buscar por ID, nombre o fuente..."
          class="gallery-search-input"
        >
      </div>

      <!-- Category Filter Pills -->
      <nav class="category-pills">
        <button
          v-for="pill in categoryPills"
          :key="pill.id"
          type="button"
          class="category-pill-btn"
          :class="{ active: selectedCategory === pill.id }"
          @click="selectedCategory = pill.id"
        >
          {{ pill.label }}
        </button>
      </nav>
    </header>

    <!-- Cards Scrollable Grid -->
    <div class="cards-container">
      <div
        v-if="filteredEntries.length === 0"
        class="empty-state"
      >
        <span class="empty-icon">🔍</span>
        <p>No se encontraron assets con este filtro.</p>
      </div>

      <div
        v-else
        class="cards-grid"
      >
        <article
          v-for="entry in filteredEntries"
          :key="entry.id"
          class="asset-card"
          :class="{ selected: selectedAssetId === entry.id }"
          @click="emit('select-asset', entry)"
        >
          <!-- Checkered Sprite Preview Frame -->
          <div class="preview-frame">
            <img
              :src="getAssetUrl(entry)"
              :alt="entry.name"
              class="preview-img"
              loading="lazy"
            >
          </div>

          <!-- Meta Info -->
          <div class="card-info">
            <div class="card-header-row">
              <span
                class="category-tag"
                :class="entry.category"
              >{{ entry.category }}</span>
              <span class="dimensions-tag">{{ entry.tileDimensions.w }}×{{ entry.tileDimensions.h }} baldosas</span>
            </div>

            <h3
              class="asset-id"
              :title="entry.id"
            >
              {{ entry.id }}
            </h3>
            <p
              class="asset-name"
              :title="entry.name"
            >
              {{ entry.name }}
            </p>

            <div class="card-footer-row">
              <span
                class="sheet-source-tag"
                :title="entry.sourceImage"
              >
                <span class="icon">📄</span> {{ entry.sourceImage }}
              </span>
              <span class="pixel-dims-tag">
                {{ entry.pixelDimensions.w }}×{{ entry.pixelDimensions.h }}px
              </span>
            </div>
          </div>
        </article>
      </div>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.asset-gallery-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #0f172a;
  border-left: 1px solid Rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

.gallery-header {
  padding: 14px 16px;
  background: #0b1120;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.gallery-title {
  font-size: 14px;
  font-weight: 800;
  color: #f8fafc;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}

.gallery-count-badge {
  font-size: 11px;
  font-weight: 700;
  background: #1e293b;
  color: #38bdf8;
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid #334155;
  font-family: monospace;
}

.gallery-search-input {
  width: 100%;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  color: #f8fafc;

  &:focus {
    outline: none;
    border-color: #38bdf8;
  }

  &::placeholder {
    color: #64748b;
  }
}

.category-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.category-pill-btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: #334155;
    color: #f8fafc;
  }

  &.active {
    background: #0284c7;
    border-color: #38bdf8;
    color: #ffffff;
    font-weight: 700;
  }
}

.cards-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.cards-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.asset-card {
  display: flex;
  gap: 12px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: #273549;
    border-color: #475569;
    transform: Translatey(-1px);
  }

  &.selected {
    border-color: #38bdf8;
    background: #182844;
    box-shadow: 0 0 0 1px #38bdf8;
  }
}

.preview-frame {
  width: 72px;
  height: 72px;
  min-width: 72px;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0d1117;
  background-image: 
    linear-gradient(45deg, #1e293b 25%, transparent 25%),
    linear-gradient(-45deg, #1e293b 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #1e293b 75%),
    linear-gradient(-45deg, transparent 75%, #1e293b 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  border: 1px solid #334155;
}

.preview-img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.category-tag {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 4px;
  background: #334155;
  color: #cbd5e1;

  &.buildings { background: #4338ca; color: #e0e7ff; }
  &.roads { background: #374151; color: #f3f4f6; }
  &.curbs { background: #4b5563; color: #e5e7eb; }
  &.props { background: #065f46; color: #d1fae5; }
}

.dimensions-tag {
  font-size: 10px;
  color: #94a3b8;
  font-family: monospace;
}

.asset-id {
  font-size: 12px;
  font-weight: 700;
  color: #38bdf8;
  margin: 2px 0 0;
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asset-name {
  font-size: 11px;
  color: #cbd5e1;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 9px;
  color: #64748b;
  font-family: monospace;
}

.sheet-source-tag {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  color: #64748b;
  text-align: center;
  gap: 8px;

  .empty-icon {
    font-size: 28px;
  }
}
</style>
