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
        type="button"
        class="tool-btn"
        title="Nuevo Proyecto en Blanco"
        @click="handleNewProject"
      >
        <span class="emoji-inline">➕</span> Nuevo
      </button>
      <button
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
        type="button"
        class="tool-btn"
        :disabled="!store.canUndo"
        title="Deshacer (Ctrl+Z)"
        @click="store.undo()"
      >
        <span class="emoji-inline">↶</span> Deshacer
      </button>
      <button
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
        type="button"
        class="tool-btn"
        title="Importar Rutas y POIs desde archivo SVG"
        @click="svgInputRef?.click()"
      >
        <span class="emoji-inline">📥</span> SVG
      </button>
      <button
        type="button"
        class="tool-btn"
        title="Exportar Rutas vectoriales como SVG editable"
        @click="handleExportSvg"
      >
        <span class="emoji-inline">📤</span> SVG
      </button>
      <button
        type="button"
        class="tool-btn"
        title="Importar Proyecto completo desde JSON"
        @click="jsonInputRef?.click()"
      >
        <span class="emoji-inline">📥</span> JSON
      </button>
      <button
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
        type="button"
        class="tool-btn"
        title="Inspeccionar Spritesheets y Assets Canónicos"
        @click="router.push('/studio/assets')"
      >
        <span class="emoji-inline">🎨</span> Assets
      </button>
      <button
        type="button"
        class="tool-btn"
        title="Centrar y resetear vista"
        @click="emit('reset-view')"
      >
        <span class="emoji-inline">⛶</span> Centrar
      </button>
      <button
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
      ref="svgInputRef"
      type="file"
      accept=".svg"
      class="hidden-file-input"
      @change="handleSvgImport"
    >
    <input
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
  background: Rgba(15, 23, 42, 0.9);
  backdrop-filter: Blur(8px);
  border: 1px solid Rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 6px 14px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  z-index: calc(var(--z-map-floor) + 5);
  box-shadow: 0 4px 16px Rgba(0, 0, 0, 0.4);

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 8px;

    &:not(:last-child) {
      padding-right: 12px;
      border-right: 1px solid Rgba(255, 255, 255, 0.1);
    }
  }

  .region-title {
    font-weight: 700;
    color: #38bdf8;
    font-size: 0.88rem;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .region-size {
    font-size: 0.72rem;
    color: #94a3b8;
    background: Rgba(255, 255, 255, 0.08);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
  }

  .project-select {
    background: #1e293b;
    border: 1px solid Rgba(255, 255, 255, 0.15);
    color: #f8fafc;
    border-radius: 6px;
    padding: 3px 8px;
    font-size: 0.75rem;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: #38bdf8;
    }
  }

  .city-selector-group {
    background: Rgba(56, 189, 248, 0.08);
    border: 1px solid Rgba(56, 189, 248, 0.25);
    border-radius: 6px;
    padding: 2px 8px;
  }

  .city-selector-label {
    font-size: 0.75rem;
    font-weight: 700;
    color: #38bdf8;
  }

  .city-select {
    background: #0f172a;
    border: 1px solid Rgba(56, 189, 248, 0.4);
    color: #f8fafc;
    border-radius: 6px;
    padding: 3px 8px;
    font-size: 0.75rem;
    font-weight: 600;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 6px Rgba(56, 189, 248, 0.4);
    }
  }

  .active-city-btn {
    padding: 2px 6px;
    font-size: 0.7rem;
    background: Rgba(239, 68, 68, 0.2);
    border-color: Rgba(239, 68, 68, 0.4);
    color: #fca5a5;

    &:hover {
      background: Rgba(239, 68, 68, 0.4);
    }
  }

  .rendering-indicator {
    font-size: 0.72rem;
    color: #38bdf8;
    background: Rgba(56, 189, 248, 0.15);
    border: 1px solid Rgba(56, 189, 248, 0.3);
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 600;
  }

  .tool-btn {
    background: Rgba(255, 255, 255, 0.08);
    border: 1px solid Rgba(255, 255, 255, 0.15);
    color: #f8fafc;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 4px;

    &:hover:not(:disabled) {
      background: Rgba(255, 255, 255, 0.18);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &.primary {
      background: #0284c7;
      border-color: #38bdf8;

      &:hover:not(:disabled) {
        background: #0369a1;
      }
    }

    &.success {
      background: #059669;
      border-color: #34d399;

      &:hover:not(:disabled) {
        background: #047857;
      }
    }
  }
}

.hidden-file-input {
  display: none;
}
</style>
