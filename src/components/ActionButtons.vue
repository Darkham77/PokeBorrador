<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
const uiStore = useUIStore()
</script>

<template>
  <div v-bind="$attrs">
    <button
      id="hud-profile-btn"
      class="hud-sq-btn"
      @click.stop="uiStore.toggleProfile()"
    >
      <span>👤</span><span>Perfil</span>
    </button>

    <button
      id="hud-settings-btn"
      class="hud-sq-btn"
      @click.stop="uiStore.toggleSettings()"
    >
      <span>⚙️</span><span>Ajustes</span>
    </button>

    <button
      id="hud-library-btn"
      class="hud-sq-btn"
      @click.stop="uiStore.toggleLibrary()"
    >
      <span>📖</span><span>Libro</span>
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.action-buttons {
  display: flex;
  gap: 8px;
}

.hud-sq-btn {
  @include flex-center;
  flex-direction: column;
  gap: 4px;
  background: Rgba(255, 255, 255, 0.05);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 8px;
  color: $white;
  cursor: pointer;
  
  min-width: 48px;

  span:not(:first-child) {
    font-size: 6px !important; // Aggressive reduction
    font-weight: normal !important;
    @include pixelated;
    color: Rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
    letter-spacing: 0px;
    margin-top: 4px;
    display: block;
    line-height: 1;
  }

  &:hover {
    background: Rgba(255, 255, 255, 0.12);
    border-color: var(--yellow);
    box-shadow: 
      0 0 0 2px var(--yellow),
      0 0 15px Rgba(255, 214, 10, 0.4);
    z-index: var(--z-base);
    transform: Translatey(-2px);
    
    span:last-child { color: $white; opacity: 1; }
  }

  &:active {
    transform: Scale(0.95);
  }
}
</style>
