<script setup lang="ts">
/**
 * src/components/map/studio/AutotileReportModal.vue
 *
 * AUTOTILE ERROR REPORT MODAL FOR REAL CONTINENT PATCHES
 * Displays flagged real transition errors with exact seeds and coordinates,
 * formatted JSON payload, and 1-click clipboard export to feed Tier 1 RED-to-GREEN regression tests.
 */

import { ref, computed } from 'vue';
import { gsap } from 'gsap';
import { COPY_FEEDBACK_DELAY_SEC } from '../../config/studioConstants.ts';
import type { AutotileErrorReport } from '../../types/map/autotileStudioTypes.ts';

const props = defineProps<{
  readonly isOpen: boolean;
  readonly reports: readonly AutotileErrorReport[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'clearAll'): void;
  (e: 'removeReport', id: string): void;
  (e: 'updateNote', id: string, note: string): void;
}>();

const copied = ref<boolean>(false);
const activeTab = ref<'summary' | 'json'>('summary');

const jsonPayload = computed(() => {
  return JSON.stringify(props.reports, null, 2);
});

const markdownReport = computed(() => {
  let md = `### 🐛 Reporte de Autotiling (${props.reports.length} casos marcados)\n\n`;
  for (const rep of props.reports) {
    md += `* **Semilla:** \`#${rep.seed}\` | **Tile con error:** \`X: ${rep.tileX}, Y: ${rep.tileY}\` (Parche: ${rep.patchCenterX}, ${rep.patchCenterY}) | **Categoría:** \`${rep.category}\`\n`;
    md += `  - **Tile superior:** \`${rep.currentTile}\`\n`;
    md += `  - **Capas blit:** \`${rep.layerStack.join(' -> ')}\`\n`;
    if (rep.note) {
      md += `  - **Nota:** ${rep.note}\n`;
    }
    if (rep.expectedRoleOrTile) {
      md += `  - **Esperado:** \`${rep.expectedRoleOrTile}\`\n`;
    }
    if (rep.neighborhood?.asciiGrid) {
      md += `  - **Vecinos (3x3):**\n\`\`\`\n${rep.neighborhood.asciiGrid}\n\`\`\`\n`;
    }
    md += `\n`;
  }
  return md;
});

async function copyToClipboard(): Promise<void> {
  const fullText = `${markdownReport.value}\n---\n#### JSON Fixture:\n\`\`\`json\n${jsonPayload.value}\n\`\`\``;
  try {
    await navigator.clipboard.writeText(fullText);
    copied.value = true;
    gsap.delayedCall(COPY_FEEDBACK_DELAY_SEC, () => {
      copied.value = false;
    });
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    id="autotile-report-modal-div-1"
    class="modal-overlay"
    @click.self="emit('close')"
  >
    <div class="modal-card">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="modal-title-group">
          <span class="modal-icon">📋</span>
          <h2 class="modal-title">
            Reporte de Errores en Continente Real
          </h2>
          <span class="report-badge">{{ reports.length }} casos</span>
        </div>
        <button
          id="btn-close-report"
          type="button"
          class="close-btn"
          @click="emit('close')"
        >
          <span class="emoji-inline">✕</span>
        </button>
      </div>

      <!-- Tab Switcher -->
      <div class="tab-bar">
        <button
          id="autotile-report-modal-btn-vista-previa-y-notas"
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'summary' }"
          @click="activeTab = 'summary'"
        >
          Vista Previa y Notas
        </button>
        <button
          id="autotile-report-modal-btn-json-estructurado"
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'json' }"
          @click="activeTab = 'json'"
        >
          JSON Estructurado
        </button>
      </div>

      <!-- Tab 1: Summary List -->
      <div
        v-if="activeTab === 'summary'"
        class="modal-body"
      >
        <div
          v-if="reports.length === 0"
          class="empty-state"
        >
          No hay tiles marcados como defectuosos todavía.
          <p class="empty-sub">
            Hacé clic en cualquier celda o tile de un parche para marcarlo individualmente.
          </p>
        </div>

        <div
          v-else
          class="report-list"
        >
          <div
            v-for="rep in reports"
            :key="rep.id"
            class="report-item"
          >
            <div class="item-header">
              <span class="badge seed-badge">Semilla #{{ rep.seed }}</span>
              <span class="badge coord-badge">Tile: ({{ rep.tileX }}, {{ rep.tileY }})</span>
              <span class="badge patch-badge">Parche: ({{ rep.patchCenterX }}, {{ rep.patchCenterY }})</span>
              <span class="category-text">{{ rep.category }}</span>
              <button
                id="autotile-report-modal-btn-emit"
                type="button"
                class="remove-btn"
                title="Quitar de la lista"
                @click="emit('removeReport', rep.id)"
              >
                <span class="emoji-inline">✕</span>
              </button>
            </div>
            <div class="item-details">
              <div>Tile: <code>{{ rep.currentTile }}</code></div>
              <div class="layers-preview">
                Capas: <code>{{ rep.layerStack.join(' -> ') }}</code>
              </div>
              <div
                v-if="rep.neighborhood"
                class="neighborhood-box"
              >
                <span class="neighborhood-title">Vecindad 3x3:</span>
                <div class="neighborhood-grid">
                  <div
                    v-for="cell in rep.neighborhood.cells.flat()"
                    :key="`${cell.dir}-${cell.x}-${cell.y}`"
                    class="n-cell"
                    :class="{ 'center-cell': cell.dir === 'C' }"
                    :title="`(${cell.x}, ${cell.y}) ${cell.tile}`"
                  >
                    <span class="n-dir">{{ cell.dir }}</span>
                    <span class="n-terrain"><span
                      v-if="cell.dir === 'C'"
                      class="emoji-inline"
                    >⚠️</span><template v-else>{{ cell.terrain }}</template></span>
                  </div>
                </div>
              </div>
            </div>
            <div class="note-input-group">
              <input
                :value="rep.note || ''"
                type="text"
                placeholder="Escribí una nota (ej. 'Falta esquina interna de arena', 'El acantilado no proyecta pie sur')"
                class="note-field"
                @input="(e) => emit('updateNote', rep.id, (e.target as HTMLInputElement).value)"
              >
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: JSON Payload -->
      <div
        v-else
        class="modal-body"
      >
        <pre class="json-code"><code>{{ jsonPayload }}</code></pre>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <button
          type="button"
          class="btn btn-secondary"
          :disabled="reports.length === 0"
          @click="emit('clearAll')"
        >
          Limpiar Todo
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="reports.length === 0"
          @click="copyToClipboard"
        >
          <span v-if="copied"><span class="emoji-inline">✅</span> ¡Copiado al Portapapeles!</span>
          <span v-else><span class="emoji-inline">📋</span> Copiar Reporte Completo</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  z-index: calc(var(--z-overlay) - 1);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px;
  background: Rgb(0 0 0 / 75%);
  inset: 0;
  backdrop-filter: Blur(4px);
  touch-action: auto;
}

.modal-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 680px;
  height: 90dvh;
  min-height: 0;
  max-height: 90dvh;
  border: 1px solid Rgb(255 255 255 / 20%);
  border-radius: $radius-xl;
  background: var(--slate-900);
  color: var(--slate-50);
  box-shadow: $shadow-modal;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid Rgb(255 255 255 / 10%);
  flex-shrink: 0;
}

.modal-title-group {
  display: flex;
  align-items: center;
  gap: $spacing-md-alt;
}

.modal-icon {
  font-size: var(--font-20);
}

.modal-title {
  margin: 0;
  font-size: var(--font-16);
  font-weight: 700;
}

.report-badge {
  padding: 2px 8px;
  border-radius: $radius-xl;
  background: var(--red-light);
  color: var(--white);
  font-size: var(--font-11);
  font-weight: 700;
}

.close-btn {
  padding: 4px;
  border: none;
  background: none;
  color: var(--slate-400);
  font-size: var(--font-18);
  cursor: pointer;
}

.close-btn:hover {
  color: var(--white);
}

.tab-bar {
  display: flex;
  background: Rgb(0 0 0 / 20%);
  border-bottom: 1px solid Rgb(255 255 255 / 10%);
  flex-shrink: 0;
}

.tab-btn {
  padding: 10px 18px;
  border: none;
  background: none;
  color: var(--slate-400);
  font-size: var(--font-13);
  font-weight: 600;
  border-bottom: 2px solid transparent;
  cursor: pointer;
}

.tab-btn.active {
  color: var(--sky);
  border-bottom-color: var(--sky);
}

.modal-body {
  min-height: 0;
  padding: 14px 16px;
  overflow: hidden auto;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  overscroll-behavior-y: contain;
  flex: 1 1 0;
}

.empty-state {
  padding: 40px 10px;
  color: var(--slate-400);
  font-size: var(--font-14);
  text-align: center;
}

.empty-sub {
  color: var(--slate-500);
  font-size: var(--font-12);
  margin-top: 6px;
}

.report-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.report-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: 12px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: $radius-lg;
  background: Rgb(255 255 255 / 4%);
}

.item-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.badge {
  padding: 2px 6px;
  border-radius: $radius-sm;
  font-family: monospace;
  font-size: var(--font-11);
  font-weight: 700;
}

.seed-badge {
  border: 1px solid Rgb(56 189 248 / 30%);
  background: Rgb(56 189 248 / 15%);
  color: var(--sky);
}

.coord-badge {
  background: Rgb(255 255 255 / 10%);
  color: var(--slate-300);
}

.patch-badge {
  background: Rgb(255 255 255 / 6%);
  color: var(--slate-400);
}

.category-text {
  color: var(--amber-400);
  font-family: monospace;
  font-size: var(--font-11);
  flex: 1;
}

.remove-btn {
  border: none;
  background: none;
  color: var(--slate-500);
  font-size: var(--font-14);
  cursor: pointer;
}

.remove-btn:hover {
  color: var(--red-light);
}

.item-details {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  color: var(--slate-400);
  font-size: var(--font-12);
}

.item-details code {
  padding: 1px 4px;
  border-radius: $radius-xs-alt;
  background: Rgb(0 0 0 / 30%);
  color: var(--cyan);
  font-family: monospace;
}

.layers-preview {
  color: var(--slate-500);
  font-size: var(--font-11);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.neighborhood-box {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  margin-top: 6px;
}

.neighborhood-title {
  color: var(--slate-400);
  font-size: var(--font-11);
  font-weight: 600;
}

.neighborhood-grid {
  display: grid;
  gap: $spacing-xs-alt;
  grid-template-columns: repeat(3, 1fr);
  max-width: 220px;
  padding: 4px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: $radius-md;
  background: Rgb(0 0 0 / 40%);
}

.n-cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2px 4px;
  border-radius: $radius-sm;
  background: Rgb(255 255 255 / 5%);
  font-family: monospace;
  font-size: var(--font-9);
}

.n-cell.center-cell {
  border: 1px solid var(--red-light);
  background: Rgb(239 68 68 / 25%);
  color: var(--red-300);
  font-weight: 700;
}

.n-dir {
  color: var(--slate-500);
  font-size: var(--font-8);
}

.n-terrain {
  color: var(--slate-300);
  font-weight: 600;
}

.note-field {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid Rgb(255 255 255 / 15%);
  border-radius: $radius-sm;
  background: Rgb(0 0 0 / 40%);
  color: var(--white);
  font-size: var(--font-12);
  outline: none;
  box-sizing: border-box;
}

.note-field:focus {
  border-color: var(--sky);
}

.json-code {
  max-height: 400px;
  margin: 0;
  padding: 14px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: $radius-md;
  background: #020617;
  color: var(--sky);
  font-family: monospace;
  font-size: var(--font-11);
  overflow-x: auto;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: Rgb(0 0 0 / 20%);
  border-top: 1px solid Rgb(255 255 255 / 10%);
  flex-shrink: 0;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: $radius-md;
  font-size: var(--font-13);
  font-weight: 600;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: Rgb(255 255 255 / 10%);
  color: var(--slate-300);
}

.btn-secondary:hover:not(:disabled) {
  background: Rgb(255 255 255 / 15%);
}

.btn-primary {
  background: var(--sky-dark);
  color: var(--white);
}

.btn-primary:hover:not(:disabled) {
  background: var(--sky-dark);
}
</style>
