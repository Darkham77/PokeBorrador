<script setup lang="ts">
/**
 * CombatGrass.vue
 */
const TREE_WIGGLE_ROTATION_DEG = 2
const TREE_WIGGLE_SKEW_X_DEG = 1
const TREE_WIGGLE_DUR_MULT = 1.5
const BUSH_WIGGLE_ROTATION_DEG = 5
const COMBAT_GRASS_INITIAL_SCALE = 0.3
const COMBAT_GRASS_EASE_OVERSHOOT = 1.7
const BUSH_WIGGLE_SPEED_DIVISOR = 2
const BUSH_DEFAULT_SEED_FALLBACK = 0
const BUSH_FRONT_PRIMARY_SCALE = 1.3
const BUSH_FRONT_SECONDARY_SCALE = 1.1
const BUSH_FRONT_TERTIARY_SCALE = 1.2
const BUSH_BACK_PRIMARY_SCALE = 1.0
const BUSH_BACK_SECONDARY_SCALE = 1.2
const BUSH_BACK_TERTIARY_SCALE = 0.9
const BUSH_BACK_QUATERNARY_SCALE = 1.1
const BUSH_BACK_QUINARY_SCALE = 0.95
const FIRST_ELEMENT_INDEX = 0;
const FULL_OPACITY = 1;
const ZERO_OPACITY = 0;
const BUSH_TRANSFORM_ORIGIN_BOTTOM_CENTER = 'bottom center';

import { computed, ref, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { GSAP_FAST_DURATION_SEC, COMBATANT_EMERGE_SPARKLE_FADE_DURATION_SEC, SCALE_FULL } from '@/logic/constants/animations'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getActiveBushesForMap, type ResolvedBushConfig, BUSH_FAMILIES, type BushFamily, type BushLayerDepth } from '@/logic/environment/bushLibrary'

interface Props {
  locationId?: string
  layer: BushLayerDepth
  groundY: string
  /** Semilla de azar única por combate, generada por el padre. */
  seed?: number
  visible?: boolean
  instant?: boolean
  // ENCOUNTER_ANIM - Paso BUSHES_BACK: mueve la capa frontal detrás del sprite durante el salto
  forceBehind?: boolean
  hideInstant?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  locationId: 'route1',
  seed: undefined,
  visible: true,
  instant: false,
  forceBehind: false,
  hideInstant: false
})

const handleImageError = (e: Event, family: string) => {
  const target = e.target as HTMLImageElement
  const familyAssets = BUSH_FAMILIES[family as BushFamily]
  const fallback = familyAssets && familyAssets[FIRST_ELEMENT_INDEX] ? familyAssets[FIRST_ELEMENT_INDEX] : 'bush-1'
  target.src = getAssetUrl(ASSET_TYPES.ENVIRONMENT, fallback)
}

interface BushConfig {
  id: number
  cls: string
  scale: number
  tx: number
  ty: number
  ad: string
  ay: string
}

const BUSH_POS = {
  FRONT_1_TX: -60, FRONT_1_TY: 10,
  FRONT_2_TX: 60,  FRONT_2_TY: 10,
  FRONT_3_TX: 0,   FRONT_3_TY: 22,
  BACK_1_TX: -80,  BACK_1_TY: -10,
  BACK_2_TX: 80,   BACK_2_TY: -10,
  BACK_3_TX: 0,    BACK_3_TY: -22,
  BACK_4_TX: -40,  BACK_4_TY: -17,
  BACK_5_TX: 40,   BACK_5_TY: -17,
} as const;

// Configuraciones base de las posiciones para mantener consistencia visual absoluta
const bushes: Record<BushLayerDepth, BushConfig[]> = {
  front: [
    { id: 1, cls: 'bush-front-1', scale: BUSH_FRONT_PRIMARY_SCALE, tx: BUSH_POS.FRONT_1_TX, ty: BUSH_POS.FRONT_1_TY, ad: '1.2s', ay: '0s' },
    { id: 2, cls: 'bush-front-2', scale: BUSH_FRONT_SECONDARY_SCALE, tx: BUSH_POS.FRONT_2_TX, ty: BUSH_POS.FRONT_2_TY, ad: '1.5s', ay: '-0.4s' },
    { id: 3, cls: 'bush-front-3', scale: BUSH_FRONT_TERTIARY_SCALE, tx: BUSH_POS.FRONT_3_TX, ty: BUSH_POS.FRONT_3_TY, ad: '1.8s', ay: '-0.2s' }
  ],
  back: [
    { id: 1, cls: 'bush-back-1', scale: BUSH_BACK_PRIMARY_SCALE, tx: BUSH_POS.BACK_1_TX, ty: BUSH_POS.BACK_1_TY, ad: '1.8s', ay: '-0.8s' },
    { id: 2, cls: 'bush-back-2', scale: BUSH_BACK_SECONDARY_SCALE, tx: BUSH_POS.BACK_2_TX, ty: BUSH_POS.BACK_2_TY, ad: '2.1s', ay: '-0.2s' },
    { id: 3, cls: 'bush-back-3', scale: BUSH_BACK_TERTIARY_SCALE, tx: BUSH_POS.BACK_3_TX, ty: BUSH_POS.BACK_3_TY, ad: '1.6s', ay: '-0.5s' },
    { id: 4, cls: 'bush-back-4', scale: BUSH_BACK_QUATERNARY_SCALE, tx: BUSH_POS.BACK_4_TX, ty: BUSH_POS.BACK_4_TY, ad: '1.9s', ay: '-0.1s' },
    { id: 5, cls: 'bush-back-5', scale: BUSH_BACK_QUINARY_SCALE, tx: BUSH_POS.BACK_5_TX, ty: BUSH_POS.BACK_5_TY, ad: '1.7s', ay: '-0.3s' }
  ]
}

// La semilla viene del padre (generada al iniciar cada combate) para garantizar
// que los arbustos varíen entre encuentros. Fallback a un valor estable si no se provee.
const activeBushes = computed<ResolvedBushConfig[]>(() => {
  const seed = props.seed ?? BUSH_DEFAULT_SEED_FALLBACK
  return getActiveBushesForMap(props.locationId, props.layer, seed, bushes[props.layer])
})

const bushRefs = ref<HTMLElement[]>([])
const wiggleTweens: gsap.core.Tween[] = []

const onEnter = (el: Element, done: () => void) => {
  if (props.instant) {
    gsap.set(el, { opacity: FULL_OPACITY, scale: SCALE_FULL })
    done()
    startWiggles()
    return
  }

  gsap.fromTo(el, 
    { opacity: ZERO_OPACITY, scale: COMBAT_GRASS_INITIAL_SCALE },
    { 
      opacity: FULL_OPACITY, 
      scale: SCALE_FULL, 
      duration: GSAP_FAST_DURATION_SEC, 
      ease: `back.out(${COMBAT_GRASS_EASE_OVERSHOOT})`,
      onComplete: () => {
        done()
        startWiggles()
      }
    }
  )
}

const onLeave = (el: Element, done: () => void) => {
  stopWiggles()
  if (props.hideInstant) {
    gsap.set(el, { opacity: ZERO_OPACITY })
    done()
    return
  }
  gsap.to(el, { 
    opacity: ZERO_OPACITY, 
    duration: COMBATANT_EMERGE_SPARKLE_FADE_DURATION_SEC, 
    ease: 'power2.inOut',
    onComplete: done
  })
}

const startWiggles = () => {
  stopWiggles()

  bushRefs.value.forEach((el, i) => {
    if (!el) return
    const img = el.querySelector('img')
    if (!img) return
    
    const config = activeBushes.value[i]
    if (!config || config.animationType === 'none') return

    const duration = parseFloat(config.ad)
    const delay = parseFloat(config.ay)

    if (config.animationType === 'tree') {
      // Balanceo lento y suave usando rotation/skewX desde la base (bottom center)
      wiggleTweens.push(gsap.to(img, {
        transformOrigin: BUSH_TRANSFORM_ORIGIN_BOTTOM_CENTER,
        rotation: TREE_WIGGLE_ROTATION_DEG,
        skewX: TREE_WIGGLE_SKEW_X_DEG,
        duration: duration * TREE_WIGGLE_DUR_MULT,
        delay: Math.abs(delay),
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      }))
    } else if (config.animationType === 'bush') {
      // Rotación rápida clásica (vaivén de arbusto)
      wiggleTweens.push(gsap.to(img, {
        transformOrigin: BUSH_TRANSFORM_ORIGIN_BOTTOM_CENTER,
        rotation: BUSH_WIGGLE_ROTATION_DEG,
        duration: duration / BUSH_WIGGLE_SPEED_DIVISOR,
        delay: Math.abs(delay),
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      }))
    }
  })
}

const stopWiggles = () => {
  wiggleTweens.forEach(t => t.kill())
  wiggleTweens.length = 0
}

onUnmounted(() => {
  stopWiggles()
})
</script>

<template>
  <Transition 
    :css="false"
    @enter="onEnter"
    @leave="onLeave"
  >
    <div 
      v-if="visible" 
      class="combat-grass-container" 
      :class="[`layer-${layer}`, { 'is-behind': forceBehind }]"
    >
      <div 
        class="bush-ground-anchor" 
        :style="{ top: groundY }"
      >
        <div 
          v-for="b in activeBushes" 
          :key="b.id"
          ref="bushRefs"
          class="bush-wrapper"
          :class="[b.cls, b.tintClass]"
          :style="{
            transform: `Translate(calc((${b.tx} + ${b.offsetX}) * var(--obj-scale) * 1px), calc(${b.ty} * var(--obj-scale) * 1px)) Scale(${b.randomScale * b.flip}, ${b.randomScale})`
          }"
        >
          <img 
            :src="getAssetUrl(ASSET_TYPES.ENVIRONMENT, b.assetId)" 
            class="pixel-bush" 
            alt="Environment Cover"
            @error="(e) => handleImageError(e, b.family)"
          >
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.combat-grass-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
  filter: var(--atmosphere-filter, Brightness(1) contrast(1));
}

.bush-ground-anchor {
  position: absolute;
  left: 50%;
  transform: Translatex(-50%) Translatey(-85%);
  width: 100%;
  height: 0;
  display: flex;
  justify-content: center;
  align-items: flex-end;
}

.bush-wrapper {
  position: absolute; 
  width: calc(var(--bush-size, 60px) * 1px);
  height: calc(var(--bush-size, 60px) * 1px);
  @include pixelated;

  &.tint-desert .pixel-bush { filter: sepia(0.5) Saturate(0.7) Hue-Rotate(10deg) Brightness(0.95); }
  &.tint-swamp .pixel-bush  { filter: Brightness(0.75) Saturate(1.2) Hue-Rotate(20deg); }
  &.tint-arctic .pixel-bush { filter: Saturate(0) Brightness(1.8) contrast(1.15); }
  &.tint-cave .pixel-bush   { filter: sepia(0.3) Saturate(0.95) Hue-Rotate(-15deg) Brightness(0.9); }
}

.pixel-bush { 
  width: 100%; 
  height: 100%; 
  object-fit: contain; 
  backface-visibility: hidden;
  transform-origin: bottom center;
}
</style>
