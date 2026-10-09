<script setup lang="ts">
import { ref, computed } from 'vue';
import { useContinentStudioStore, type StudioActiveTool } from '../../stores/continentStudio';
import type { ContinentBiomeType, ContinentProject } from '../../types/map/continentTypes';
import StudioProceduralConfigModal from './StudioProceduralConfigModal.vue';
import StudioSpritePipelineModal from './StudioSpritePipelineModal.vue';
import { defaultPrefabsRegistry } from '../../logic/map/prefabsRegistry';

const emit = defineEmits<{
  (e: 'export-png'): void;
}>();

const store = useContinentStudioStore();

const svgFileInputRef = ref<HTMLInputElement | null>(null);

const projectsList = computed<ContinentProject[]>(() => Object.values(store.projects));

function handleNewMap(): void {
  const name = prompt('Nombre del nuevo mapa:', 'Nueva Región');
  if (name && name.trim()) {
    store.createNewProject(name.trim());
  }
}

function handleSaveMap(): void {
  store.saveCurrentProject();
  alert(`¡Mapa "${store.activeProject.name}" guardado en el perfil con éxito!`);
}

function handleGenerate(): void {
  store.generateGeography(true);
}

function handleExportSvg(): void {
  const svgStr = store.exportSvg();
  const blob = new Blob([svgStr], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${store.activeProject.name || 'region'}_rutas.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleImportSvgInput(e: Event): void {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (readEvent) => {
      const raw = readEvent.target?.result as string;
      if (store.importSvg(raw)) {
        alert('¡Rutas SVG importadas y geografía adaptada con éxito!');
      } else {
        alert('Error: No se pudieron leer nodos válidos del archivo SVG.');
      }
    };
    reader.readAsText(file);
    target.value = '';
  }
}

const isSyncing = ref(false);

async function handleSyncAssets(): Promise<void> {
  if (isSyncing.value) return;
  isSyncing.value = true;
  try {
    const res = await fetch('/api/studio/sync-assets', { method: 'POST' });
    const data = (await res.json()) as { success: boolean; totalPrefabs?: number; error?: string };
    if (data.success) {
      await defaultPrefabsRegistry.loadManifest('/assets/prefabs/manifest.json');
      store.generateGeography(false);
      alert(`¡Catálogo de assets actualizado con éxito! (${data.totalPrefabs ?? 0} prefabs registrados)`);
    } else {
      alert(`Error al sincronizar assets: ${data.error ?? 'Error desconocido'}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    alert(`Error de red al actualizar assets: ${msg}`);
  } finally {
    isSyncing.value = false;
  }
}

const connectionTools: readonly { id: StudioActiveTool; label: string; icon: string }[] = [
  { id: 'pointer', label: 'Mover', icon: '👆' },
  { id: 'add_node', label: 'Añadir', icon: '➕' },
  { id: 'connect', label: 'Enlazar', icon: '🔗' },
  { id: 'delete', label: 'Borrar', icon: '🗑️' }
];

const biomesList: readonly { id: ContinentBiomeType; label: string; icon: string }[] = [
  { id: 'grass', label: 'Césped', icon: '🌿' },
  { id: 'path', label: 'Camino', icon: '🛤️' },
  { id: 'ocean', label: 'Agua', icon: '🌊' },
  { id: 'forest', label: 'Hierba Alta', icon: '🌾' },
  { id: 'mountain', label: 'Montaña', icon: '⛰️' }
];

const prefabsList: readonly { id: string; label: string; icon: string }[] = [
  { id: 'pokecenter', label: 'Centro Pokémon', icon: '🏥' },
  { id: 'pokemart', label: 'Tienda Pokémon', icon: '🏪' },
  { id: 'gym', label: 'Gimnasio', icon: '🏛️' },
  { id: 'house_red', label: 'Casa Tejado Rojo', icon: '🏡' },
  { id: 'house_blue', label: 'Casa Tejado Azul', icon: '🏠' },
  { id: 'tree_poke', label: 'Árbol Kanto', icon: '🌲' },
  { id: 'street_lamp', label: 'Farola', icon: '🏮' }
];
</script>

<template>
  <header class="studio-toolbar">
    <!-- Cluster 1: Vistas y Herramientas Contextuales -->
    <div class="toolbar-cluster cluster-views-tools">
      <router-link
        id="btn-return-game"
        to="/"
        class="brand-link"
        title="Volver al Juego"
      >
        ◀ PokéVicio
      </router-link>

      <div class="divider" />

      <!-- View Selector -->
      <div class="view-toggle-group">
        <button
          id="btn-view-geographic"
          class="btn-view"
          :class="{ active: store.activeView === 'geographic' }"
          title="Vista Geográfica (Overworld GBA auténtico)"
          @click="store.setView('geographic')"
        >
          <span class="icon">🗺️</span>
          <span>Geográfica</span>
        </button>

        <button
          id="btn-view-connections"
          class="btn-view"
          :class="{ active: store.activeView === 'connections' }"
          title="Vista Conexiones (Grafo vectorial SVG)"
          @click="store.setView('connections')"
        >
          <span class="icon">🔗</span>
          <span>Conexiones</span>
        </button>
      </div>

      <div class="divider" />

      <!-- Contextual Tools according to Active View -->
      <div
        v-if="store.activeView === 'geographic'"
        class="context-tools-group"
      >
        <button
          id="tool-btn-pointer-geo"
          class="tool-btn"
          :class="{ active: store.activeTool === 'pointer' }"
          title="Navegar / Inspeccionar"
          @click="store.activeTool = 'pointer'"
        >
          <span><span class="icon">👆</span> Puntero</span>
        </button>

        <button
          id="tool-btn-terrain"
          class="tool-btn"
          :class="{ active: store.activeTool === 'terrain' }"
          title="Pincel de Terreno Autotile"
          @click="store.activeTool = 'terrain'"
        >
          <span><span class="icon">🌱</span> Terreno</span>
        </button>

        <!-- Terrain Brush Subcontrols -->
        <template v-if="store.activeTool === 'terrain'">
          <select
            id="select-terrain-biome"
            v-model="store.terrainBrushBiome"
            class="toolbar-subselect"
            title="Bioma a pintar"
          >
            <option
              v-for="b in biomesList"
              :key="b.id"
              :value="b.id"
            >
              {{ b.icon }} {{ b.label }}
            </option>
          </select>

          <select
            id="select-brush-size"
            v-model.number="store.terrainBrushSize"
            class="toolbar-subselect"
            title="Tamaño del pincel"
          >
            <option :value="1">
              1×1
            </option>
            <option :value="2">
              2×2
            </option>
            <option :value="4">
              4×4
            </option>
            <option :value="8">
              8×8
            </option>
          </select>
        </template>

        <button
          id="tool-btn-structures"
          class="tool-btn"
          :class="{ active: store.activeTool === 'structures' }"
          title="Estampar Edificios y Props GBA"
          @click="store.activeTool = 'structures'"
        >
          <span>🏛️ Estructuras</span>
        </button>

        <!-- Structures Subcontrols -->
        <template v-if="store.activeTool === 'structures'">
          <select
            id="select-prefab-stamp"
            v-model="store.selectedPrefabId"
            class="toolbar-subselect"
            title="Estructura a estampar"
          >
            <option
              v-for="p in prefabsList"
              :key="p.id"
              :value="p.id"
            >
              {{ p.icon }} {{ p.label }}
            </option>
          </select>
        </template>
      </div>

      <!-- Connections Mode Tools -->
      <div
        v-else-if="store.activeView === 'connections'"
        class="context-tools-group"
      >
        <button
          v-for="t in connectionTools"
          :id="`tool-btn-${t.id}`"
          :key="t.id"
          class="tool-btn"
          :class="{ active: store.activeTool === t.id }"
          :title="t.label"
          @click="store.activeTool = t.id"
        >
          <span class="icon">{{ t.icon }}</span>
          <span>{{ t.label }}</span>
        </button>
      </div>
    </div>

    <!-- Cluster 2: Acciones de Generación -->
    <div class="toolbar-cluster cluster-generation">
      <button
        id="btn-open-config"
        class="btn-action btn-icon-text"
        title="Parámetros procedurales (Sliders de agua, bosque, montaña, tamaño y seed)"
        @click="store.showConfigModal = true"
      >
        <span class="icon">⚙️</span>
        <span>Ajustes</span>
      </button>

      <button
        id="btn-load-kanto"
        class="btn-action btn-secondary"
        title="Restaurar región canónica de Kanto (Pueblo Paleta a Meseta Añil)"
        @click="store.loadCanonicalPreset('kanto')"
      >
        <span class="icon">🏛️</span>
        <span>Kanto Canónico</span>
      </button>

      <button
        id="btn-generate-geography"
        class="btn-action btn-generate"
        title="Generar geografía procedural y maqueta urbana alrededor de las rutas"
        @click="handleGenerate"
      >
        <span class="icon">🌍</span>
        <span>Generar Geografía</span>
      </button>
    </div>

    <!-- Cluster 3: Gestión de Mapa -->
    <div class="toolbar-cluster cluster-management">
      <select
        id="select-project-profile"
        :value="store.activeProjectId"
        class="profile-select"
        title="Seleccionar o cambiar Perfil de Mapa"
        @change="(e) => store.selectProject((e.target as HTMLSelectElement).value)"
      >
        <option
          v-for="p in projectsList"
          :key="p.id"
          :value="p.id"
        >
          {{ p.name }}
        </option>
      </select>

      <button
        id="btn-new-map"
        class="btn-action btn-secondary"
        title="Crear un nuevo mapa en blanco"
        @click="handleNewMap"
      >
        <span class="icon">📄</span>
        <span>Blanco</span>
      </button>

      <button
        id="btn-save-map"
        class="btn-action btn-secondary"
        title="Guardar perfil actual"
        @click="handleSaveMap"
      >
        <span class="icon">💾</span>
      </button>

      <div class="undo-redo-group">
        <button
          id="btn-studio-undo"
          class="btn-action btn-icon-only"
          :disabled="!store.canUndo"
          title="Deshacer (Ctrl+Z)"
          @click="store.undo"
        >
          <span>↩️</span>
        </button>
        <button
          id="btn-studio-redo"
          class="btn-action btn-icon-only"
          :disabled="!store.canRedo"
          title="Rehacer (Ctrl+Y)"
          @click="store.redo"
        >
          <span>↪️</span>
        </button>
      </div>
    </div>

    <!-- Cluster 4: Hub Importar / Exportar -->
    <div class="toolbar-cluster cluster-import-export">
      <input
        ref="svgFileInputRef"
        type="file"
        accept=".svg"
        class="hidden-file-input"
        @change="handleImportSvgInput"
      >

      <button
        id="btn-open-sprites"
        class="btn-action btn-sprites"
        title="Importar y procesar spritesheets (eliminar fondo y categorizar)"
        @click="store.showSpriteModal = true"
      >
        <span class="icon">📁</span>
        <span>Sprites</span>
      </button>

      <button
        id="btn-sync-assets"
        class="btn-action btn-secondary"
        :disabled="isSyncing"
        title="Actualizar y registrar todos los prefabs y hojas de sprites automáticamente"
        @click="handleSyncAssets"
      >
        <span
          class="icon"
          :class="{ 'spin-anim': isSyncing }"
        >🔄</span>
        <span>{{ isSyncing ? 'Sincronizando...' : 'Actualizar' }}</span>
      </button>

      <button
        id="btn-import-svg"
        class="btn-action btn-secondary"
        title="Importar rutas SVG"
        @click="svgFileInputRef?.click()"
      >
        <span class="icon">📥</span>
      </button>

      <button
        id="btn-export-svg"
        class="btn-action btn-secondary"
        title="Exportar archivo vectorial SVG"
        @click="handleExportSvg"
      >
        <span class="icon">📤</span>
      </button>

      <button
        id="btn-export-png"
        class="btn-action btn-primary"
        title="Exportar mapa en PNG de alta resolución"
        @click="emit('export-png')"
      >
        <span class="icon">🖼️</span>
        <span>Exportar PNG</span>
      </button>
    </div>

    <!-- Modals -->
    <StudioProceduralConfigModal />
    <StudioSpritePipelineModal />
  </header>
</template>

<style scoped lang="scss">
.studio-toolbar {
  height: 52px;
  background: #090d16;
  border-bottom: 2px solid #1e293b;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  gap: 8px;
  user-select: none;
  z-index: 30;
  box-shadow: 0 4px 12px Rgba(0, 0, 0, 0.4);
}

.toolbar-cluster {
  display: flex;
  align-items: center;
  gap: 6px;
}

.brand-link {
  color: #38bdf8;
  text-decoration: none;
  font-weight: bold;
  font-size: 13px;
  padding: 5px 8px;
  border-radius: 6px;
  background: Rgba(56, 189, 248, 0.08);

  &:hover {
    background: Rgba(56, 189, 248, 0.16);
  }
}

.divider {
  width: 1px;
  height: 22px;
  background: Rgba(255, 255, 255, 0.12);
  margin: 0 2px;
}

.view-toggle-group {
  display: flex;
  background: #0f172a;
  padding: 2px;
  border-radius: 6px;
  border: 1px solid Rgba(255, 255, 255, 0.08);

  .btn-view {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 5px;
    border: none;
    background: transparent;
    color: #94a3b8;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;

    &.active {
      background: #3b82f6;
      color: #ffffff;
      box-shadow: 0 2px 6px Rgba(59, 130, 246, 0.4);
    }
  }
}

.context-tools-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #1e293b;
  border: 1px solid Rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #334155;
    color: #ffffff;
  }

  &.active {
    background: #0284c7;
    border-color: #38bdf8;
    color: #ffffff;
    box-shadow: 0 0 8px Rgba(56, 189, 248, 0.4);
  }
}

.toolbar-subselect,
.profile-select {
  background: #0f172a;
  color: #f8fafc;
  border: 1px solid Rgba(255, 255, 255, 0.15);
  padding: 4px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #38bdf8;
  }
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.15s;

  &.btn-generate {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: #ffffff;
    box-shadow: 0 2px 6px Rgba(16, 185, 129, 0.3);

    &:hover {
      filter: Brightness(1.1);
    }
  }

  &.btn-primary {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: #ffffff;

    &:hover {
      filter: Brightness(1.1);
    }
  }

  &.btn-secondary {
    background: #1e293b;
    color: #cbd5e1;
    border: 1px solid Rgba(255, 255, 255, 0.1);

    &:hover {
      background: #334155;
      color: #ffffff;
    }
  }

  &.btn-sprites {
    background: #4338ca;
    color: #ffffff;

    &:hover {
      background: #4f46e5;
    }
  }

  &.btn-icon-text {
    background: #1e293b;
    color: #cbd5e1;
    border: 1px solid Rgba(255, 255, 255, 0.1);

    &:hover {
      background: #334155;
    }
  }

  &.btn-icon-only {
    background: #1e293b;
    color: #cbd5e1;
    padding: 4px 6px;
    border: 1px solid Rgba(255, 255, 255, 0.1);

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}

.undo-redo-group {
  display: flex;
  gap: 2px;
}

.hidden-file-input {
  display: none;
}

.spin-anim {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: Rotate(0deg);
  }
  to {
    transform: Rotate(360deg);
  }
}
</style>
