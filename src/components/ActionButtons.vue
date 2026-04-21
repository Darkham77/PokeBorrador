<script setup>
import { useUIStore } from '@/stores/ui'
const uiStore = useUIStore()
</script>

<template>
  <div v-bind="$attrs">
    <button
      id="hud-profile-btn"
      class="hud-sq-btn"
      @click="uiStore.toggleProfile()"
    >
      <span>👤</span><span>Perfil</span>
    </button>

    <button
      id="hud-settings-btn"
      class="hud-sq-btn"
      @click="uiStore.toggleSettings()"
    >
      <span>⚙️</span><span>Ajustes</span>
    </button>

    <button
      id="hud-library-btn"
      class="hud-sq-btn"
      @click="uiStore.toggleLibrary()"
    >
      <span>📖</span><span>Libro</span>
    </button>
  </div>
</template>

<style scoped lang="scss">
.action-buttons {
  display: flex;
  gap: 8px;
}

.hud-sq-btn {
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  &:hover {
    transform: Scale(1.08) translateY(-2px);
    filter: Brightness(1.15);
  }
  &:active {
    transform: Scale(0.95);
  }
}
</style>
