<script setup lang="ts">
import { ref } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { BattleSide, SparkleData } from '@/types/battle/battle'
import type { ItemId } from '@/data/inventory/items'
import {
  onSparkleEnter,
  onBallEnter,
  onBallLeave,
  onCriticalBannerEnter
} from './helpers/combatantSparkleBallHooks.ts'

const props = defineProps<{
  side: BattleSide
  pokemonKey: string | number
  isBallVisible: boolean
  memorizedBallCoords?: Record<string, string | number>
  pokeballSize: number
  internalBallId: ItemId
  pokeballShadowUrl: string
  isCriticalCapture: boolean
  sparkles: SparkleData[]
  setPokeballImgRef?: (el: HTMLImageElement | null) => void
}>()

const emit = defineEmits<{
  (e: 'ballError'): void
}>()

const pokeballImgRef = ref<HTMLImageElement | null>(null)

const handleImgRef = (el: unknown) => {
  const imgEl = (el as HTMLImageElement) || null
  pokeballImgRef.value = imgEl
  props.setPokeballImgRef?.(imgEl)
}

const handleBallLeave = (el: Element, done: () => void) => {
  onBallLeave(el, props.side, done)
}

defineExpose({
  pokeballImgRef
})
</script>

<template>
  <!-- Poké Ball visual -->
  <Transition 
    :css="false"
    @enter="onBallEnter" 
    @leave="handleBallLeave"
  >
    <div
      v-if="isBallVisible"
      :key="`ball-${side}-${pokemonKey}`"
      class="trapped-pokeball"
      :style="[memorizedBallCoords, { width: `${pokeballSize}px`, height: `${pokeballSize}px` }]"
    >
      <img
        :ref="handleImgRef"
        :src="getAssetUrl(ASSET_TYPES.ITEM, internalBallId)"
        alt="Pokeball"
        :style="{ filter: 'var(--atmosphere-filter)' }"
        @error="emit('ballError')"
      >
      
      <div
        class="pokeball-shadow"
        :style="{ backgroundImage: pokeballShadowUrl, filter: 'var(--atmosphere-filter)' }"
      />

      <!-- Critical Capture Arcade Banner -->
      <Transition 
        :css="false" 
        @enter="onCriticalBannerEnter"
      >
        <div
          v-if="isCriticalCapture"
          class="critical-capture-banner"
        >
          <span class="crit-icon emoji">⚡</span>
          <span class="crit-text">¡CAPTURA CRÍTICA!</span>
          <span class="crit-icon emoji">⚡</span>
        </div>
      </Transition>

      <!-- Success Sparkles -->
      <TransitionGroup 
        tag="div"
        class="catch-success-sparkles"
        :css="false"
        @enter="onSparkleEnter"
      >
        <span
          v-for="s in sparkles"
          :key="s.id"
          class="sparkle"
          :data-tx="s.tx"
          :data-ty="s.ty"
          :data-tf="s.tf"
          :data-scale="s.scale"
          :data-delay="s.delay"
        >
          <img
            :src="getAssetUrl(ASSET_TYPES.FX, 'shiny')"
            class="shiny-asset-mini"
            alt="Sparkle"
          >
        </span>
      </TransitionGroup>
    </div>
  </Transition>

  <!-- Standalone Critical Capture Banner & Sparkles (when ball is not active) -->
  <Transition 
    :css="false" 
    @enter="onCriticalBannerEnter"
  >
    <div
      v-if="isCriticalCapture && !isBallVisible"
      class="critical-capture-banner standalone"
    >
      <span class="crit-icon emoji">⚡</span>
      <span class="crit-text">¡CAPTURA CRÍTICA!</span>
      <span class="crit-icon emoji">⚡</span>
    </div>
  </Transition>

  <TransitionGroup 
    v-if="!isBallVisible && sparkles.length > 0"
    tag="div"
    class="catch-success-sparkles standalone"
    :css="false"
    @enter="onSparkleEnter"
  >
    <span
      v-for="s in sparkles"
      :key="s.id"
      class="sparkle"
      :data-tx="s.tx"
      :data-ty="s.ty"
      :data-tf="s.tf"
      :data-scale="s.scale"
      :data-delay="s.delay"
    >
      <img
        :src="getAssetUrl(ASSET_TYPES.FX, 'shiny')"
        class="shiny-asset-mini"
        alt="Sparkle"
      >
    </span>
  </TransitionGroup>
</template>

<style scoped lang="scss" src="@/styles/components/_battle-combatant.scss"></style>
