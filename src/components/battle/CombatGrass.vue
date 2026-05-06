<script setup lang="ts">
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

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

const transitionName = computed(() => props.instant ? 'grass-instant' : 'grass-fade')

const grassUrl = computed(() => {
  // Intentar cargar pasto específico de la ruta, si no, usar el genérico tall-grass
  const id = props.locationId ? `${props.locationId}_tallgrass` : 'tall-grass'
  return getAssetUrl(ASSET_TYPES.ENVIRONMENT, id)
})

const handleImageError = (e: Event) => {
  const target = e.target as HTMLImageElement
  // Si falla el específico, forzar el genérico
  if (target.src.includes('_tallgrass')) {
    target.src = getAssetUrl(ASSET_TYPES.ENVIRONMENT, 'tall-grass')
  } else {
    target.style.display = 'none' 
  }
}

// Configuraciones de los arbustos para mantener consistencia visual absoluta
const bushes: Record<string, any[]> = {
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

const activeBushes = computed(() => bushes[props.layer])
</script>

<template>
  <Transition :name="transitionName">
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
          class="bush-wrapper"
          :class="b.cls"
          :style="{
            '--ad': b.ad,
            '--ay': b.ay,
            transform: `Translate(calc(${b.tx} * var(--obj-scale) * 1px), calc(${b.ty} * var(--obj-scale) * 1px)) Scale(${b.scale})`
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

  &.layer-back { z-index: calc(var(--z-map-spawns) - 5); }
  // ENCOUNTER_ANIM BUSHES_BACK: cuando forceBehind, la capa front se mueve detrás del sprite
  &.layer-front { z-index: calc(var(--z-map-spawns) + 5); }
  &.layer-front.is-behind { z-index: calc(var(--z-map-spawns) - 4); }
}

.bush-ground-anchor {
  position: absolute;
  left: 50%;
  transform: TranslateX(-50%) TranslateY(-85%);
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
  image-rendering: pixelated;
  will-change: transform;
}

.pixel-bush { 
  width: 100%; 
  height: 100%; 
  object-fit: contain; 
  backface-visibility: hidden;
  animation: bush-wiggle var(--ad, 1.5s) infinite ease-in-out var(--ay, 0s);
  transform-origin: bottom center;
}

@keyframes bush-wiggle { 
  0%, 100% { transform: Rotate(0deg); } 
  50% { transform: Rotate(5deg); } 
}

.grass-fade-enter-active {
  transition: opacity 0.4s ease-out, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.grass-fade-leave-active, .grass-instant-leave-active {
  transition: opacity 0.6s ease-in-out; // Sincronizado con el salto (0.6s)
}

.grass-fade-enter-from {
  opacity: 0;
  transform: Scale(0.3); // Comienza pequeño para el efecto de crecimiento
}

.grass-fade-leave-to, .grass-instant-leave-to {
  opacity: 0;
}
</style>
