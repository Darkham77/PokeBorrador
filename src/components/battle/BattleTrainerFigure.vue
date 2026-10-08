<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import CombatShadow from './CombatShadow.vue'
import { getTrainerIdleConfig } from './helpers/trainerIdleAnims.ts'
import type { SpriteCoordinates } from '@/types/pokemon/spriteShadows'

const props = withDefaults(defineProps<{
  spriteUrl: string
  altText: string
  size: number
  feetCoords?: SpriteCoordinates | null
  shadowKey?: string
  showGuide?: boolean
  guideWidth?: number
  guideHeight?: number
  imageClass?: string
}>(), {
  feetCoords: null,
  shadowKey: '',
  showGuide: false,
  guideWidth: 0,
  guideHeight: 0,
  imageClass: ''
})

const emit = defineEmits<{
  error: [e: Event]
}>()

const TRAINER_GROUND_Y = '100%' as const

const idleRef = ref<HTMLElement | null>(null)
let idleTween: gsap.core.Tween | null = null

onMounted(() => {
  if (!idleRef.value) return
  gsap.killTweensOf(idleRef.value)
  gsap.set(idleRef.value, { transformOrigin: 'bottom center' })
  idleTween = gsap.to(idleRef.value, getTrainerIdleConfig())
})

onUnmounted(() => {
  if (idleTween) {
    idleTween.kill()
    idleTween = null
  }
})
</script>

<template>
  <div
    class="trainer-sprite-wrapper"
    :style="{
      width: `${props.size}px`,
      height: `${props.size}px`,
      position: 'absolute',
      left: '50%',
      top: TRAINER_GROUND_Y,
      transform: `translate(calc(-${(props.feetCoords?.feetX ?? 0.5) * 100}%), calc(-${(props.feetCoords?.feetY ?? 0.95) * 100}%)) ${props.feetCoords?.isFlying ? 'translateY(-24px)' : ''}`
    }"
  >
    <div
      ref="idleRef"
      class="trainer-idle-wrapper"
    >
      <div 
        class="pokemon-atmosphere-wrapper"
        :style="{ filter: 'var(--atmosphere-filter)' }"
      >
        <img 
          :src="props.spriteUrl" 
          :alt="props.altText"
          :class="['trainer-image', props.imageClass]"
          @error="emit('error', $event)"
        >
      </div>
    </div>
  </div>
  <CombatShadow
    v-if="props.shadowKey"
    :shadow-id="props.shadowKey"
    :sprite-size="props.size"
    :shadow-scale="props.feetCoords?.shadowScale"
    :style="{
      '--shadow-y': TRAINER_GROUND_Y
    }"
  />
  <div
    v-if="props.showGuide"
    class="debug-trainer-guide"
  >
    <span>{{ Math.round(props.guideWidth) }}x{{ Math.round(props.guideHeight) }}</span>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_battle-arena-view.scss"></style>
