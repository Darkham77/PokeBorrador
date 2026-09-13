<script setup lang="ts">
import { computed } from 'vue'
import { useCombatShadowStore } from '@/stores/battle/combatShadows'
import { generatePixelShadow } from '@/logic/combat/shadowHelpers'
import { GLOBAL_SHADOW_CONFIG } from '@/data/pokemon/pokemonFeetDatabase'
import type { GlobalShadowConfig } from '@/types/pokemon/spriteShadows'

interface Props {
  shadowId: string
  spriteSize?: number
  shadowScale?: number
  previewConfig?: GlobalShadowConfig
}

const props = defineProps<Props>()

const shadowStore = useCombatShadowStore()
const shadow = computed(() => shadowStore.activeShadows.get(props.shadowId))

const activeConfig = computed<GlobalShadowConfig>(() => props.previewConfig ?? GLOBAL_SHADOW_CONFIG)

const activeShadowUrl = computed(() => {
  const cfg = activeConfig.value
  const w = cfg.pixelation
  const h = Math.max(2, Math.round(w * cfg.heightRatio))
  return generatePixelShadow(w, h, shadowStore.isSolidShadows)
})

const DEFAULT_SHADOW_WIDTH_PERCENT = 70
const FLYING_SHADOW_OPACITY = 0.6
const FLYING_SHADOW_Y_OFFSET_PX = 15
const FLYING_SHADOW_SCALE = 0.8

const SHADOW_TRANSLATE_PERCENT = -50
const SHADOW_LEFT_CENTER_PERCENT = '50%'

const shadowStyle = computed(() => {
  if (!shadow.value) return { opacity: 0 }
  
  const { entitySize, isFlying, visible } = shadow.value
  const size = props.spriteSize || entitySize
  const scale = props.shadowScale ?? shadow.value.shadowScale ?? 1.0
  const cfg = activeConfig.value
  
  // Dimensions: Relative to the active sprite size and global configuration
  const widthPercent = parseFloat(shadow.value.width) || DEFAULT_SHADOW_WIDTH_PERCENT
  const widthPx = (widthPercent / 100) * size * scale * cfg.widthRatio
  const heightPx = widthPx * cfg.heightRatio

  return {
    backgroundImage: `url(${activeShadowUrl.value})`,
    left: SHADOW_LEFT_CENTER_PERCENT,
    width: `${widthPx}px`,
    height: `${heightPx}px`,
    opacity: (visible && !isFlying) ? 1 : (visible && isFlying) ? FLYING_SHADOW_OPACITY : 0,
    transform: `translate(${SHADOW_TRANSLATE_PERCENT}%, ${SHADOW_TRANSLATE_PERCENT}%) ${isFlying ? `translateY(${FLYING_SHADOW_Y_OFFSET_PX}px) scale(${FLYING_SHADOW_SCALE})` : 'scale(1)'}`
  }
})
</script>

<template>
  <div 
    v-if="shadow"
    class="pv-combat-shadow"
    :style="shadowStyle"
  />
</template>

<style scoped lang="scss">
.pv-combat-shadow {
  position: absolute;
  top: var(--shadow-y, 90%);
  left: var(--shadow-x, 50%);
  background-size: 100% 100%;
  background-repeat: no-repeat;
  image-rendering: -webkit-optimize-contrast !important;
  #{"image-rendering"}: crisp-edges !important;
  image-rendering: pixelated !important;
  -ms-interpolation-mode: nearest-neighbor !important;
  transform-origin: center center;
  
  will-change: opacity;
  pointer-events: none;
  z-index: var(--shadow-z-index, 1);
}
</style>
