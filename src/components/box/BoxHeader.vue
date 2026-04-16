<script setup>
const props = defineProps({
  playerClass: { type: String, default: null },
  isRocketMode: { type: Boolean, default: false }
})

const emit = defineEmits(['toggleRocket', 'confirmRocket', 'cancelRocket'])
</script>

<template>
  <div class="box-header">
    <div class="section-title">
      📦 PC de Almacenamiento
    </div>
    <div class="header-actions">
      <!-- Botones Rocket -->
      <button
        v-if="playerClass === 'rocket' && !isRocketMode"
        class="rocket-btn-toggle"
        @click="emit('toggleRocket')"
      >
        🚀 VENTA MASIVA
      </button>
      <template v-if="isRocketMode">
        <button
          class="confirm-btn"
          @click="emit('confirmRocket')"
        >
          ✓ VENDER SELECCIÓN
        </button>
        <button
          class="cancel-btn"
          @click="emit('cancelRocket')"
        >
          ✕ CANCELAR
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.box-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  flex-wrap: wrap;
  gap: 8px;
}

.section-title {
  margin: 0;
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  color: #fff;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.rocket-btn-toggle {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  cursor: pointer;
  transition: all .2s;
}

.confirm-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  padding: 8px 12px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #ef4444, #991b1b);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
}

.cancel-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: var(--gray);
  cursor: pointer;
}
</style>
