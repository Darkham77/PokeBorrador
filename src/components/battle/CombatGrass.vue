<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

import { FIRE_RED_MAPS } from '@/data/maps'

interface Props {
  locationId?: string
  layer: 'back' | 'front'
  groundY: string
  visible?: boolean
  instant?: boolean
  // ENCOUNTER_ANIM - Paso BUSHES_BACK: mueve la capa frontal detrás del sprite durante el salto
  forceBehind?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  locationId: 'route1',
  visible: true,
  instant: false,
  forceBehind: false
})

const isRock = computed(() => {
  const map = FIRE_RED_MAPS.find(m => m.id === props.locationId)
  if (!map) return false
  // Según requerimiento: isMountain, isCave, isArctic, isVolcanic, isUrban (aunque Urban no esté en maps.ts actual, se incluye por robustez)
  return !!((map as any).isMountain || (map as any).isCave || (map as any).isArctic || (map as any).isVolcanic || (map as any).isUrban)
})

const grassUrl = computed(() => {
  if (isRock.value) {
    return getAssetUrl(ASSET_TYPES.ENVIRONMENT, 'rock')
  }
  // Intentar cargar pasto específico de la ruta, si no, usar el genérico tall-grass
  const id = props.locationId ? `${props.locationId}_tallgrass` : 'tall-grass'
  return getAssetUrl(ASSET_TYPES.ENVIRONMENT, id)
})

const handleImageError = (e: Event) => {
  const target = e.target as HTMLImageElement
  // Si falla el específico, forzar el genérico (según si es roca o pasto)
  if (isRock.value) {
    target.src = getAssetUrl(ASSET_TYPES.ENVIRONMENT, 'rock')
  } else if (target.src.includes('_tallgrass')) {
    target.src = getAssetUrl(ASSET_TYPES.ENVIRONMENT, 'tall-grass')
  } else {
    target.style.display = 'none' 
  }
}

interface BushConfig {
  id: number
  cls: string
  scale: number
  tx: number
  ty: number
  ad: string
  ay: string
  randomScale?: number // Cache random scale
}

// Configuraciones de los arbustos para mantener consistencia visual absoluta
const bushes: Record<'front' | 'back', BushConfig[]> = {
  front: [
    { id: 1, cls: 'bush-front-1', scale: 1.3, tx: -60, ty: 10, ad: '1.2s', ay: '0s' },
    { id: 2, cls: 'bush-front-2', scale: 1.1, tx: 60, ty: 10, ad: '1.5s', ay: '-0.4s' },
    { id: 3, cls: 'bush-front-3', scale: 1.2, tx: 0, ty: 22, ad: '1.8s', ay: '-0.2s' }
  ],
  back: [
    { id: 1, cls: 'bush-back-1', scale: 1.0, tx: -80, ty: -10, ad: '1.8s', ay: '-0.8s' },
    { id: 2, cls: 'bush-back-2', scale: 1.2, tx: 80, ty: -10, ad: '2.1s', ay: '-0.2s' },
    { id: 3, cls: 'bush-back-3', scale: 0.9, tx: 0, ty: -22, ad: '1.6s', ay: '-0.5s' },
    { id: 4, cls: 'bush-back-4', scale: 1.1, tx: -40, ty: -17, ad: '1.9s', ay: '-0.1s' },
    { id: 5, cls: 'bush-back-5', scale: 0.95, tx: 40, ty: -17, ad: '1.7s', ay: '-0.3s' }
  ]
}

const activeBushes = computed(() => {
  const baseBushes = bushes[props.layer]
  // Inyectar factor aleatorio determinista por ruta e ID para evitar jitter
  return baseBushes.map(b => {
    const seed = (b.id * 17 + (props.locationId?.length || 0) * 13) % 100
    const randomFactor = 0.85 + (seed / 100) * 0.3 // 0.85 a 1.15
    return { ...b, randomScale: b.scale * randomFactor }
  })
})
const bushRefs = ref<HTMLElement[]>([])
const wiggleTweens: gsap.core.Tween[] = []

const onEnter = (el: Element, done: () => void) => {
  if (props.instant) {
    gsap.set(el, { opacity: 1, scale: 1 })
    done()
    startWiggles()
    return
  }

  gsap.fromTo(el, 
    { opacity: 0, scale: 0.3 },
    { 
      opacity: 1, 
      scale: 1, 
      duration: 0.4, 
      ease: 'back.out(1.7)',
      onComplete: () => {
        done()
        startWiggles()
      }
    }
  )
}

const onLeave = (el: Element, done: () => void) => {
  gsap.to(el, { 
    opacity: 0, 
    duration: 0.6, 
    ease: 'power2.inOut',
    onComplete: done
  })
}

const startWiggles = () => {
  stopWiggles()
  if (isRock.value) return // Las rocas son estáticas

  bushRefs.value.forEach((el, i) => {
    if (!el) return
    const img = el.querySelector('img')
    if (!img) return
    
    const config = activeBushes.value[i]
    if (!config) return

    const duration = parseFloat(config.ad)
    const delay = parseFloat(config.ay)

    wiggleTweens.push(gsap.to(img, {
      rotation: 5,
      duration: duration / 2,
      delay: Math.abs(delay),
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    }))
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
          :class="b.cls"
          :style="{
            transform: `Translate(calc(${b.tx} * var(--obj-scale) * 1px), calc(${b.ty} * var(--obj-scale) * 1px)) Scale(${b.randomScale})`
          }"
        >
          <img 
            :src="grassUrl" 
            class="pixel-bush" 
            alt="Grass"
            @error="handleImageError"
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
  filter: var(--atmosphere-filter, Brightness(1) Contrast(1));
  will-change: filter;

  &.layer-back { z-index: calc(var(--z-map-spawns) - 5); }
  // ENCOUNTER_ANIM BUSHES_BACK: cuando forceBehind, la capa front se mueve detrás del sprite
  &.layer-front { z-index: calc(var(--z-map-spawns) + 5); }
  &.layer-front.is-behind { z-index: calc(var(--z-map-spawns) - 4); }
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
  will-change: transform;
}

.pixel-bush { 
  width: 100%; 
  height: 100%; 
  object-fit: contain; 
  backface-visibility: hidden;
  transform-origin: bottom center;
  will-change: transform;
}
</style>

