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
  return `/test_aventura/assets/${entry.runtimePath}`;
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
          id="input-gallery-search"
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
          :id="'btn-gallery-cat-' + pill.id"
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
          :id="'card-asset-' + entry.id"
          :key="entry.id"
          v-gsap-hover
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
            
              width="32"
              height="32"
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
  width: 100%;
  height: 100%;
  background: var(--slate-900);
  border-left: 1px solid Rgb(255 255 255 / 12%);
  overflow: hidden;
}

.gallery-header {
  display: flex;
  flex-direction: column;
  gap: $spacing-md-alt;
  padding: 14px 16px;
  background: var(--slate-900);
  border-bottom: 1px solid Rgb(255 255 255 / 8%);
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.gallery-title {
  margin: 0;
  color: var(--slate-50);
  font-size: var(--font-14);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.gallery-count-badge {
  padding: 2px 8px;
  border: 1px solid var(--slate-700);
  border-radius: $radius-xl;
  background: var(--slate-800);
  color: var(--sky);
  font-family: monospace;
  font-size: var(--font-11);
  font-weight: 700;
}

.gallery-search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--slate-700);
  border-radius: $radius-md;
  background: var(--slate-800);
  color: var(--slate-50);
  font-size: var(--font-12);

  &:focus {
    outline: none;
    border-color: var(--sky);
  }

  &::placeholder {
    color: var(--slate-500);
  }
}

.category-pills {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
}

.category-pill-btn {
  padding: 3px 8px;
  border: 1px solid var(--slate-700);
  border-radius: $radius-xl;
  background: var(--slate-800);
  color: var(--slate-400);
  font-size: var(--font-10);
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: var(--slate-700);
    color: var(--slate-50);
  }

  &.active {
    background: var(--sky-dark);
    color: var(--white);
    font-weight: 700;
    border-color: var(--sky);
  }
}

.cards-container {
  padding: 12px;
  flex: 1;
  overflow-y: auto;
}

.cards-grid {
  display: flex;
  flex-direction: column;
  gap: $spacing-md-alt;
}

.asset-card {
  display: flex;
  gap: $spacing-md;
  padding: 8px;
  border: 1px solid var(--slate-700);
  border-radius: $radius-lg;
  background: var(--slate-800);
  cursor: pointer;

  &:hover {
    background: var(--slate-700);
    border-color: var(--slate-600);
  }

  &.selected {
    background: var(--slate-800);
    border-color: var(--sky);
    box-shadow: var(--shadow-card);
  }
}

.preview-frame {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 72px;
  min-width: 72px;
  height: 72px;
  border: 1px solid var(--slate-700);
  border-radius: $radius-md;
  background-color: var(--slate-900);
  overflow: hidden;
  background-image: 
    linear-gradient(45deg, #1e293b 25%, transparent 25%),
    linear-gradient(-45deg, #1e293b 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #1e293b 75%),
    linear-gradient(-45deg, transparent 75%, #1e293b 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
}

.preview-img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.card-info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  flex: 1;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-sm-alt;
}

.category-tag {
  padding: 1px 6px;
  border-radius: $radius-sm;
  background: var(--slate-700);
  color: var(--slate-300);
  font-size: var(--font-9);
  font-weight: 700;
  text-transform: uppercase;

  &.buildings { background: var(--slate-900); color: var(--blue-300); }
  &.roads { background: var(--slate-700); color: var(--slate-100); }
  &.curbs { background: var(--slate-600); color: var(--slate-200); }
  &.props { background: var(--emerald-500); color: var(--emerald-400); }
}

.dimensions-tag {
  color: var(--slate-400);
  font-family: monospace;
  font-size: var(--font-10);
}

.asset-id {
  margin: 2px 0 0;
  color: var(--sky);
  font-family: monospace;
  font-size: var(--font-12);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asset-name {
  margin: 0;
  color: var(--slate-300);
  font-size: var(--font-11);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--slate-500);
  font-family: monospace;
  font-size: var(--font-9);
  margin-top: 4px;
}

.sheet-source-tag {
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: $spacing-sm;
  padding: 40px 16px;
  color: var(--slate-500);
  text-align: center;

  .empty-icon {
    font-size: var(--font-28);
  }
}
</style>
