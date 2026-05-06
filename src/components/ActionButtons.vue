<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
const uiStore = useUIStore() as any
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
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
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
    transform: Scale(1.08) translateY(-2px);
    border-color: var(--yellow);
    background: Rgba(255, 255, 255, 0.1);
    
    span:last-child { color: $white; }
  }

  &:active {
    transform: Scale(0.95);
  }
}
</style>
