<script setup lang="ts">
import { ref } from 'vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

interface ProcessedGridItem {
  id: string | null
  key: string
  name?: string
  sprite?: string
  isSeen?: boolean
  isCaught?: boolean
  isRare?: boolean
  isAtmospheric?: boolean
  tooltipTitle?: string
  tooltipDesc?: string
  seed?: number
}

defineProps<{
  isLocked: boolean
  isPerformanceMode: boolean
  isVisible: boolean
  hideMapPokemon: boolean
  isDebugGridMode: boolean
  spawnGrid: {
    slots: (string | null)[]
    rows: number
    cols: number
  }
  processedGrid: ProcessedGridItem[]
  processedSprites: Record<string, string>
  processedRareAura: string
  processedAtmosAura: string
  isLowPowerActive: boolean
}>()

const spawnGridRef = ref<HTMLElement | null>(null)

defineExpose({
  spawnGridRef
})
</script>

<template>
  <div
    v-if="!isLocked && !isPerformanceMode && isVisible && !hideMapPokemon"
    class="location-spawns"
  >
    <div 
      ref="spawnGridRef"
      class="spawn-grid-container" 
      :style="{ '--grid-cols': spawnGrid.cols, '--grid-rows': spawnGrid.rows }"
      :class="{ 'show-debug-grid': isDebugGridMode }"
    >
      <div
        v-for="item in processedGrid"
        :key="item.key"
        class="spawn-slot"
      >
        <div
          v-if="item.id"
          class="spawn-content"
        >
          <!-- AURA DIVS (GSAP target) -->
          <div
            v-if="item.isRare"
            class="aura-effect rare-aura"
            :class="{ 
              'is-low-power': isLowPowerActive,
              'is-pre-rendered': !!processedRareAura
            }"
          />
          <div
            v-if="item.isAtmospheric"
            class="aura-effect atmospheric-aura"
            :class="{ 
              'is-low-power': isLowPowerActive,
              'is-pre-rendered': !!processedAtmosAura
            }"
          />

          <div 
            :class="['sprite-wrapper', { 
              'rare-spawn': item.isRare, 
              'atmospheric-spawn': item.isAtmospheric
            }]"
            :style="{ '--spawn-seed': item.seed }"
          >
            <PVTooltip
              :title="item.tooltipTitle"
              :description="item.tooltipDesc"
              position="top"
              class="spawn-tooltip-trigger"
            >
              <div class="spawn-atmosphere-wrapper">
                <img
                  :src="processedSprites[item.key + '-' + item.isCaught] || item.sprite"
                  class="pixelated"
                  :class="{ 
                    'spawn-silhouette': !processedSprites[item.key + '-' + item.isCaught] && !item.isCaught,
                    'is-pre-rendered': !!processedSprites[item.key + '-' + item.isCaught]
                  }"
                  @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
                >
              </div>
            </PVTooltip>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import "./MapCard.styles.scss";

.spawn-tooltip-trigger {
  position: relative;
  z-index: calc(var(--z-map-floor) + 1);
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}
</style>
