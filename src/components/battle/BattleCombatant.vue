<script setup lang="ts">
import { ref } from 'vue'
import gsap from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import VirtualEntity from './VirtualEntity.vue'
import CombatShadow from './CombatShadow.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import type { Pokemon } from '@/types/pokemon'
import type { BattleStages } from '@/types/battle'
import { useBattleCombatantAnims, onSparkleEnter, onBallEnter, onBallLeave } from './useBattleCombatantAnims'
import { useBattleCombatantState, type SparkleData } from './useBattleCombatantState'

// Referencias DOM
const spriteRef = ref<HTMLElement | null>(null)
const spriteRotationRef = ref<HTMLElement | null>(null)
const shadowWrapperRef = ref<HTMLElement | null>(null)
const pokeballImgRef = ref<HTMLImageElement | null>(null)
const idleWrapperRef = ref<HTMLElement | null>(null)

interface Props {
  side: 'player' | 'enemy'
  pokemon?: Pokemon | null
  position: { x: number; y: number }
  targetPosition?: { x: number; y: number } | null
  baseSize: number
  groundY?: string
  shadowKey?: string | null
  animState?: 'catching' | 'trapped' | 'releasing' | null
  ballId?: string
  isShaking?: boolean
  isBlinking?: boolean
  isHealing?: boolean
  isSilhouette?: boolean
  isAttacking?: boolean
  activeMove?: { side: string; cat: 'physical' | 'special' | 'status' | 'selfKO'; name: string; selfKO?: boolean } | null
  showGuides?: boolean
  isCaptureSuccess?: boolean
  sparkles?: SparkleData[]
  isFainting?: boolean
  isEmerging?: boolean
  suppressFX?: boolean
  hidden?: boolean
  hasSeat?: boolean
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
  isHealing: false,
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
  hasSeat: false,
  stages: () => ({}),
  targetPosition: null
})

const emit = defineEmits<{
  (e: 'load', size: { w: number; h: number }): void
  (e: 'animationEnd', type: 'attack' | 'faint' | 'damage'): void
}>()

// Consumir el estado extraído en el composable
const {
  naturalSize,
  cacheKey,
  isFloating,
  isEnemy,
  imageUrl,
  getAttackAnimClass,
  pokeballShadowUrl,
  localGroundY,
  fxScale,
  fxRadius,
  isBallVisible,
  wasCaptured,
  internalBallId,
  memorizedBallCoords,
  getSpriteFeetOrigin,
  getBallTargetCoords,
  rawCoordsCache,
  handleImageError,
  handleBallError,
  handleLoad,
  smokeParticles
} = useBattleCombatantState(props, emit, spriteRef)

// Inicializar animaciones de combate
useBattleCombatantAnims(
  props,
  spriteRef,
  spriteRotationRef,
  shadowWrapperRef,
  pokeballImgRef,
  idleWrapperRef,
  cacheKey,
  getSpriteFeetOrigin,
  getBallTargetCoords,
  rawCoordsCache,
  wasCaptured
)

const virtualStyle = { width: '100%', height: '100%' }

const handleBallLeave = (el: Element, done: () => void) => {
  onBallLeave(el, props.side, done)
}

// Ground Pop Hooks
const onGroundPopEnter = (el: Element, done: () => void) => {
  const isSpikes = el.classList.contains('spikes')
  gsap.fromTo(el,
    { scale: 0, y: isSpikes ? 10 : 20, rotation: isSpikes ? -10 : 0, opacity: 0 },
    { 
      scale: 1, 
      y: isSpikes ? 0 : 5, 
      rotation: 0, 
      opacity: 1, 
      duration: isSpikes ? 0.4 : 0.6, 
      ease: 'back.out(1.7)', 
      onComplete: () => {
        done()
        if (isSpikes) {
           gsap.to(el.querySelectorAll('.spike-item'), {
             y: -10,
             scaleY: 1.1,
             scaleX: 0.9,
             duration: 0.8,
             yoyo: true,
             repeat: -1,
             ease: 'power1.inOut',
             stagger: 0.1
           })
        } else {
           gsap.to(el.querySelectorAll('.root-item'), {
             y: 2,
             scale: 1.03,
             filter: 'brightness(1.2)',
             duration: 1.5,
             yoyo: true,
             repeat: -1,
             ease: 'power1.inOut'
           })
        }
      }
    }
  )
}

const onGroundPopLeave = (el: Element, done: () => void) => {
  gsap.to(el, { scale: 0, opacity: 0, duration: 0.3, onComplete: done })
}
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
      v-if="hasSeat"
      ref="spriteRef"
      class="sprite-animator"
      :style="{ '--fx-scale': fxScale }"
      :class="[{ 
        'is-attacking': isAttacking,
        'is-technical-hidden': hidden || animState === 'trapped' || isCaptureSuccess || wasCaptured,
        'releasing': animState === 'releasing'
      }, getAttackAnimClass]"
    >
      <!-- Sombra integrada -->
      <div
        ref="shadowWrapperRef"
        class="combat-shadow-wrapper"
      >
        <CombatShadow 
          v-if="shadowKey" 
          :shadow-id="shadowKey" 
          :style="{ '--shadow-y': localGroundY }"
        />
      </div>

      <!-- Capa de Efectos de Suelo -->
      <div 
        class="ground-effects-container"
        :style="{ top: localGroundY }"
      >
        <!-- Púas -->
        <Transition
          :css="false"
          @enter="onGroundPopEnter"
          @leave="onGroundPopLeave"
        >
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
        <Transition
          :css="false"
          @enter="onGroundPopEnter"
          @leave="onGroundPopLeave"
        >
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
        ref="spriteRotationRef"
        class="sprite-rotation-layer"
        :class="[getAttackAnimClass, { 'is-floating-species': isFloating }]"
      >
        <div
          ref="idleWrapperRef"
          class="sprite-idle-wrapper"
          :class="[{ 
            'is-floating-species': isFloating, 
            'energy-catching': animState === 'catching', 
            'energy-releasing': animState === 'releasing'
          }]"
          :style="{ 
            '--shadow-y': localGroundY,
            '--side-dir': isEnemy ? '-1' : '1'
          }"
        >
          <PVSpriteFX
            :poke-id="pokemon.uid || pokemon.id"
            :is-shiny="pokemon.isShiny"
            :is-guardian="pokemon.isGuardian"
            :is-silhouette="isSilhouette"
            :status="pokemon.status || undefined"
            :is-confused="(pokemon.confused || 0) > 0"
            :is-cursed="pokemon.cursed"
            :is-seeded="pokemon.seeded"
            :is-trapped="!!(pokemon.trapped || (pokemon.bound && pokemon.bound > 0))"
            :attracted="pokemon.attracted"
            :is-focus-energy="pokemon.focusEnergy"
            :is-protected="(pokemon.protect || pokemon.detect)"
            :is-enduring="pokemon.endure"
            :is-lock-on="pokemon.lockOn"
            :has-reflect="(stages.reflect || 0) > 0"
            :has-light-screen="(stages.lightScreen || 0) > 0"
            :has-safeguard="(stages.safeguard || 0) > 0"
            :has-mist="(stages.mist || 0) > 0"
            :vibrant="true"
            :sparkle-count="8"
            :radius="fxRadius"
            :sprite-scale="fxScale"
            :style="virtualStyle"
            :is-battle="true"
          >
            <div 
              class="pokemon-atmosphere-wrapper"
              :style="{ filter: isSilhouette ? 'none' : 'var(--atmosphere-filter)' }"
            >
              <img
                class="pokemon-combat-image"
                :class="{ 'is-silhouette': isSilhouette }"
                :src="imageUrl"
                @load="handleLoad"
                @error="handleImageError"
              >
            </div>
          </PVSpriteFX>

          <!-- Guía de tamaño real (Debug) -->
          <div 
            v-if="showGuides && naturalSize.w > 0" 
            class="guide-real-size"
            :style="{ width: naturalSize.w + 'px', height: naturalSize.h + 'px' }"
          >
            <span>{{ naturalSize.w }}x{{ naturalSize.h }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Poké Ball visual -->
    <Transition 
      :css="false"
      @enter="onBallEnter" 
      @leave="handleBallLeave"
    >
      <div
        v-if="isBallVisible"
        :key="`ball-${side}-${pokemon.uid || pokemon.id}`"
        class="trapped-pokeball"
        :style="[memorizedBallCoords, { filter: 'var(--atmosphere-filter)' }]"
      >
        <img
          ref="pokeballImgRef"
          :src="getAssetUrl(ASSET_TYPES.ITEM, internalBallId)"
          alt="Pokeball"
          @error="handleBallError"
        >
        
        <div
          class="pokeball-shadow"
          :style="{ backgroundImage: pokeballShadowUrl }"
        />

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

    <!-- Partículas de Humo de Escape -->
    <div
      v-if="smokeParticles.length > 0"
      class="smoke-particles-container"
      :style="{ top: localGroundY }"
    >
      <span
        v-for="p in smokeParticles"
        :key="p.id"
        class="smoke-particle"
        :style="{
          transform: `translate(${p.x}px, ${p.y}px) scale(${p.scale})`,
          opacity: p.opacity
        }"
      />
    </div>
  </VirtualEntity>
</template>

<style scoped lang="scss" src="@/styles/components/_battle-combatant.scss"></style>
