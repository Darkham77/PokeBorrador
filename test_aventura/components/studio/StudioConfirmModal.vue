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
    @click.self="handleCancel"
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
  inset: 0;
  background: Rgba(11, 15, 25, 0.85);
  backdrop-filter: Blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 110;
}

.modal-card {
  width: 100%;
  max-width: 480px;
  background: #0f172a;
  border: 1px solid #dc2626;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px Rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.modal-header {
  padding: 16px 20px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
}

.modal-title {
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-text {
  font-size: 13px;
  color: #e2e8f0;
  line-height: 1.5;
  margin: 0;
}

.modal-subtext {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
  margin: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  background: #1e293b;
  border-top: 1px solid #334155;
}

.btn-secondary {
  padding: 8px 16px;
  background: #334155;
  border: 1px solid #475569;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: #475569;
  }
}

.btn-danger {
  padding: 8px 18px;
  background: #dc2626;
  border: none;
  border-radius: 6px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 6px -1px Rgba(220, 38, 38, 0.4);
  &:hover {
    background: #ef4444;
  }
}
</style>
