<script setup lang="ts">
/**
 * src/components/map/RegionalStudioToolbar.vue
 *
 * FLOATING TOP TOOLBAR FOR REGIONAL CONTINENT STUDIO
 *
 * Implements:
 *   - Project Profiles (Requirement 2): Dropdown of saved profiles, New blank map, Save current map.
 *   - History Controls (Requirement 3): Undo / Redo buttons with reactive enabled/disabled states.
 *   - Route SVG I/O (Requirement 5): Standalone import/export for SVG route networks.
 *   - Project JSON I/O (Requirement 2): Full bundle export/import.
 *   - View actions: Centering, Asset inspector navigation, Full PNG snapshot.
 */

import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useRegionalContinentStudioStore } from '../../stores/continentStudioStore.ts';

defineProps<{
  isRenderingTiles: boolean;
}>();

const emit = defineEmits<{
  (e: 'reset-view'): void;
  (e: 'export-png'): void;
}>();

const router = useRouter();
const store = useRegionalContinentStudioStore();

const svgInputRef = ref<HTMLInputElement | null>(null);
const jsonInputRef = ref<HTMLInputElement | null>(null);

function handleNewProject(): void {
  const name = window.prompt('Nombre del nuevo mapa regional:', 'Nueva Región');
  if (name?.trim()) {
    store.createBlankProject(name.trim());
  }
}

function handleSaveProject(): void {
  store.saveCurrentProject();
  window.alert(`¡Proyecto "${store.projectName}" guardado con éxito!`);
}

function handleProfileChange(e: Event): void {
  const select = e.target as HTMLSelectElement;
  if (select.value) {
    store.loadProject(select.value);
  }
}

function handleCitySelect(e: Event): void {
  const select = e.target as HTMLSelectElement;
  store.selectPOI(select.value || null);
}

function handleExportSvg(): void {
  const svgStr = store.exportSvg();
  const blob = new Blob([svgStr], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${store.projectName || 'region'}_rutas.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleSvgImport(e: Event): void {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (store.importSvg(content)) {
        window.alert('¡Rutas SVG importadas con éxito! El mapa se adaptó a la red.');
      } else {
        window.alert('Error: No se pudieron extraer rutas o POIs válidos del SVG.');
      }
    };
    reader.readAsText(file);
    target.value = '';
  }
}

function handleExportJson(): void {
  const jsonStr = store.exportProjectJson();
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${store.projectName || 'region'}_proyecto.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleJsonImport(e: Event): void {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (store.importProjectJson(content)) {
        window.alert('¡Proyecto cargado con éxito desde el archivo JSON!');
      } else {
        window.alert('Error: Archivo de proyecto JSON inválido.');
      }
    };
    reader.readAsText(file);
    target.value = '';
  }
}
</script>

<template>
  <nav class="viewport-toolbar">
    <!-- Group 1: Project & Region Meta -->
    <div class="toolbar-group">
      <span class="region-title"><span class="emoji-inline">🗺️</span> {{ store.projectName || `Región #${store.seed}` }}</span>
      <span class="region-size">{{ store.mapDimension }}×{{ store.mapDimension }}</span>
      <select
        id="select-regional-profile"
        class="project-select"
        :value="store.activeProjectId"
        @change="handleProfileChange"
      >
        <option
          value=""
          disabled
        >
          Proyectos...
        </option>
        <option
          v-for="p in store.savedProfiles"
          :key="p.id"
          :value="p.id"
        >
          {{ p.name }}
        </option>
      </select>
      <button
        id="btn-regional-new"
        type="button"
        class="tool-btn"
        title="Nuevo Proyecto en Blanco"
        @click="handleNewProject"
      >
        <span class="emoji-inline">➕</span> Nuevo
      </button>
      <button
        id="btn-regional-save"
        type="button"
        class="tool-btn primary"
        title="Guardar Proyecto en este Perfil"
        @click="handleSaveProject"
      >
        <span class="emoji-inline">💾</span> Guardar
      </button>
    </div>

    <!-- Group 2: History (Deshacer / Rehacer) -->
    <div class="toolbar-group">
      <button
        id="btn-regional-undo"
        type="button"
        class="tool-btn"
        :disabled="!store.canUndo"
        title="Deshacer (Ctrl+Z)"
        @click="store.undo()"
      >
        <span class="emoji-inline">↶</span> Deshacer
      </button>
      <button
        id="btn-regional-redo"
        type="button"
        class="tool-btn"
        :disabled="!store.canRedo"
        title="Rehacer (Ctrl+Y)"
        @click="store.redo()"
      >
        <span class="emoji-inline">↷</span> Rehacer
      </button>
    </div>

    <!-- Group: City Editor Direct Selector -->
    <div class="toolbar-group city-selector-group">
      <span class="city-selector-label"><span class="emoji-inline">🏙️</span> Editar Ciudad:</span>
      <select
        id="select-city-editor"
        class="city-select"
        :value="store.selectedPOIId ?? ''"
        @change="handleCitySelect"
      >
        <option value="">
          {{ store.pois.length > 0 ? '-- Seleccionar ciudad... --' : 'Sin ciudades' }}
        </option>
        <option
          v-for="poi in store.pois"
          :key="poi.id"
          :value="poi.id"
        >
          {{ poi.name }} ({{ poi.type }})
        </option>
      </select>
      <button
        v-if="store.selectedPOIId"
        id="btn-deselect-city"
        type="button"
        class="tool-btn active-city-btn"
        title="Deseleccionar ciudad"
        @click="store.selectPOI(null)"
      >
        <span class="emoji-inline">✕</span>
      </button>
    </div>

    <!-- Group 3: File I/O (SVG & JSON) -->
    <div class="toolbar-group">
      <button
        id="btn-regional-import-svg"
        type="button"
        class="tool-btn"
        title="Importar Rutas y POIs desde archivo SVG"
        @click="svgInputRef?.click()"
      >
        <span class="emoji-inline">📥</span> SVG
      </button>
      <button
        id="btn-regional-export-svg"
        type="button"
        class="tool-btn"
        title="Exportar Rutas vectoriales como SVG editable"
        @click="handleExportSvg"
      >
        <span class="emoji-inline">📤</span> SVG
      </button>
      <button
        id="btn-regional-import-json"
        type="button"
        class="tool-btn"
        title="Importar Proyecto completo desde JSON"
        @click="jsonInputRef?.click()"
      >
        <span class="emoji-inline">📥</span> JSON
      </button>
      <button
        id="btn-regional-export-json"
        type="button"
        class="tool-btn"
        title="Exportar Proyecto completo a archivo JSON"
        @click="handleExportJson"
      >
        <span class="emoji-inline">📤</span> JSON
      </button>
    </div>

    <!-- Group 4: Render indicator & View Actions -->
    <div class="toolbar-group">
      <span
        v-if="isRenderingTiles || store.isGenerating"
        class="rendering-indicator"
      >
        <span class="emoji-inline">⏳</span> Renderizando...
      </span>
      <button
        id="btn-regional-nav-assets"
        type="button"
        class="tool-btn"
        title="Inspeccionar Spritesheets y Assets Canónicos"
        @click="router.push('/studio/assets')"
      >
        <span class="emoji-inline">🎨</span> Assets
      </button>
      <button
        id="btn-regional-center-view"
        type="button"
        class="tool-btn"
        title="Centrar y resetear vista"
        @click="emit('reset-view')"
      >
        <span class="emoji-inline">⛶</span> Centrar
      </button>
      <button
        id="btn-regional-export-png"
        type="button"
        class="tool-btn success"
        title="Descargar imagen PNG completa"
        @click="emit('export-png')"
      >
        <span class="emoji-inline">💾</span> PNG
      </button>
    </div>

    <!-- Hidden File Inputs -->
    <input
      id="regional-studio-toolbar-input-svgimport"
      ref="svgInputRef"
      type="file"
      accept=".svg"
      class="hidden-file-input"
      @change="handleSvgImport"
    >
    <input
      id="regional-studio-toolbar-input-jsonimport"
      ref="jsonInputRef"
      type="file"
      accept=".json"
      class="hidden-file-input"
      @change="handleJsonImport"
    >
  </nav>
</template>

<style scoped lang="scss">
.viewport-toolbar {
  position: absolute;
  top: 14px;
  left: 18px;
  z-index: calc(var(--z-map-floor) + 5);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $spacing-md-lg;
  padding: 6px 14px;
  border: 1px solid Rgb(255 255 255 / 12%);
  border-radius: $radius-lg;
  background: Rgb(15 23 42 / 90%);
  backdrop-filter: Blur(8px);
  box-shadow: $shadow-md;

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: $spacing-sm;

    &:not(:last-child) {
      padding-right: 12px;
      border-right: 1px solid Rgb(255 255 255 / 10%);
    }
  }

  .region-title {
    max-width: 160px;
    color: var(--sky);
    font-size: var(--font-14);
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .region-size {
    padding: 2px 6px;
    border-radius: $radius-sm;
    background: Rgb(255 255 255 / 8%);
    color: var(--slate-400);
    font-family: monospace;
    font-size: var(--font-11);
  }

  .project-select {
    padding: 3px 8px;
    border: 1px solid Rgb(255 255 255 / 15%);
    border-radius: $radius-md;
    background: var(--slate-800);
    color: var(--slate-50);
    font-size: var(--font-12);
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: var(--sky);
    }
  }

  .city-selector-group {
    padding: 2px 8px;
    border: 1px solid Rgb(56 189 248 / 25%);
    border-radius: $radius-md;
    background: Rgb(56 189 248 / 8%);
  }

  .city-selector-label {
    color: var(--sky);
    font-size: var(--font-12);
    font-weight: 700;
  }

  .city-select {
    padding: 3px 8px;
    border: 1px solid Rgb(56 189 248 / 40%);
    border-radius: $radius-md;
    background: var(--slate-900);
    color: var(--slate-50);
    font-size: var(--font-12);
    font-weight: 600;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: var(--sky);
      box-shadow: var(--shadow-glow-yellow-sm);
    }
  }

  .active-city-btn {
    padding: 2px 6px;
    background: Rgb(239 68 68 / 20%);
    color: var(--red-300);
    font-size: var(--font-11);
    border-color: Rgb(239 68 68 / 40%);

    &:hover {
      background: Rgb(239 68 68 / 40%);
    }
  }

  .rendering-indicator {
    padding: 2px 8px;
    border: 1px solid Rgb(56 189 248 / 30%);
    border-radius: $radius-sm;
    background: Rgb(56 189 248 / 15%);
    color: var(--sky);
    font-size: var(--font-11);
    font-weight: 600;
  }

  .tool-btn {
    display: inline-flex;
    align-items: center;
    gap: $spacing-xs;
    padding: 4px 10px;
    border: 1px solid Rgb(255 255 255 / 15%);
    border-radius: $radius-md;
    background: Rgb(255 255 255 / 8%);
    color: var(--slate-50);
    font-size: var(--font-12);
    font-weight: 600;
    cursor: pointer;

    &:hover:not(:disabled) {
      background: Rgb(255 255 255 / 18%);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &.primary {
      background: var(--sky-dark);
      border-color: var(--sky);

      &:hover:not(:disabled) {
        background: var(--sky-dark);
      }
    }

    &.success {
      background: #059669;
      border-color: var(--emerald-400);

      &:hover:not(:disabled) {
        background: var(--emerald-500);
      }
    }
  }
}

.hidden-file-input {
  display: none;
}
</style>
