// [PureVue-Ignore-Length]
<script setup lang="ts">


import { ref, computed, watch } from 'vue'
import { gsap } from 'gsap'

import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import VirtualEntity from './VirtualEntity.vue'
import CombatShadow from './CombatShadow.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { useCombatShadowStore } from '@/stores/combatShadows'
import { gameBus } from '@/logic/gameBus'
import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'

import type { Pokemon } from '@/types/pokemon'
import type { BattleStages } from '@/types/battle'

interface SparkleData {
  id: string | number
  tx: number
  ty: number
  tf: number
  scale: number
  delay: string
}

interface Props {
  side: 'player' | 'enemy'
  pokemon?: Pokemon | null
  position: { x: number; y: number }
  baseSize: number
  groundY?: string
  shadowKey?: string | null
  animState?: 'catching' | 'trapped' | 'releasing' | null
  ballId?: string
  isShaking?: boolean
  isBlinking?: boolean
  isSilhouette?: boolean
  isAttacking?: boolean
  activeMove?: { side: string; cat: 'physical' | 'special' | 'status'; name: string } | null
  showGuides?: boolean
  isCaptureSuccess?: boolean
  sparkles?: SparkleData[]
  isFainting?: boolean
  isEmerging?: boolean
  suppressFX?: boolean
  hidden?: boolean
  stages?: Partial<BattleStages>
}

const props = withDefaults(defineProps<Props>(), {
  pokemon: null,
  groundY: '90%',
  shadowKey: null,
  animState: null,
  ballId: 'pokeball',
  isShaking: false,
  isBlinking: false,
  isSilhouette: false,
  isAttacking: false,
  activeMove: null,
  showGuides: false,
  isCaptureSuccess: false,
  sparkles: () => [],
  isFainting: false,
  isEmerging: false,
  suppressFX: false,
  hidden: false,
  stages: () => ({})
})

const emit = defineEmits<{
  (e: 'load', size: { w: number; h: number }): void
}>()

const naturalSize = ref({ w: 0, h: 0 })
const animSeed = Math.random()

const isPlayer = computed(() => props.side === 'player')

const imageUrl = computed(() => {
  if (!props.pokemon) return ''
  return getAssetUrl(ASSET_TYPES.POKEMON, props.pokemon.id, { 
    isShiny: !!props.pokemon.isShiny, 
    isBack: isPlayer.value 
  })
})

const isFloating = computed(() => {
  if (!props.pokemon) return false
  if (props.pokemon.isFloating !== undefined) return props.pokemon.isFloating
  const data = pokemonDataProvider.getPokemonData(props.pokemon.id)
  if (data?.isFloating) return true
  const types: string[] = []
  if (props.pokemon.type) types.push(props.pokemon.type.toLowerCase())
  if (props.pokemon.type2) types.push(props.pokemon.type2.toLowerCase())
  return types.includes('flying')
})

const handleLoad = (e: Event) => {
  const target = e.target as HTMLImageElement
  naturalSize.value = { w: target.naturalWidth, h: target.naturalHeight }
  emit('load', naturalSize.value)
}

const getAttackAnimClass = computed(() => {
  if (!props.isAttacking || !props.activeMove) return ''
  const move = props.activeMove
  if (move.side !== props.side) return ''
  if (move.cat === 'physical') return 'atk-physical'
  if (move.cat === 'special') return 'atk-special'
  if (move.cat === 'status') return 'atk-status'
  return 'atk-default'
})

const virtualStyle = { width: '100%', height: '100%' }

const pokeballShadowUrl = computed(() => {
  if (typeof document === 'undefined') return ''
  const w = 10, h = 7
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = 'Rgba(0, 0, 0, 0.45)'
  ctx.beginPath()
  ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
  ctx.fill()
  return `url(${canvas.toDataURL('image/png')})`
})

const shadowStore = useCombatShadowStore()
const currentShadow = computed(() => props.shadowKey ? shadowStore.activeShadows.get(props.shadowKey) : null)

const localGroundY = computed(() => {
  const shadow = currentShadow.value
  if (shadow && shadow.feetY !== undefined) {
    return `${shadow.feetY * 100}%`
  }
  return props.groundY
})

const stickyCoords = computed(() => {
  const shadow = currentShadow.value
  let left = '50%'
  let top = localGroundY.value
  
  if (shadow) {
    const scale = (WORLD_CONSTANTS as { OBJECT_SCALE: number }).OBJECT_SCALE || 2
    const entitySize = props.baseSize * scale

    if (shadow.feetX !== undefined) {
      const offsetX = (shadow.feetX - 0.5) * entitySize
      left = `calc(50% + ${offsetX}px)`
    }
  }
  
  return { top, left }
})

const handleImageError = (e: Event) => {
  (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.ENVIRONMENT, 'tall-grass')
}

const handleBallError = (e: Event) => {
  (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.ITEM, 'pokeball')
}

// --- ANIMACIONES DE STATS ---
const statArrows = ref<{ id: number; dir: 'up' | 'down'; stat: string }[]>([])
watch(() => props.stages, (newS, oldS) => {
  if (!oldS) return
  
  const stats: (keyof BattleStages)[] = ['atk', 'def', 'spa', 'spd', 'spe', 'acc', 'eva']
  stats.forEach(s => {
    const diff = (newS[s] || 0) - (oldS[s] || 0)
    if (diff !== 0) {
      triggerStatArrow(String(s), diff > 0 ? 'up' : 'down')
      // Emitir sonido directamente desde la vista reactiva
      gameBus.emit('PLAY_SOUND', diff > 0 ? 'statRaise' : 'statLower')
    }
  })
}, { deep: true })

const triggerStatArrow = (stat: string, dir: 'up' | 'down') => {
  const id = Temporal.Now.instant().epochMilliseconds + Math.random()
  statArrows.value.push({ id, dir, stat })
  gsap.delayedCall(1.2, () => {
    statArrows.value = statArrows.value.filter(a => a.id !== id)
  })
}

// GSAP Animations
const spriteRef = ref<HTMLElement | null>(null)

watch(() => props.isEmerging, (val) => {
  if (val && spriteRef.value) {
    const tl = gsap.timeline()
    tl.to(spriteRef.value, { y: 8, scaleX: 1.2, scaleY: 0.75, duration: 0.1, ease: "power1.in" })
      .to(spriteRef.value, { y: -60, scaleX: 0.85, scaleY: 1.2, duration: 0.3, ease: "power2.out" })
      .to(spriteRef.value, { y: 0, scaleX: 1.1, scaleY: 0.9, duration: 0.2, ease: "bounce.out" })
      .to(spriteRef.value, { scaleX: 1, scaleY: 1, duration: 0.1 })
  }
})

watch(() => props.isFainting, (val) => {
  if (val && spriteRef.value) {
    gsap.to(spriteRef.value, {
      opacity: 0,
      y: 60,
      duration: 0.8,
      ease: "power2.in",
      onStart: () => {
        gsap.to(spriteRef.value, { opacity: 0, duration: 0.05, repeat: 10, yoyo: true })
      }
    })
  }
})

watch(() => props.animState, (val) => {
  if (!spriteRef.value) return
  if (val === 'catching') {
    gsap.to(spriteRef.value, {
      scale: 0,
      opacity: 0,
      filter: "Brightness(0) Invert(1) Drop-Shadow(0 0 20px #00ccff)",
      duration: 0.8,
      ease: "power2.inOut"
    })
  } else if (val === 'releasing') {
    gsap.fromTo(spriteRef.value, 
      { scale: 0, opacity: 1, filter: "Brightness(0) Invert(1) Drop-Shadow(0 0 20px #00ccff)" },
      { scale: 1, opacity: 1, filter: "none", duration: 0.8, ease: "back.out(1.7)" }
    )
  }
})

watch(() => props.isAttacking, (val) => {
  if (val && spriteRef.value && props.activeMove) {
    const isPlayerSide = props.side === 'player'
    const cat = props.activeMove.cat
    const tl = gsap.timeline()
    
    if (cat === 'physical' || !cat) {
      const dashDist = isPlayerSide ? 60 : -60
      const prepDist = isPlayerSide ? -15 : 15
      tl.to(spriteRef.value, { x: prepDist, duration: 0.1 })
        .to(spriteRef.value, { x: dashDist, scale: 1.1, duration: 0.15, ease: "power2.out" })
        .to(spriteRef.value, { x: 0, scale: 1, duration: 0.15, ease: "power1.inOut" })
    } else if (cat === 'special') {
      const pulseDist = isPlayerSide ? 15 : -15
      tl.to(spriteRef.value, { 
        x: pulseDist, 
        scale: 1.15, 
        filter: "Brightness(1.4)", 
        duration: 0.2, 
        yoyo: true, 
        repeat: 1,
        ease: "power2.out"
      })
    } else if (cat === 'status') {
      const rot = isPlayerSide ? 12 : -12
      tl.to(spriteRef.value, { 
        rotation: rot, 
        scale: 1.1, 
        filter: "Brightness(1.2)", 
        duration: 0.2, 
        yoyo: true, 
        repeat: 1,
        ease: "power2.out"
      })
    }
  }
})
</script>

<template>
  <VirtualEntity
    v-if="pokemon"
    :class="['combatant-sprite', `${side}-side-sprite`]"
    :x="position.x"
    :y="position.y"
    :w="baseSize"
    :h="baseSize"
  >
    <div
      v-if="animState !== 'trapped' && !isCaptureSuccess"
      ref="spriteRef"
      class="sprite-animator"
      :class="[{ 
        'is-attacking': isAttacking,
        'is-technical-hidden': hidden
      }, getAttackAnimClass]"
    >
      <!-- Sombra integrada (Sigue el dash pero no el flotado) -->
      <CombatShadow 
        v-if="shadowKey" 
        :shadow-id="shadowKey" 
        :style="{ '--shadow-y': localGroundY }"
      />

      <!-- Capa de Efectos de Suelo (Sigue la sombra, ignora el float) -->
      <div 
        class="ground-effects-container"
        :style="{ top: localGroundY }"
      >
        <!-- Púas -->
        <Transition name="ground-fx-pop">
          <div
            v-if="(stages.spikes || 0) > 0"
            :key="`spikes-${side}-${stages.spikes || 0}`"
            class="ground-fx spikes"
          >
            <span
              v-for="i in 3"
              :key="i"
              class="spike-item"
            >🌵</span>
          </div>
        </Transition>
        
        <!-- Arraigo -->
        <Transition name="ground-fx-pop">
          <div
            v-if="pokemon.ingrain"
            :key="`ingrain-${side}`"
            class="ground-fx ingrain"
          >
            <span class="root-item">🌳</span>
          </div>
        </Transition>
      </div>

      <div
        class="sprite-rotation-layer"
        :class="[getAttackAnimClass, { 'is-floating-species': isFloating }]"
      >
        <div
          class="sprite-idle-wrapper"
          :class="[{ 
            'combatant-idle-subtle': pokemon.status !== 'freeze' && (animState as string) !== 'trapped' && animState !== 'catching' && !isFloating, 
            'combatant-idle-floating': pokemon.status !== 'freeze' && (animState as string) !== 'trapped' && animState !== 'catching' && isFloating, 
            'is-floating-species': isFloating, 
            'energy-catching': animState === 'catching', 
            'energy-releasing': animState === 'releasing'
          }]"
          :style="{ 
            animationDelay: `calc(${animSeed} * -3s)`, 
            '--idle-dist': isFloating ? '-12px' : '-3px', 
            '--shadow-y': localGroundY 
          }"
        >
          <PVSpriteFX
            :poke-id="pokemon.uid || pokemon.id"
            :is-shiny="pokemon.isShiny"
            :is-guardian="pokemon.isGuardian"
            :is-silhouette="isSilhouette"
            :status="(!isSilhouette && !suppressFX ? pokemon.status : null) as any"
            :is-confused="!isSilhouette && !suppressFX && (pokemon.confused || 0) > 0"
            :is-cursed="!isSilhouette && !suppressFX && pokemon.cursed"
            :is-seeded="!isSilhouette && !suppressFX && pokemon.seeded"
            :is-trapped="!!(!isSilhouette && !suppressFX && (pokemon.trapped || (pokemon.bound && pokemon.bound > 0)))"
            :attracted="!isSilhouette && !suppressFX && pokemon.attracted"
            :is-focus-energy="!isSilhouette && !suppressFX && pokemon.focusEnergy"
            :is-protected="!isSilhouette && !suppressFX && (pokemon.protect || pokemon.detect)"
            :is-enduring="!isSilhouette && !suppressFX && pokemon.endure"
            :is-lock-on="!isSilhouette && !suppressFX && pokemon.lockOn"
            :has-reflect="!isSilhouette && !suppressFX && (stages.reflect || 0) > 0"
            :has-light-screen="!isSilhouette && !suppressFX && (stages.lightScreen || 0) > 0"
            :has-safeguard="!isSilhouette && !suppressFX && (stages.safeguard || 0) > 0"
            :has-mist="!isSilhouette && !suppressFX && (stages.mist || 0) > 0"
            :vibrant="true"
            :sparkle-count="8"
            :style="virtualStyle"
          >
            <img
              class="pokemon-combat-image"
              :class="{ 'is-silhouette': isSilhouette }"
              :src="imageUrl"
              @load="handleLoad"
              @error="handleImageError"
            >
          </PVSpriteFX>

          <!-- Guía de tamaño real (Debug) -->
          <div 
            v-if="showGuides && naturalSize.w > 0" 
            class="guide-real-size"
            :style="{ width: naturalSize.w + 'px', height: naturalSize.h + 'px' }"
          >
            <span>{{ naturalSize.w }}x{{ naturalSize.h }}</span>
          </div>
          <!-- NOTE: guide-real-size must be position:absolute (see styles) to avoid flex layout shifts -->
          
          <!-- Flechas de Stats -->
          <div class="stat-arrows-container">
            <TransitionGroup name="stat-arrow">
              <div 
                v-for="a in statArrows" 
                :key="a.id"
                :class="['stat-arrow', a.dir]"
              >
                {{ a.dir === 'up' ? '▲' : '▼' }}
              </div>
            </TransitionGroup>
          </div>
        </div>
      </div>
    </div>

    <!-- Poké Ball visual -->
    <Transition name="ball-fade">
      <div
        v-if="animState === 'trapped' || animState === 'catching' || animState === 'releasing' || isCaptureSuccess"
        :key="`ball-${side}-${pokemon.uid || pokemon.id}`"
        class="trapped-pokeball"
        :class="{ 
          'is-shaking': isShaking,
          'is-blinking': isBlinking,
          'is-success': isCaptureSuccess
        }"
        :style="stickyCoords"
      >
        <img
          :src="getAssetUrl(ASSET_TYPES.ITEM, ballId)"
          alt="Pokeball"
          @error="handleBallError"
        >
        
        <div
          class="pokeball-shadow"
          :style="{ backgroundImage: pokeballShadowUrl }"
        />

        <!-- Success Sparkles (Centradas en la bola) -->
        <div
          v-if="sparkles.length > 0"
          class="catch-success-sparkles"
        >
          <span
            v-for="s in sparkles"
            :key="s.id"
            class="sparkle"
            :style="{ 
              '--tx': s.tx, 
              '--ty': s.ty, 
              '--tf': s.tf,
              '--scale': s.scale,
              'animation-delay': s.delay 
            }"
          >✨</span>
        </div>
      </div>
    </Transition>
  </VirtualEntity>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.combatant-sprite {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  @include pixelated;
  overflow: visible;

  .sprite-animator, 
  .sprite-rotation-layer, 
  .sprite-idle-wrapper,
  :deep(.pv-fx-wrapper) {
    width: 100% !important;
    height: 100% !important;
    display: flex;
    align-items: center;
    justify-content: center;
  }

    .pokemon-combat-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center;
      transition: filter 0.4s ease-in-out; // Permitir que el color brote del negro suavemente
      @include pixelated;
      &.is-silhouette { 
        @include pokemon-silhouette;
      }
    }
}

// Overlay de debug que NO debe afectar el layout del flex container
.guide-real-size {
  position: absolute;
  top: 0;
  left: 0;
  border: 1px dashed Rgba(255, 100, 0, 0.7);
  pointer-events: none;
  z-index: var(--z-navigation);

  span {
    position: absolute;
    bottom: 2px;
    right: 4px;
    font-size: 9px;
    color: Rgba(255, 180, 0, 1);
    background: Rgba(0, 0, 0, 0.6);
    padding: 1px 3px;
    @include pixelated;
  }
}

.sprite-animator {
  // Las transiciones de transform deben estar desactivadas por defecto
  // para evitar que el posicionamiento inicial parezca un salto.
  transition: opacity 0.8s ease-in-out, transform 0s; 
  
  &.is-jumping { 
    animation: pokemon-jump 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; 
    transition: none !important; 
    z-index: calc(var(--z-map-spawns) + 10); 
  }
  position: relative;
  z-index: var(--z-map-spawns);
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: visible;

  &.atk-default.is-attacking, &.atk-physical.is-attacking { animation: attack-dash-enemy 0.4s ease-out; }
  &.atk-special.is-attacking { animation: attack-pulse-enemy 0.4s ease-out; }

  .player-side-sprite & {
    &.atk-default.is-attacking, &.atk-physical.is-attacking { animation: attack-dash-player 0.4s ease-out; }
    &.atk-special.is-attacking { animation: attack-pulse-player 0.4s ease-out; }
  }

  &.fainted {
    .sprite-idle-wrapper {
      animation: pokemon-faint 0.8s ease-in forwards !important;
      pointer-events: none;
    }
  }

  &.is-technical-hidden {
    opacity: 0 !important;
    pointer-events: none;
    transition: none !important;
  }
}

.sprite-rotation-layer {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: visible;
  z-index: var(--z-map-spawns);

  &.is-floating-species { 
    margin-bottom: 40px; 
    @media (max-width: 690px) { margin-bottom: 18px; } 
  }

  &.atk-status { 
    animation: attack-status-enemy 0.4s ease-out; 
    .player-side-sprite & { animation: attack-status-player 0.4s ease-out; }
  }
}

.energy-catching {
  animation: energy-catch 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
  transform-origin: 50% var(--shadow-y, 90%);
  pointer-events: none;
}

.energy-releasing {
  animation: energy-release 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important;
  transform-origin: 50% var(--shadow-y, 90%);
}

.ball-fade-enter-active, .ball-fade-leave-active { transition: opacity 0.2s ease-in-out; }
.ball-fade-enter-from, .ball-fade-leave-to { opacity: 0; }

.trapped-pokeball {
  position: absolute;
  left: 50%;
  transform: Translatex(-50%) Translatey(-85%);
  width: calc(var(--obj-scale, 1) * 40px);
  height: calc(var(--obj-scale, 1) * 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-map-ui);
  pointer-events: none;
  @include pixelated;
  overflow: visible;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    transform-origin: 50% 70%;
  }

  &.is-shaking img { animation: pokeball-wobble 0.6s ease-in-out; }
  &.is-blinking img { animation: pokeball-shake-blink 0.4s ease-in-out; }
  &.is-shaking.is-blinking img { animation: pokeball-wobble 0.6s ease-in-out, pokeball-shake-blink 0.4s ease-in-out; }
  &.is-success img { animation: pokeball-success-blink 0.5s ease-in-out infinite; }
}

@keyframes pokeball-shake-blink { 0%, 100% { will-change: transform, filter, opacity;
  filter: Brightness(1); } 50% { will-change: transform, filter, opacity;
  filter: Brightness(2) Hue-Rotate(10deg); } }
@keyframes pokeball-success-blink { 0%, 100% { will-change: transform, filter, opacity;
  filter: Brightness(1); } 50% { will-change: transform, filter, opacity;
  filter: Brightness(1.8) Sepia(0.5) Hue-Rotate(-10deg); } }

.pokeball-shadow {
  position: absolute;
  top: 85%;
  left: 50%;
  transform: Translatex(-50%) Translatey(-50%);
  width: 70%;
  height: 15%;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  @include pixelated;
  z-index: calc(var(--z-base) - 1);
  pointer-events: none;
  opacity: 0.8;
}

.catch-success-sparkles {
  position: absolute;
  top: 50%;
  left: 50%;
  pointer-events: none;
  z-index: var(--z-low);
  overflow: visible;

  .sparkle {
    position: absolute;
    top: 50%;
    left: 50%;
    font-size: calc(var(--obj-scale, 1) * 12px);
    transform: Translate(-50%, -50%);
    animation: catch-sparkle-out 0.8s ease-out forwards;
    @include pixelated;
    text-shadow: 0 0 5px Rgba(255, 215, 0, 0.8);
    will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 0 2px white);
  }
}

@keyframes pokeball-wobble {
  0%, 100% { transform: Rotate(0deg); }
  25% { transform: Rotate(-20deg); }
  75% { transform: Rotate(20deg); }
}

.ground-effects-container {
  position: absolute;
  left: 50%;
  transform: Translatex(-50%) Translatey(-50%);
  width: 100%;
  height: 20px;
  pointer-events: none;
  z-index: calc(var(--z-map-spawns) + 5); 
  display: flex;
  justify-content: center;
  align-items: center;
}

.ground-fx {
  position: absolute;
  display: flex;
  gap: 8px;
  
  &.spikes {
    .spike-item {
      font-size: 28px;
      display: inline-block;
      animation: 
        ground-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards,
        ground-item-jump 2s infinite ease-in-out 0.4s;
      will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 2px 2px Rgba(0,0,0,0.3));
      
      &:nth-child(2) { animation-delay: 0.1s, 0.7s; }
      &:nth-child(3) { animation-delay: 0.2s, 1s; }
    }
  }
  
  &.ingrain {
    .root-item {
      font-size: 42px;
      display: inline-block;
      transform: Translatey(5px);
      animation: 
        ground-grow 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards,
        ground-item-pulse 3s infinite ease-in-out 0.6s;
    }
  }
}

.ground-fx-pop-enter-active {
  animation: ground-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.ground-fx-pop-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
  opacity: 0;
  transform: Scale(0);
}

@keyframes catch-sparkle-out {
  0% { transform: Translate(-50%, -50%) Scale(0) Rotate(0deg); opacity: 1; }
  100% { transform: Translate(calc(-50% + var(--tx) * 1px), calc(-50% + var(--tf) * 1px)) Scale(0) Rotate(720deg); opacity: 0; }
}

.stat-arrows-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-low);
}

.stat-arrow {
  position: absolute;
  font-size: 40px;
  font-weight: bold;
  text-shadow: 0 0 10px Rgba(0,0,0,0.5);
  
  &.up { color: #4ade80; }
  &.down { color: #f87171; }
}

.stat-arrow-enter-active {
  animation: stat-arrow-anim 1s ease-out forwards;
}

@keyframes stat-arrow-anim {
  0% { transform: Translatey(20px); opacity: 0; scale: 0.5; }
  20% { transform: Translatey(0); opacity: 1; scale: 1.2; }
  100% { transform: Translatey(-60px); opacity: 0; scale: 1; }
}
</style>
