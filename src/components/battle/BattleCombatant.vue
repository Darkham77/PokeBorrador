<script setup lang="ts">
import { ref, computed, watch, nextTick, useTemplateRef } from 'vue'

const SPRITE_SWAP_STRETCH_Y = 1.5;
const SPRITE_SWAP_SQUEEZE_X = 0.15;
const SPRITE_SWAP_IN_DURATION_SEC = 0.18;
const SPRITE_SWAP_OUT_DURATION_SEC = 0.25;
import gsap from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import VirtualEntity from './VirtualEntity.vue'
import CombatShadow from './CombatShadow.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import type { BattleCombatantProps, CombatantAnimTrigger } from '@/types/battle/battle'
import { useBattleCombatantAnims } from './useBattleCombatantAnims.ts'
import { useBattleCombatantState } from './useBattleCombatantState.ts'
import { useBattleCombatantSpriteLoop } from './useBattleCombatantSpriteLoop.ts'
import { computeCombatantVolatiles } from './combatantVolatilesHelper.ts'
import BattleGroundHazards from './BattleGroundHazards.vue'
import CombatantSpriteLayer from './CombatantSpriteLayer.vue'
import CombatantTrappedBall from './CombatantTrappedBall.vue'

// Referencias DOM
const spriteRef = useTemplateRef<HTMLElement>('spriteRef')
const spriteRotationRef = useTemplateRef<HTMLElement>('spriteRotationRef')
const shadowWrapperRef = useTemplateRef<HTMLElement>('shadowWrapperRef')
const pokeballImgRef = ref<HTMLImageElement | null>(null)
const idleWrapperRef = useTemplateRef<HTMLElement>('idleWrapperRef')

const DEFAULT_GROUND_Y_PERCENT = '75%'

const props = withDefaults(defineProps<BattleCombatantProps>(), {
  pokemon: null,
  groundY: DEFAULT_GROUND_Y_PERCENT,
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
  isEnemy: false,
  isShiny: false,
  isBack: false,
  isActive: true,
  isFainting: false,
  isEmerging: false,
  suppressFX: false,
  hidden: false,
  hasSeat: false,
  stages: () => ({}),
  zIndex: undefined,
  targetPosition: null,
  hideStatusOverlay: false
})

const volatilesProps = computed(() => computeCombatantVolatiles(props.pokemon, props.stages))


const emit = defineEmits<{
  (e: 'load', size: { w: number; h: number }): void
  (e: 'animationEnd', type: CombatantAnimTrigger): void
}>()

// Consumir el estado extraído en el composable
const {
  naturalSize,
  isFloating,
  isEnemy,
  imageUrl,
  getAttackAnimClass,
  pokeballShadowUrl,
  localGroundY,
  fxScale,
  fxRadius,
  speciesSizeScale,
  debugShowPokeRadius,
  pokeballSize,
  isBallVisible,
  wasCaptured,
  internalBallId,
  memorizedBallCoords,
  getSpriteFeetOrigin,
  getBallTargetCoords,
  handleImageError,
  handleBallError,
  handleLoad,
  smokeParticles,
  isAnimated,
  frames,
  displaySize,
  feetPoints,
  idleKey,
  variationKey,
  variationMeta
} = useBattleCombatantState(props, emit, spriteRef)

const idleImageUrl = ref('')
const variationImageUrl = ref('')

const { currentMode, idleCyclesTarget, animateSpritesheet } = useBattleCombatantSpriteLoop({
  props,
  spriteRef,
  isAnimated,
  frames,
  variationMeta
})

const updateAnimatedImageUrls = () => {
  if (!props.pokemon) return

  const spriteId = props.pokemon.form && props.pokemon.form !== 'normal' ? `${props.pokemon.id}-${props.pokemon.form}` : props.pokemon.id
  const baseAssetUrl = getAssetUrl(ASSET_TYPES.POKEMON, spriteId, {
    isShiny: !!props.pokemon.isShiny,
    isBack: props.side === 'player',
    isAnimated: true,
  })

  const getAnimatedUrl = (baseUrl: string, key: string | null) => {
    if (!key || !baseUrl) return ''
    const filename = key.replace(/_back$/, '')
    return baseUrl.replace(/\/([^/]+)\.webp$/i, `/${filename}.webp`)
  }

  idleImageUrl.value = getAnimatedUrl(baseAssetUrl, idleKey.value)
  variationImageUrl.value = getAnimatedUrl(baseAssetUrl, variationKey.value)
}

watch(
  [
    idleKey,
    variationKey,
    () => props.pokemon?.id,
    () => props.pokemon?.uid,
    () => props.pokemon?.form,
    () => props.pokemon?.isShiny,
    () => props.pokemon?.status,
    isAnimated
  ],
  () => {
    idleCyclesTarget.value = Math.floor(Math.random() * 2) + 3
    currentMode.value = 'idle'
    updateAnimatedImageUrls()
    nextTick(() => {
      animateSpritesheet()
    })
  },
  { immediate: true, deep: true }
)

// Watcher para la transformación visual in-situ de un mismo Pokémon (con GSAP)
watch(
  [() => props.pokemon?.id, () => props.pokemon?.form, () => props.pokemon?.uid],
  (newVal, oldVal) => {
    const isSamePokemon = Boolean(newVal[2] && oldVal[2] && newVal[2] === oldVal[2])
    if (isSamePokemon && oldVal[0] && (newVal[0] !== oldVal[0] || newVal[1] !== oldVal[1])) {
      const el = spriteRotationRef.value
      if (!el) return
      
      const tl = gsap.timeline()
      tl.to(el, {
        scaleY: SPRITE_SWAP_STRETCH_Y,
        scaleX: SPRITE_SWAP_SQUEEZE_X,
        filter: 'brightness(4) contrast(1.5)',
        duration: SPRITE_SWAP_IN_DURATION_SEC,
        ease: 'power2.in'
      })
      .to(el, {
        scaleY: 1,
        scaleX: 1,
        filter: 'brightness(1) contrast(1)',
        duration: SPRITE_SWAP_OUT_DURATION_SEC,
        ease: 'back.out(2)'
      })
    }
  }
)

// Inicializar animaciones de combate
useBattleCombatantAnims(
  props,
  spriteRef,
  spriteRotationRef,
  shadowWrapperRef,
  pokeballImgRef,
  idleWrapperRef,
  getSpriteFeetOrigin,
  getBallTargetCoords,
  wasCaptured
)



const setPokeballImgRef = (el: HTMLImageElement | null) => {
  pokeballImgRef.value = el
}
</script>

<template>
  <VirtualEntity
    v-if="pokemon"
    :id="`combatant-${side}`"
    :class="['combatant-sprite', `${side}-side-sprite`]"
    :x="position.x"
    :y="position.y"
    :w="baseSize"
    :h="baseSize"
    :z-index="zIndex"
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
          :sprite-size="displaySize * 2"
          :shadow-scale="feetPoints.shadowScale"
          :style="{ '--shadow-y': localGroundY, '--shadow-z-index': '1' }"
        />
      </div>

      <!-- Capa de Efectos de Suelo -->
      <BattleGroundHazards
        :pokemon="pokemon"
        :side="side"
        :stages="stages"
        :local-ground-y="localGroundY"
      />

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
            v-bind="volatilesProps"
            :vibrant="true"
            :sparkle-count="8"
            :radius="fxRadius * 1.25"
            :sprite-scale="fxScale"
            :poke-scale="speciesSizeScale"
            :hide-status-overlay="props.hideStatusOverlay"
            :style="{
              width: (displaySize * 2) + 'px',
              height: (displaySize * 2) + 'px',
              position: 'absolute',
              left: '50%',
              top: localGroundY,
              transform: `translate(calc(-${feetPoints.feetX * 100}%), calc(-${feetPoints.feetY * 100}%))`
            }"
            :is-battle="true"
          >
            <!-- Capa de Sprite y Guías Modularizada -->
            <CombatantSpriteLayer
              :pokemon="pokemon"
              :is-animated="isAnimated"
              :is-silhouette="isSilhouette"
              :current-mode="currentMode"
              :idle-image-url="idleImageUrl"
              :variation-image-url="variationImageUrl"
              :image-url="imageUrl"
              :frames="frames"
              :variation-meta="variationMeta"
              :show-guides="showGuides"
              :natural-size="naturalSize"
              :display-size="displaySize"
              :debug-show-poke-radius="debugShowPokeRadius"
              :fx-radius="fxRadius"
              @load="handleLoad"
              @error="handleImageError"
            />
          </PVSpriteFX>
        </div>
      </div>
    </div>

    <!-- Poké Ball visual y Feedback de Captura -->
    <CombatantTrappedBall
      :side="side"
      :pokemon-key="pokemon.uid || pokemon.id"
      :is-ball-visible="isBallVisible"
      :memorized-ball-coords="memorizedBallCoords"
      :pokeball-size="pokeballSize"
      :internal-ball-id="internalBallId"
      :pokeball-shadow-url="pokeballShadowUrl"
      :is-critical-capture="isCriticalCapture"
      :sparkles="sparkles"
      :set-pokeball-img-ref="setPokeballImgRef"
      @ball-error="handleBallError"
    />

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
