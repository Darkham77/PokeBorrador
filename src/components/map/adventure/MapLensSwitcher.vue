<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useMapLensStore } from '@/stores/mapLens'
import type { MapLens } from '@/types/map/mapLenses'

const lensStore = useMapLensStore()

function handleKeyDown(event: KeyboardEvent) {
  // Ignore key shortcuts if focused on input/textarea
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement)?.tagName)) {
    return
  }
  if (event.key === '1') {
    lensStore.setLens('adventure')
  } else if (event.key === '2') {
    lensStore.setLens('war')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

const lenses: Array<{ id: MapLens; label: string; icon: string; key: string }> = [
  { id: 'adventure', label: 'Aventura', icon: '🌿', key: '1' },
  { id: 'war', label: 'Guerra', icon: '⚔️', key: '2' }
]
</script>

<template>
  <div
    id="map-lens-switcher"
    class="map-lens-switcher-widget"
  >
    <div class="lens-switcher-header">
      <span class="lens-header-icon">👁️</span>
      <span class="lens-header-title">LENTES DE MAPA</span>
    </div>
    <div class="lens-button-group">
      <button
        v-for="lens in lenses"
        :id="`lens-btn-${lens.id}`"
        :key="lens.id"
        type="button"
        class="lens-btn"
        :class="{
          'is-active': lensStore.activeLens === lens.id,
          'lens-adventure': lens.id === 'adventure',
          'lens-war': lens.id === 'war'
        }"
        :aria-pressed="lensStore.activeLens === lens.id"
        @click="lensStore.setLens(lens.id)"
      >
        <span class="lens-icon">{{ lens.icon }}</span>
        <span class="lens-label">{{ lens.label }}</span>
        <span class="lens-hotkey">{{ lens.key }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.map-lens-switcher-widget {
  @include pixelated;
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
  background: linear-gradient(135deg, Rgba(15, 23, 42, 0.95), Rgba(30, 41, 59, 0.9));
  border: 2px solid #475569;
  border-radius: 10px;
  padding: 6px 8px;
  box-shadow: 0 4px 16px Rgba(0, 0, 0, 0.6), inset 0 1px 0 Rgba(255, 255, 255, 0.15);
  backdrop-filter: Blur(8px);
  user-select: none;
  z-index: 50;

  .lens-switcher-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 4px;

    .lens-header-icon {
      font-size: 11px;
    }

    .lens-header-title {
      font-size: 8px;
      font-weight: bold;
      color: #94a3b8;
      letter-spacing: 1px;
    }
  }

  .lens-button-group {
    display: flex;
    align-items: center;
    gap: 4px;
    background: Rgba(0, 0, 0, 0.4);
    padding: 3px;
    border-radius: 6px;
    border: 1px solid Rgba(255, 255, 255, 0.05);
  }

  .lens-btn {
    @include pixelated;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 5px;
    padding: 5px 10px;
    color: #94a3b8;
    font-size: 9px;
    font-weight: bold;
    cursor: pointer;
    transition: All 0.15s ease-out;

    .lens-icon {
      font-size: 12px;
      filter: Drop-Shadow(0 1px 2px Rgba(0, 0, 0, 0.5));
    }

    .lens-label {
      letter-spacing: 0.5px;
    }

    .lens-hotkey {
      font-size: 7.5px;
      background: Rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      padding: 1px 4px;
      border-radius: 3px;
      border: 1px solid Rgba(255, 255, 255, 0.15);
    }

    &:hover:not(.is-active) {
      background: Rgba(255, 255, 255, 0.05);
      color: #f1f5f9;
      border-color: Rgba(255, 255, 255, 0.1);
    }

    &.is-active {
      color: #ffffff;
      box-shadow: 0 2px 8px Rgba(0, 0, 0, 0.4);

      &.lens-adventure {
        background: linear-gradient(135deg, #15803d, #166534);
        border-color: #4ade80;
        box-shadow: 0 0 10px Rgba(74, 222, 128, 0.35);

        .lens-hotkey {
          background: #166534;
          border-color: #86efac;
          color: #86efac;
        }
      }

      &.lens-war {
        background: linear-gradient(135deg, #7e22ce, #6b21a8);
        border-color: #c084fc;
        box-shadow: 0 0 10px Rgba(192, 132, 252, 0.35);

        .lens-hotkey {
          background: #581c87;
          border-color: #d8b4fe;
          color: #d8b4fe;
        }
      }
    }
  }
}
</style>
