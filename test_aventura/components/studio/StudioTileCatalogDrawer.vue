<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useMapAdventureStudioStore } from '../../stores/mapAdventureStudio';
import { CELL_BIOME, type CellBiomeType } from '../../types/map/kantoGridModel';
import { defaultPrefabsRegistry, type PrefabItem } from '../../logic/map/prefabsRegistry';

const adventureStore = useMapAdventureStudioStore();

type CatalogTab = 'prefabs' | 'terrain';
const activeTab = ref<CatalogTab>('prefabs');

// Prefabs Gallery State
const selectedCategory = ref<string>('all');
const searchQuery = ref<string>('');
const isSyncing = ref<boolean>(false);
const registryVersion = ref<number>(0);

const PREFAB_CATEGORIES = [
  { id: 'all', label: 'Todos', icon: '📦' },
  { id: 'buildings', label: 'Edificios', icon: '🏛️' },
  { id: 'vegetation', label: 'Vegetación', icon: '🌲' },
  { id: 'props', label: 'Props', icon: '🏮' }
] as const;

// Base Continuous Biomes
interface BiomeOption {
  readonly id: CellBiomeType;
  readonly label: string;
  readonly icon: string;
  readonly color: string;
}

const BASE_BIOMES: readonly BiomeOption[] = [
  { id: CELL_BIOME.GRASS, label: 'Césped Base', icon: '🌿', color: '#5ca942' },
  { id: CELL_BIOME.TALL_GRASS, label: 'Hierba Alta', icon: '🌾', color: '#3d862e' },
  { id: CELL_BIOME.DIRT_PATH, label: 'Camino de Tierra', icon: '🛤️', color: '#d8aa66' },
  { id: CELL_BIOME.WATER, label: 'Agua Continua', icon: '🌊', color: '#3388ee' },
  { id: CELL_BIOME.MOUNTAIN_DIRT, label: 'Montaña / Roca', icon: '⛰️', color: '#8b5a2b' },
  { id: CELL_BIOME.PLAZA_STONE, label: 'Piedra de Plaza', icon: '🏛️', color: '#94a3b8' },
  { id: CELL_BIOME.BRIDGE, label: 'Puente / Muelle', icon: '🌉', color: '#b45309' }
];

const BRUSH_SIZES = [1, 2, 4, 8] as const;

const allPrefabs = computed<readonly PrefabItem[]>(() => {
  if (registryVersion.value < 0) return [];
  return defaultPrefabsRegistry.getAllPrefabs();
});

const filteredPrefabs = computed(() => {
  let list = allPrefabs.value;
  const cat = selectedCategory.value;
  const q = searchQuery.value.trim().toLowerCase();

  if (cat !== 'all') {
    list = list.filter(p => p.category === cat);
  }

  if (q) {
    list = list.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }

  return list;
});

function selectPrefabItem(item: PrefabItem): void {
  adventureStore.selectPrefab({
    id: item.id,
    name: item.name,
    category: item.category,
    style: item.id,
    width: item.width,
    height: item.height,
    file_path: item.file_path
  });
}

function selectBiome(biome: CellBiomeType): void {
  adventureStore.selectedBiome = biome;
  adventureStore.activeMode = 'terrain';
}

async function loadManifest(): Promise<void> {
  isSyncing.value = true;
  try {
    await defaultPrefabsRegistry.loadManifest();
    registryVersion.value++;
  } catch (e) {
    console.warn('[StudioTileCatalogDrawer] Error loading prefabs manifest:', e);
  } finally {
    isSyncing.value = false;
  }
}

onMounted(async () => {
  await loadManifest();
});
</script>

<template>
  <div class="studio-prefabs-drawer">
    <!-- Header with Tabs -->
    <div class="drawer-header">
      <div class="tabs-group">
        <button
          id="btn-tab-prefabs"
          v-gsap-hover="'button'"
          class="tab-btn"
          :class="{ active: activeTab === 'prefabs' }"
          @click="activeTab = 'prefabs'"
        >
          <span class="icon">🏛️</span> Galería Prefabs
        </button>
        <button
          id="btn-tab-terrain"
          v-gsap-hover="'button'"
          class="tab-btn"
          :class="{ active: activeTab === 'terrain' }"
          @click="activeTab = 'terrain'"
        >
          <span class="icon">⚡</span> Terreno Base
        </button>
      </div>
    </div>

    <!-- TAB 1: PREFABS GALLERY -->
    <div
      v-if="activeTab === 'prefabs'"
      class="drawer-tab-content"
    >
      <!-- Filters and Category Chips -->
      <div class="prefabs-filters">
        <div class="search-row">
          <input
            id="input-prefab-search"
            v-model="searchQuery"
            type="text"
            placeholder="Buscar edificio, árbol, prop..."
            class="retro-search-input"
          >
          <button
            id="btn-refresh-prefabs"
            class="btn-sync-icon"
            title="Recargar catálogo de prefabs"
            :disabled="isSyncing"
            @click="loadManifest"
          >
            {{ isSyncing ? '⏳' : '🔄' }}
          </button>
        </div>

        <!-- Category Chips -->
        <div class="category-chips">
          <button
            v-for="c in PREFAB_CATEGORIES"
            :id="'chip-' + c.id"
            :key="c.id"
            class="cat-chip"
            :class="{ active: selectedCategory === c.id }"
            @click="selectedCategory = c.id"
          >
            <span class="icon">{{ c.icon }}</span> {{ c.label }}
          </button>
        </div>
      </div>

      <!-- Prefab Items Grid -->
      <div class="prefabs-scroll-area">
        <div
          v-if="filteredPrefabs.length === 0"
          class="empty-prefabs-hint"
        >
          <span class="icon">📭</span>
          <p>No se encontraron prefabs.</p>
          <small>Coloca plantillas en <code>prefabs/inbox/</code> y ejecuta <code>npm run prefabs:extract</code></small>
        </div>

        <div
          v-else
          class="prefabs-grid"
        >
          <div
            v-for="p in filteredPrefabs"
            :id="'prefab-card-' + p.id"
            :key="p.id"
            v-gsap-hover="'card'"
            class="prefab-card"
            :class="{ selected: adventureStore.stampingPrefab?.id === p.id && adventureStore.activeTool === 'stamp' }"
            :title="p.name + ' (' + p.width + 'x' + p.height + ' px)'"
            @click="selectPrefabItem(p)"
          >
            <div class="thumb-container">
              <img
                :src="p.file_path"
                :alt="p.name"
                class="prefab-thumb"
                loading="lazy"
              
                width="32"
                height="32"
              >
            </div>
            <div class="prefab-info">
              <span class="prefab-name">{{ p.name }}</span>
              <span class="prefab-dim">{{ p.width }}x{{ p.height }} px</span>
            </div>
            <button
              :id="'btn-stamp-' + p.id"
              class="btn-stamp-action"
            >
              Estampar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: CONTINUOUS TERRAIN BIOMES -->
    <div
      v-else
      class="drawer-tab-content terrain-tab-content"
    >
      <div class="section-title">
        Pincel de Terreno Continuo
      </div>
      <p class="section-hint">
        Pinta biomas de suelo continuos sobre el canvas. Las costas, caminos y acantilados se autotitulan orgánicamente.
      </p>

      <!-- Brush Size Control -->
      <div class="brush-size-group">
        <span class="sub-title">Tamaño de Pincel:</span>
        <div class="brush-buttons">
          <button
            v-for="s in BRUSH_SIZES"
            :id="'btn-brush-' + s"
            :key="s"
            class="brush-btn"
            :class="{ active: adventureStore.brushSize === s }"
            @click="adventureStore.brushSize = s"
          >
            {{ s }}x{{ s }}
          </button>
        </div>
      </div>

      <!-- Biomes List -->
      <div class="biomes-grid">
        <div
          v-for="b in BASE_BIOMES"
          :id="'biome-card-' + b.id"
          :key="b.id"
          v-gsap-hover="'card'"
          class="biome-card"
          :class="{ selected: adventureStore.selectedBiome === b.id && adventureStore.activeMode === 'terrain' }"
          @click="selectBiome(b.id)"
        >
          <span
            class="color-dot"
            :style="{ background: b.color }"
          />
          <span class="icon">{{ b.icon }}</span>
          <span class="biome-label">{{ b.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.studio-prefabs-drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  border: 1px solid var(--slate-800);
  border-radius: $radius-md;
  background: var(--slate-900);
  font-family: inherit;
  overflow: hidden;
  user-select: none;
}

.drawer-header {
  padding: 8px;
  background: var(--slate-900);
  border-bottom: 1px solid var(--slate-800);

  .tabs-group {
    display: flex;
    gap: $spacing-2xs;
    padding: 2px;
    border: 1px solid var(--slate-800);
    border-radius: $radius-sm;
    background: var(--slate-900);

    .tab-btn {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: $spacing-xs;
      padding: 6px 8px;
      border: 1px solid transparent;
      border-radius: $radius-xs-alt;
      background: transparent;
      color: var(--slate-400);
      font-size: var(--font-11);
      font-weight: bold;
      flex: 1;
      cursor: pointer;

      &:hover:not(.active) {
        background: var(--slate-800);
        color: var(--slate-100);
      }

      &.active {
        background: var(--slate-800);
        color: var(--sky);
        border-color: var(--sky);
      }
    }
  }
}

.drawer-tab-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.prefabs-filters {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm-alt;
  padding: 8px;
  border-bottom: 1px solid var(--slate-800);

  .search-row {
    display: flex;
    gap: $spacing-xs;

    .retro-search-input {
      padding: 5px 8px;
      border: 1px solid var(--slate-800);
      border-radius: $radius-sm;
      background: var(--slate-900);
      color: var(--slate-100);
      font-size: var(--font-11);
      flex: 1;

      &:focus {
        outline: none;
        border-color: var(--sky);
      }
    }

    .btn-sync-icon {
      padding: 4px 8px;
      border: 1px solid var(--slate-700);
      border-radius: $radius-sm;
      background: var(--slate-800);
      color: var(--slate-100);
      cursor: pointer;

      &:hover:not(:disabled) {
        border-color: var(--sky);
      }
    }
  }

  .category-chips {
    display: flex;
    gap: $spacing-xs;

    .cat-chip {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: $spacing-xs-alt;
      padding: 4px 6px;
      border: 1px solid var(--slate-800);
      border-radius: $radius-sm;
      background: var(--slate-900);
      color: var(--slate-400);
      font-size: var(--font-10);
      flex: 1;
      cursor: pointer;

      &:hover:not(.active) {
        background: var(--slate-800);
        color: var(--slate-100);
      }

      &.active {
        background: var(--sky-dark);
        color: var(--white);
        border-color: var(--sky);
      }
    }
  }
}

.prefabs-scroll-area {
  min-height: 0;
  padding: 8px;
  flex: 1;
  overflow-y: auto;
}

.prefabs-grid {
  display: grid;
  gap: $spacing-sm;
  grid-template-columns: repeat(2, 1fr);

  .prefab-card {
    display: flex;
    flex-direction: column;
    padding: 6px;
    border: 1px solid var(--slate-800);
    border-radius: $radius-md;
    background: var(--slate-900);
    cursor: pointer;

    &:hover {
      background: var(--slate-900);
      border-color: var(--slate-600);
    }

    &.selected {
      background: var(--slate-900);
      border-color: var(--sky);
      box-shadow: $shadow-glow-cyan;
    }

    .thumb-container {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 72px;
      border-radius: $radius-sm;
      background: Rgb(0 0 0 / 30%);
      overflow: hidden;
      margin-bottom: 4px;

      .prefab-thumb {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        image-rendering: pixelated;
      }
    }

    .prefab-info {
      display: flex;
      flex-direction: column;
      margin-bottom: 6px;

      .prefab-name {
        color: var(--slate-200);
        font-size: var(--font-10);
        font-weight: bold;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .prefab-dim {
        color: var(--slate-400);
        font-family: monospace;
        font-size: var(--font-9);
      }
    }

    .btn-stamp-action {
      padding: 3px;
      border: 1px solid var(--slate-700);
      border-radius: $radius-xs-alt;
      background: var(--slate-800);
      color: var(--sky);
      font-size: var(--font-10);
      font-weight: bold;
      cursor: pointer;

      &:hover {
        background: var(--sky-dark);
        color: var(--white);
      }
    }
  }
}

.empty-prefabs-hint {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 24px 12px;
  color: var(--slate-500);
  text-align: center;

  .icon {
    font-size: var(--font-32);
    margin-bottom: 8px;
  }

  p {
    margin: 0 0 6px;
    color: var(--slate-400);
    font-size: var(--font-12);
  }

  small {
    font-size: var(--font-10);
    line-height: 1.4;

    code {
      padding: 2px 4px;
      border-radius: $radius-xs-alt;
      background: var(--slate-800);
      color: var(--sky);
    }
  }
}

.terrain-tab-content {
  gap: $spacing-md;
  padding: 12px;
  overflow-y: auto;

  .section-title {
    color: var(--slate-100);
    font-size: var(--font-12);
    font-weight: bold;
  }

  .section-hint {
    margin: 0;
    color: var(--slate-400);
    font-size: var(--font-10);
    line-height: 1.3;
  }

  .brush-size-group {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    border: 1px solid var(--slate-800);
    border-radius: $radius-sm;
    background: var(--slate-900);

    .sub-title {
      color: var(--slate-300);
      font-size: var(--font-10);
    }

    .brush-buttons {
      display: flex;
      gap: $spacing-xs;

      .brush-btn {
        padding: 3px 6px;
        border: 1px solid var(--slate-700);
        border-radius: $radius-xs-alt;
        background: var(--slate-800);
        color: var(--slate-300);
        font-size: var(--font-10);
        cursor: pointer;

        &.active {
          background: var(--sky-dark);
          color: var(--white);
          border-color: var(--sky);
        }
      }
    }
  }

  .biomes-grid {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm-alt;

    .biome-card {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
      padding: 8px;
      border: 1px solid var(--slate-800);
      border-radius: $radius-sm;
      background: var(--slate-900);
      cursor: pointer;

      &:hover {
        background: var(--slate-900);
        border-color: var(--slate-600);
      }

      .color-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .icon {
        font-size: var(--font-14);
      }

      .biome-label {
        color: var(--slate-200);
        font-size: var(--font-11);
        font-weight: bold;
      }

      &.selected {
        background: var(--slate-900);
        border-color: var(--sky);
        box-shadow: $shadow-glow-cyan;
      }
    }
  }
}
</style>
