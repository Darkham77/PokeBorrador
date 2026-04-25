<script setup>
const _props = defineProps({
  playerClass: { type: String, default: null },
  isRocketMode: { type: Boolean, default: false }
})

const emit = defineEmits(['toggleRocket', 'confirmRocket', 'cancelRocket'])
</script>

<template>
  <div class="box-header">
    <div class="bh-section-title">
      📦 PC de Almacenamiento
    </div>
    <div class="header-actions">
      <!-- Botones Rocket -->
      <button
        v-if="playerClass === 'rocket' && !isRocketMode"
        class="rocket-btn-toggle"
        @click.stop="emit('toggleRocket')"
      >
        🚀 VENTA MASIVA
      </button>
      <template v-if="isRocketMode">
        <button
          class="confirm-btn"
          @click.stop="emit('confirmRocket')"
        >
          ✓ VENDER SELECCIÓN
        </button>
        <button
          class="cancel-btn"
          @click.stop="emit('cancelRocket')"
        >
          ✕ CANCELAR
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.box-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  flex-wrap: wrap;
  gap: 8px;
}

.bh-section-title {
  margin: 0;
  @include pixelated;
  font-size: 14px;
  color: $white;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.rocket-btn-toggle {
  @include pixelated;
  font-size: 7px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid Rgba(239, 68, 68, 0.4);
  background: Rgba(239, 68, 68, 0.1);
  color: Rgba(239, 68, 68, 1);
  cursor: pointer;
  transition: all .2s;
  
  &:hover {
    background: Rgba(239, 68, 68, 0.2);
    transform: TranslateY(-2px);
  }
}

.confirm-btn {
  @include btn-vicio-danger;
  padding: 8px 16px;
  font-size: 8px;
}

.cancel-btn {
  @include pixelated;
  font-size: 7px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  background: transparent;
  color: Rgba(148, 163, 184, 1);
  cursor: pointer;
  
  &:hover {
    background: Rgba(255, 255, 255, 0.05);
    color: $white;
  }
}
</style>
