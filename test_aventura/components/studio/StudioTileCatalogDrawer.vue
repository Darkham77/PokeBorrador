<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useMapAdventureStudioStore } from '../../stores/mapAdventureStudio';
import { defaultPrefabsRegistry, type PrefabItem } from '../../logic/map/prefabsRegistry';
import { CELL_BIOME, type CellBiomeType } from '../../logic/map/kantoRegionalGenerator';

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
          class="tab-btn"
          :class="{ active: activeTab === 'prefabs' }"
          @click="activeTab = 'prefabs'"
        >
          <span class="icon">🏛️</span> Galería Prefabs
        </button>
        <button
          id="btn-tab-terrain"
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
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 6px;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  font-family: inherit;
  user-select: none;
}

.drawer-header {
  padding: 8px;
  border-bottom: 1px solid #1e293b;
  background: #090d16;

  .tabs-group {
    display: flex;
    background: #090d16;
    border: 1px solid #1e293b;
    border-radius: 4px;
    padding: 2px;
    gap: 2px;

    .tab-btn {
      flex: 1;
      padding: 6px 8px;
      font-size: 11px;
      font-weight: bold;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 3px;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: all 0.15s ease;

      &:hover:not(.active) {
        color: #f1f5f9;
        background: #1e293b;
      }

      &.active {
        background: #1e293b;
        color: #38bdf8;
        border-color: #38bdf8;
      }
    }
  }
}

.drawer-tab-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.prefabs-filters {
  padding: 8px;
  border-bottom: 1px solid #1e293b;
  display: flex;
  flex-direction: column;
  gap: 6px;

  .search-row {
    display: flex;
    gap: 4px;

    .retro-search-input {
      flex: 1;
      background: #090d16;
      border: 1px solid #1e293b;
      color: #f1f5f9;
      font-size: 11px;
      padding: 5px 8px;
      border-radius: 4px;

      &:focus {
        outline: none;
        border-color: #38bdf8;
      }
    }

    .btn-sync-icon {
      background: #1e293b;
      border: 1px solid #334155;
      color: #f1f5f9;
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;

      &:hover:not(:disabled) {
        border-color: #38bdf8;
      }
    }
  }

  .category-chips {
    display: flex;
    gap: 4px;

    .cat-chip {
      flex: 1;
      padding: 4px 6px;
      font-size: 10px;
      background: #090d16;
      border: 1px solid #1e293b;
      border-radius: 4px;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;

      &:hover:not(.active) {
        color: #f1f5f9;
        background: #1e293b;
      }

      &.active {
        background: #0284c7;
        color: #ffffff;
        border-color: #38bdf8;
      }
    }
  }
}

.prefabs-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
}

.prefabs-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;

  .prefab-card {
    display: flex;
    flex-direction: column;
    background: #090d16;
    border: 1px solid #1e293b;
    border-radius: 6px;
    padding: 6px;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: #475569;
      background: #111827;
    }

    &.selected {
      border-color: #38bdf8;
      background: #0c2340;
      box-shadow: 0 0 8px Rgba(56, 189, 248, 0.4);
    }

    .thumb-container {
      width: 100%;
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: Rgba(0, 0, 0, 0.3);
      border-radius: 4px;
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
        font-size: 10px;
        font-weight: bold;
        color: #e2e8f0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .prefab-dim {
        font-size: 9px;
        color: #94a3b8;
        font-family: monospace;
      }
    }

    .btn-stamp-action {
      font-size: 10px;
      padding: 3px;
      background: #1e293b;
      border: 1px solid #334155;
      color: #38bdf8;
      border-radius: 3px;
      cursor: pointer;
      font-weight: bold;

      &:hover {
        background: #0284c7;
        color: #ffffff;
      }
    }
  }
}

.empty-prefabs-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px 12px;
  color: #64748b;

  .icon {
    font-size: 32px;
    margin-bottom: 8px;
  }

  p {
    font-size: 12px;
    margin: 0 0 6px;
    color: #94a3b8;
  }

  small {
    font-size: 10px;
    line-height: 1.4;

    code {
      background: #1e293b;
      padding: 2px 4px;
      border-radius: 3px;
      color: #38bdf8;
    }
  }
}

.terrain-tab-content {
  padding: 12px;
  gap: 12px;
  overflow-y: auto;

  .section-title {
    font-size: 12px;
    font-weight: bold;
    color: #f1f5f9;
  }

  .section-hint {
    font-size: 10px;
    color: #94a3b8;
    margin: 0;
    line-height: 1.3;
  }

  .brush-size-group {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #090d16;
    border: 1px solid #1e293b;
    border-radius: 4px;
    padding: 6px 8px;

    .sub-title {
      font-size: 10px;
      color: #cbd5e1;
    }

    .brush-buttons {
      display: flex;
      gap: 4px;

      .brush-btn {
        padding: 3px 6px;
        font-size: 10px;
        background: #1e293b;
        border: 1px solid #334155;
        color: #cbd5e1;
        border-radius: 3px;
        cursor: pointer;

        &.active {
          background: #0284c7;
          border-color: #38bdf8;
          color: #ffffff;
        }
      }
    }
  }

  .biomes-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .biome-card {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: #090d16;
      border: 1px solid #1e293b;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;

      .color-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .icon {
        font-size: 14px;
      }

      .biome-label {
        font-size: 11px;
        font-weight: bold;
        color: #e2e8f0;
      }

      &:hover {
        background: #111827;
        border-color: #475569;
      }

      &.selected {
        background: #0c2340;
        border-color: #38bdf8;
        box-shadow: 0 0 8px Rgba(56, 189, 248, 0.4);
      }
    }
  }
}
</style>
