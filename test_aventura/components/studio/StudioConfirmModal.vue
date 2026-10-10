<script setup lang="ts">
import { useMapAdventureStudioStore } from '../../stores/mapAdventureStudio';

const store = useMapAdventureStudioStore();

function handleConfirm() {
  store.executeRegenerate();
}

function handleCancel() {
  store.showConfirmRegenerateModal = false;
}
</script>

<template>
  <div
    v-if="store.showConfirmRegenerateModal"
    id="modal-confirm-regenerate"
    class="modal-backdrop"
    tabindex="-1"
    @click.self="handleCancel"
    @keydown.esc="handleCancel"
  >
    <div class="modal-card">
      <header class="modal-header">
        <div class="flex items-center gap-2 text-amber-400">
          <span class="icon text-2xl">⚠️</span>
          <h3 class="modal-title">
            ¿Regenerar Terreno Procedural?
          </h3>
        </div>
      </header>

      <div class="modal-body">
        <p class="modal-text">
          Has realizado <strong class="text-amber-300">modificaciones manuales</strong> en el mapa (pinceladas de terreno o estructuras personalizadas).
        </p>
        <p class="modal-subtext">
          Al regenerar con la semilla seleccionada, el mapa se recalculará desde cero en base a las fórmulas algorítmicas y <strong>se descartarán los cambios manuales</strong> que no hayas exportado a JSON.
        </p>
      </div>

      <footer class="modal-footer">
        <button
          id="btn-cancel-regenerate"
          type="button"
          class="btn-secondary"
          @click="handleCancel"
        >
          Cancelar
        </button>
        <button
          id="btn-confirm-regenerate-action"
          type="button"
          class="btn-danger"
          @click="handleConfirm"
        >
          Sí, Regenerar Mapa
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped lang="scss">
.modal-backdrop {
  position: fixed;
  z-index: var(--z-modal);
  display: flex;
  justify-content: center;
  align-items: center;
  background: Rgb(11 15 25 / 85%);
  inset: 0;
  backdrop-filter: Blur(4px);
}

.modal-card {
  width: 100%;
  max-width: 480px;
  border: 1px solid var(--red-600);
  border-radius: $radius-xl;
  background: var(--slate-900);
  box-shadow: var(--shadow-2xl);
  overflow: hidden;
}

.modal-header {
  padding: 16px 20px;
  background: var(--slate-800);
  border-bottom: 1px solid var(--slate-700);
}

.modal-title {
  margin: 0;
  color: var(--slate-50);
  font-size: var(--font-15);
  font-weight: 700;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  padding: 20px;
}

.modal-text {
  margin: 0;
  color: var(--slate-200);
  font-size: var(--font-13);
  line-height: 1.5;
}

.modal-subtext {
  margin: 0;
  color: var(--slate-400);
  font-size: var(--font-12);
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-md;
  padding: 16px 20px;
  background: var(--slate-800);
  border-top: 1px solid var(--slate-700);
}

.btn-secondary {
  padding: 8px 16px;
  border: 1px solid var(--slate-600);
  border-radius: $radius-md;
  background: var(--slate-700);
  color: var(--slate-200);
  font-size: var(--font-12);
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: var(--slate-600);
  }
}

.btn-danger {
  padding: 8px 18px;
  border: none;
  border-radius: $radius-md;
  background: var(--red-600);
  color: var(--white);
  font-size: var(--font-12);
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-card);
  &:hover {
    background: var(--red-light);
  }
}
</style>
