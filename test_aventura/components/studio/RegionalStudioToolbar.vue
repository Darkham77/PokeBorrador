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

import { isValidHealingDomain } from '../../logic/map/autotileHealingEngine.ts';
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
  const name = globalThis.prompt('Nombre del nuevo mapa regional:', 'Nueva Región');
  if (name?.trim()) {
    store.createBlankProject(name.trim());
  }
}

function handleSaveProject(): void {
  store.saveCurrentProject();
  globalThis.alert(`¡Proyecto "${store.projectName}" guardado con éxito!`);
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

function handleDomainChange(e: Event): void {
  const select = e.target as HTMLSelectElement;
  if (isValidHealingDomain(select.value)) {
    store.setHealingBrushDomain(select.value);
  }
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
        globalThis.alert('¡Rutas SVG importadas con éxito! El mapa se adaptó a la red.');
      } else {
        globalThis.alert('Error: No se pudieron extraer rutas o POIs válidos del SVG.');
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
        globalThis.alert('¡Proyecto cargado con éxito desde el archivo JSON!');
      } else {
        globalThis.alert('Error: Archivo de proyecto JSON inválido.');
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
      <span class="region-title"
        ><span class="emoji-inline">🗺️</span>
        {{ store.projectName || `Región #${store.seed}` }}</span
      >
      <span class="region-size">{{ store.mapDimension }}×{{ store.mapDimension }}</span>
      <select
        id="select-regional-profile"
        class="project-select"
        aria-label="Perfil regional"
        :value="store.activeProjectId"
        @change="handleProfileChange"
      >
        <option value="" disabled>Proyectos...</option>
        <option v-for="p in store.savedProfiles" :key="p.id" :value="p.id">
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

    <!-- Group: Autotile Healing Brush -->
    <div class="toolbar-group healing-group">
      <button
        id="btn-regional-healing-brush"
        type="button"
        class="tool-btn"
        :class="{ active: store.isHealingBrushActive }"
        :title="
          store.isHealingBrushActive
            ? 'Desactivar Pincel Sanador'
            : 'Activar Pincel Sanador (Clic o arrastrar en el mapa)'
        "
        @click="store.toggleHealingBrush()"
      >
        <span class="emoji-inline">🩹</span>
        {{ store.isHealingBrushActive ? 'Sanador Activo' : 'Pincel Sanador' }}
      </button>

      <select
        v-if="store.isHealingBrushActive"
        id="select-healing-domain"
        class="healing-select"
        aria-label="Dominio del pincel sanador"
        :value="store.healingBrushDomain"
        @change="handleDomainChange"
      >
        <option value="auto">🪄 Auto-Detectar</option>
        <option value="path">🛤️ Caminos</option>
        <option value="mountain">⛰️ Montañas</option>
        <option value="water">🌊 Agua / Costas</option>
        <option value="macro_biome">🌿 Biomas</option>
      </select>

      <button
        id="btn-regional-heal-all"
        type="button"
        class="tool-btn"
        :disabled="isRenderingTiles || store.isGenerating || store.detectedDefectCount === 0"
        :title="
          store.detectedDefectCount > 0
            ? `Reparar automáticamente ${store.detectedDefectCount} defectos de autotile en todo el mapa`
            : '0 defectos detectados en el mapa actual'
        "
        @click="store.healEntireMapDefects()"
      >
        <span class="emoji-inline">✨</span> Auto-Sanar ({{ store.detectedDefectCount }})
      </button>

      <span v-if="store.lastHealedReport" class="healing-toast" :title="store.lastHealedReport">
        {{ store.lastHealedReport }}
      </span>
    </div>

    <!-- Group: City Editor Direct Selector -->
    <div class="toolbar-group city-selector-group">
      <span class="city-selector-label"><span class="emoji-inline">🏙️</span> Editar Ciudad:</span>
      <select
        id="select-city-editor"
        class="city-select"
        aria-label="Seleccionar ciudad a editar"
        :value="store.selectedPOIId ?? ''"
        @change="handleCitySelect"
      >
        <option value="">
          {{ store.pois.length > 0 ? '-- Seleccionar ciudad... --' : 'Sin ciudades' }}
        </option>
        <option v-for="poi in store.pois" :key="poi.id" :value="poi.id">
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
      <span v-if="isRenderingTiles || store.isGenerating" class="rendering-indicator">
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
      aria-label="Importar archivo SVG"
      class="hidden-file-input"
      @change="handleSvgImport"
    />
    <input
      id="regional-studio-toolbar-input-jsonimport"
      ref="jsonInputRef"
      type="file"
      accept=".json"
      aria-label="Importar archivo JSON"
      class="hidden-file-input"
      @change="handleJsonImport"
    />
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

  @media (width <= 768px) {
    top: 8px;
    right: 8px;
    left: 8px;
    flex-wrap: nowrap;
    gap: $spacing-xs;
    max-width: calc(100dvw - 16px);
    padding: 4px 8px;
    overflow-x: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

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

  .healing-group {
    padding: 2px 8px;
    border: 1px solid Rgb(16 185 129 / 30%);
    border-radius: $radius-md;
    background: Rgb(16 185 129 / 8%);
  }

  .healing-select {
    padding: 3px 8px;
    border: 1px solid Rgb(16 185 129 / 40%);
    border-radius: $radius-md;
    background: var(--slate-900);
    color: var(--slate-50);
    font-size: var(--font-12);
    font-weight: 600;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: var(--emerald-400);
    }
  }

  .healing-toast {
    max-width: 220px;
    color: var(--emerald-300);
    font-size: var(--font-11);
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

    &.active {
      background: Rgb(16 185 129 / 30%);
      color: var(--emerald-300);
      border-color: var(--emerald-400);
    }

    &.primary {
      background: var(--sky-dark);
      border-color: var(--sky);

      &:hover:not(:disabled) {
        background: var(--sky-dark);
      }
    }

    &.success {
      background: var(--emerald-500);
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
