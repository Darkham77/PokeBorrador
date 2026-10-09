<script setup lang="ts">
/**
 * src/components/map/studio/AutotileReportModal.vue
 *
 * AUTOTILE ERROR REPORT MODAL FOR REAL CONTINENT PATCHES
 * Displays flagged real transition errors with exact seeds and coordinates,
 * formatted JSON payload, and 1-click clipboard export to feed Tier 1 RED-to-GREEN regression tests.
 */

import { ref, computed } from 'vue';
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
    setTimeout(() => {
      copied.value = false;
    }, 2500);
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
  }
}
</script>

<template>
  <div
    v-if="isOpen"
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
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'summary' }"
          @click="activeTab = 'summary'"
        >
          Vista Previa y Notas
        </button>
        <button
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

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: Rgba(0, 0, 0, 0.75);
  backdrop-filter: Blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: calc(var(--z-overlay) - 1);
  padding: 12px;
  touch-action: auto;
}

.modal-card {
  background: #0f172a;
  border: 1px solid Rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  width: 100%;
  max-width: 680px;
  height: 90dvh;
  max-height: 90dvh;
  min-height: 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px Rgba(0, 0, 0, 0.6);
  color: #f8fafc;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.modal-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-icon {
  font-size: 20px;
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
}

.report-badge {
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
}

.close-btn:hover {
  color: #fff;
}

.tab-bar {
  display: flex;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.1);
  background: Rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.tab-btn {
  padding: 10px 18px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
  font-weight: 600;
}

.tab-btn.active {
  color: #38bdf8;
  border-bottom-color: #38bdf8;
}

.modal-body {
  padding: 14px 16px;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  overscroll-behavior-y: contain;
  flex: 1 1 0;
  min-height: 0;
}

.empty-state {
  text-align: center;
  padding: 40px 10px;
  color: #94a3b8;
  font-size: 14px;
}

.empty-sub {
  font-size: 12px;
  color: #64748b;
  margin-top: 6px;
}

.report-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-item {
  background: Rgba(255, 255, 255, 0.04);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge {
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.seed-badge {
  background: Rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid Rgba(56, 189, 248, 0.3);
}

.coord-badge {
  background: Rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
}

.patch-badge {
  background: Rgba(255, 255, 255, 0.06);
  color: #94a3b8;
}

.category-text {
  font-family: monospace;
  font-size: 11px;
  color: #facc15;
  flex: 1;
}

.remove-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 14px;
}

.remove-btn:hover {
  color: #ef4444;
}

.item-details {
  font-size: 12px;
  color: #94a3b8;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-details code {
  font-family: monospace;
  color: #a5f3fc;
  background: Rgba(0, 0, 0, 0.3);
  padding: 1px 4px;
  border-radius: 3px;
}

.layers-preview {
  font-size: 11px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.neighborhood-box {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.neighborhood-title {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
}

.neighborhood-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
  max-width: 220px;
  background: Rgba(0, 0, 0, 0.4);
  padding: 4px;
  border-radius: 6px;
  border: 1px solid Rgba(255, 255, 255, 0.08);
}

.n-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
  background: Rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  font-size: 9px;
  font-family: monospace;
}

.n-cell.center-cell {
  background: Rgba(239, 68, 68, 0.25);
  border: 1px solid #ef4444;
  color: #fca5a5;
  font-weight: 700;
}

.n-dir {
  font-size: 8px;
  color: #64748b;
}

.n-terrain {
  font-weight: 600;
  color: #cbd5e1;
}

.note-field {
  width: 100%;
  background: Rgba(0, 0, 0, 0.4);
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  padding: 6px 10px;
  color: #fff;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}

.note-field:focus {
  border-color: #38bdf8;
}

.json-code {
  background: #020617;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 14px;
  font-family: monospace;
  font-size: 11px;
  color: #38bdf8;
  overflow-x: auto;
  max-height: 400px;
  margin: 0;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-top: 1px solid Rgba(255, 255, 255, 0.1);
  background: Rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: Rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
}

.btn-secondary:hover:not(:disabled) {
  background: Rgba(255, 255, 255, 0.15);
}

.btn-primary {
  background: #0284c7;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #0369a1;
}
</style>
