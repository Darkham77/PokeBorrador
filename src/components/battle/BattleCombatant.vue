<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue'

const SPRITE_SWAP_STRETCH_Y = 1.5;
const SPRITE_SWAP_SQUEEZE_X = 0.15;
const SPRITE_SWAP_IN_DURATION_SEC = 0.18;
const SPRITE_SWAP_OUT_DURATION_SEC = 0.25;
import gsap from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import VirtualEntity from './VirtualEntity.vue'
import CombatShadow from './CombatShadow.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import type { BattleCombatantProps } from '@/types/battle/battle'
import { useBattleCombatantAnims, onSparkleEnter, onBallEnter, onBallLeave } from './useBattleCombatantAnims.ts'
import { useBattleCombatantState } from './useBattleCombatantState.ts'
import { onGroundPopEnter } from '@/logic/combat/shadowHelpers'

// Referencias DOM
const spriteRef = ref<HTMLElement | null>(null)
const spriteRotationRef = ref<HTMLElement | null>(null)
const shadowWrapperRef = ref<HTMLElement | null>(null)
const pokeballImgRef = ref<HTMLImageElement | null>(null)
const idleWrapperRef = ref<HTMLElement | null>(null)

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
  isFainting: false,
  isEmerging: false,
  suppressFX: false,
  hidden: false,
  hasSeat: false,
  stages: () => ({}),
  zIndex: undefined,
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
  speciesSizeScale,
  debugShowPokeRadius,
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
  smokeParticles,
  isAnimated,
  frames,
  displaySize,
  feetPoints,
  idleKey,
  variationKey,
  variationMeta
} = useBattleCombatantState(props, emit, spriteRef)

const animTween = ref<gsap.core.Timeline | gsap.core.Tween | null>(null)
const currentMode = ref<'idle' | 'variation'>('idle')
const idleImageUrl = ref('')
const variationImageUrl = ref('')

// Variables de ciclos de animación de spritesheet
const IDLE_CYCLES_MIN = 3
const IDLE_CYCLES_VARIANCE = 2

const idleCyclesTarget = ref(Math.floor(Math.random() * IDLE_CYCLES_VARIANCE) + IDLE_CYCLES_MIN)

watch([idleKey, () => props.pokemon?.isShiny, () => props.pokemon?.status, isAnimated], () => {
  idleCyclesTarget.value = Math.floor(Math.random() * IDLE_CYCLES_VARIANCE) + IDLE_CYCLES_MIN
  currentMode.value = 'idle' // Forzar reinicio al estado de reposo (idle) al cambiar de Pokémon o estado
  if (!props.pokemon) return

  const spriteId = props.pokemon.form && props.pokemon.form !== 'normal' ? `${props.pokemon.id}-${props.pokemon.form}` : props.pokemon.id
  const baseAssetUrl = getAssetUrl(ASSET_TYPES.POKEMON, spriteId, {
    isShiny: !!props.pokemon.isShiny,
    isBack: props.side === 'player',
    isAnimated: true,
  })

  const getAnimatedUrl = (baseAssetUrl: string, key: string | null) => {
    if (!key || !baseAssetUrl) return ''
    const filename = key.replace(/_back$/, '')
    return baseAssetUrl.replace(/\/([^/]+)\.webp$/i, `/${filename}.webp`)
  }

  idleImageUrl.value = getAnimatedUrl(baseAssetUrl, idleKey.value)
  variationImageUrl.value = getAnimatedUrl(baseAssetUrl, variationKey.value)

  nextTick(() => {
    animateSpritesheet()
  })
}, { immediate: true })

// Watcher para la transformación visual (con GSAP)
watch(
  [() => props.pokemon?.id, () => props.pokemon?.form],
  (newVal, oldVal) => {
    if (oldVal[0] && (newVal[0] !== oldVal[0] || newVal[1] !== oldVal[1])) {
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

const animateSpritesheet = () => {
  if (animTween.value) {
    animTween.value.kill()
    animTween.value = null
  }
  if (!isAnimated.value || !spriteRef.value) return

  const imgEl = spriteRef.value.querySelector('.pokemon-combat-image') as HTMLElement
  if (!imgEl) return

  // Si está congelado o dormido, forzar primer frame del idle y detener animación
  if (props.pokemon?.status === 'frz' || props.pokemon?.status === 'slp') {
    currentMode.value = 'idle'
    const imgEl = spriteRef.value.querySelector('.pokemon-image-idle') as HTMLElement
    if (imgEl) {
      gsap.set(imgEl, { x: 0, xPercent: 0 })
    }
    return
  }

  const playMode = () => {
    // 1. Limpiar timelines previos y detener todas las llamadas a onComplete
    if (animTween.value) {
      animTween.value.kill()
      animTween.value = null
    }
    if (!props.pokemon) return

    const startTween = () => {
      if (!spriteRef.value) return
      
      // Apuntamos específicamente a la imagen correspondiente al modo actual
      const activeClass = currentMode.value === 'idle' ? '.pokemon-image-idle' : '.pokemon-image-variation'
      const imgEl = spriteRef.value.querySelector(activeClass) as HTMLElement
      if (!imgEl) return

      const totalFrames = currentMode.value === 'idle' 
        ? (frames.value) 
        : (variationMeta.value?.frames ?? 0)

      // Si el modo actual no tiene frames o es variación y no hay variación, volvemos a idle
      if (totalFrames <= 1 || (currentMode.value === 'variation' && !variationMeta.value)) {
        currentMode.value = 'idle'
        const idleImg = spriteRef.value.querySelector('.pokemon-image-idle') as HTMLElement
        if (idleImg) {
          gsap.set(idleImg, { x: 0, xPercent: 0 })
        }
        return
      }

      // Resetear posición de frame y limpiar transformaciones para evitar deformación temporal
      gsap.killTweensOf(imgEl);
      gsap.set(imgEl, { clearProps: 'x,xPercent,transform' });
      gsap.set(imgEl, { x: 0, xPercent: 0 });

      const endXPercent = -((totalFrames - 1) / totalFrames) * 100
      const fps = currentMode.value === 'idle' ? 8 : 10;
      const duration = totalFrames / fps;
      const repeatCount = currentMode.value === 'idle' ? (idleCyclesTarget.value - 1) : 0

      // Orquestación robusta usando Timeline de GSAP para garantizar atomicidad en transiciones y evitar parpadeos (glitches de 1-frame)
      const tl = gsap.timeline({
        onComplete: () => {
          if (!props.pokemon) return
          // Hacemos el cambio de modo síncronamente antes de volver a llamar a playMode
          if (currentMode.value === 'idle' && variationMeta.value && variationMeta.value.frames > 1) {
            currentMode.value = 'variation'
            idleCyclesTarget.value = Math.floor(Math.random() * IDLE_CYCLES_VARIANCE) + IDLE_CYCLES_MIN
          } else {
            currentMode.value = 'idle'
          }
          playMode()
        }
      });

      tl.to(imgEl, {
        xPercent: endXPercent,
        ease: `steps(${totalFrames - 1})`,
        duration,
        repeat: repeatCount
      });

      animTween.value = tl;
    }

    // Como ambas imágenes ya están renderizadas en el DOM, no necesitamos esperar un onload asíncrono
    startTween()
  }

  playMode()
}

onUnmounted(() => {
  if (animTween.value) {
    animTween.value.kill()
  }
})

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



const handleBallLeave = (el: Element, done: () => void) => {
  onBallLeave(el, props.side, done)
}

// Ground Pop Hooks

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
            :is-confused="!!pokemon.confused || (pokemon.volatileCounters?.['confusion'] || 0) > 0"
            :is-taunted="(pokemon.tauntTurns || 0) > 0 || (pokemon.volatileCounters?.['taunt'] || 0) > 0 || (pokemon.volatileCounters?.['tauntTurns'] || 0) > 0"
            :is-substitute="!!pokemon.substitute || (pokemon.volatileCounters?.['substitute'] || 0) > 0"
            :is-flinched="(pokemon.volatileCounters?.['flinch'] || 0) > 0"
            :is-disabled="(pokemon.disabledTurns || 0) > 0 || (pokemon.volatileCounters?.['disable'] || 0) > 0 || (pokemon.volatileCounters?.['disabledTurns'] || 0) > 0"
            :is-encored="(pokemon.encoreTurns || 0) > 0 || (pokemon.volatileCounters?.['encore'] || 0) > 0 || (pokemon.volatileCounters?.['encoreTurns'] || 0) > 0"
            :is-cursed="!!pokemon.cursed || (pokemon.volatileCounters?.['curse'] || 0) > 0"
            :is-seeded="!!pokemon.seeded || (pokemon.volatileCounters?.['leechseed'] || 0) > 0"
            :is-trapped="!!(pokemon.trapped || (pokemon.bound && pokemon.bound > 0) || (pokemon.volatileCounters?.['trapped'] || 0) > 0 || (pokemon.volatileCounters?.['bound'] || 0) > 0 || (pokemon.volatileCounters?.['partiallytrapped'] || 0) > 0)"
            :is-ingrained="!!(pokemon.ingrain || (pokemon.volatileCounters?.['ingrain'] || 0) > 0)"
            :is-perish-song="(pokemon.perishSongCount || 0) > 0 || (pokemon.volatileCounters?.['perishsong'] || 0) > 0"
            :attracted="!!pokemon.attracted || (pokemon.volatileCounters?.['attract'] || 0) > 0"
            :is-focus-energy="!!pokemon.focusEnergy || (pokemon.volatileCounters?.['focusenergy'] || 0) > 0"
            :is-protected="!!(pokemon.protect || pokemon.detect || (pokemon.volatileCounters?.['protect'] || 0) > 0)"
            :is-enduring="!!pokemon.endure || (pokemon.volatileCounters?.['endure'] || 0) > 0"
            :is-lock-on="!!pokemon.lockOn || (pokemon.volatileCounters?.['lockon'] || 0) > 0"
            :has-reflect="(stages.reflect || 0) > 0"
            :has-light-screen="(stages.lightScreen || 0) > 0"
            :has-safeguard="(stages.safeguard || 0) > 0"
            :has-mist="(stages.mist || 0) > 0"
            :vibrant="true"
            :sparkle-count="8"
            :radius="fxRadius * 1.25"
            :sprite-scale="fxScale"
            :poke-scale="speciesSizeScale"
            :style="{
              width: (displaySize * 2) + 'px',
              height: (displaySize * 2) + 'px',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              top: `calc(${localGroundY} - ${feetPoints.feetY * displaySize * 2}px)`
            }"
            :is-battle="true"
          >
            <!-- Wrapper exterior: solo hereda tamaño y posición del parent PVSpriteFX (que es el wrapper) -->
            <div 
              class="pokemon-atmosphere-wrapper"
              :style="{
                width: '100%',
                height: '100%',
                minWidth: '0',
                minHeight: '0',
                overflow: 'visible',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isAnimated ? 'flex-start' : 'center'
              }"
            >
              <!-- Wrapper para estados (recibe filtros en PVSpriteFX) -->
              <div
                class="pokemon-sprite-status-wrapper"
                :style="{
                  width: '100%',
                  height: '100%',
                  minWidth: '0',
                  minHeight: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isAnimated ? 'flex-start' : 'center',
                  overflow: isAnimated ? 'hidden' : 'visible',
                  position: 'relative'
                }"
              >
                <!-- Para sprites animados: Renderizamos ambos simultáneamente si existen para evitar parpadeos y demoras de swapping de src -->
                <template v-if="isAnimated">
                  <!-- Imagen IDLE (i) -->
                  <img
                    class="pokemon-combat-image pokemon-image-idle"
                    :class="{ 
                      'is-silhouette': isSilhouette,
                      'active-mode': currentMode === 'idle'
                    }"
                    :src="idleImageUrl"
                    :style="{
                      filter: isSilhouette ? 'none' : 'var(--atmosphere-filter)',
                      width: (frames * 100) + '%',
                      maxWidth: 'none',
                      height: '100%',
                      objectFit: 'fill',
                      objectPosition: 'left center',
                      flexShrink: 0,
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      opacity: currentMode === 'idle' ? 1 : 0,
                      pointerEvents: currentMode === 'idle' ? 'auto' : 'none',
                      visibility: currentMode === 'idle' ? 'visible' : 'hidden'
                    }"
                    @load="handleLoad"
                    @error="handleImageError"
                  >

                  <!-- Imagen VARIACIÓN (v) -->
                  <img
                    v-if="variationMeta && variationMeta.frames > 1"
                    class="pokemon-combat-image pokemon-image-variation"
                    :class="{ 
                      'is-silhouette': isSilhouette,
                      'active-mode': currentMode === 'variation'
                    }"
                    :src="variationImageUrl"
                    :style="{
                      filter: isSilhouette ? 'none' : 'var(--atmosphere-filter)',
                      width: (variationMeta.frames * 100) + '%',
                      maxWidth: 'none',
                      height: '100%',
                      objectFit: 'fill',
                      objectPosition: 'left center',
                      flexShrink: 0,
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      opacity: currentMode === 'variation' ? 1 : 0,
                      pointerEvents: currentMode === 'variation' ? 'auto' : 'none',
                      visibility: currentMode === 'variation' ? 'visible' : 'hidden'
                    }"
                    @load="handleLoad"
                    @error="handleImageError"
                  >
                </template>

                <!-- Sprite estático: img directamente -->
                <img
                  v-else
                  class="pokemon-combat-image"
                  :class="{ 'is-silhouette': isSilhouette }"
                  :src="imageUrl"
                  :style="{ filter: isSilhouette ? 'none' : 'var(--atmosphere-filter)' }"
                  @load="handleLoad"
                  @error="handleImageError"
                >
              </div>

              <!-- Guía de tamaño real (Debug) -->
              <div 
                v-if="showGuides && naturalSize.w > 0" 
                class="guide-real-size"
                :style="isAnimated ? {
                  width: '100%',
                  height: '100%'
                } : {
                  width: naturalSize.w + 'px',
                  height: naturalSize.h + 'px'
                }"
              >
                <span v-if="isAnimated">{{ Math.round(displaySize) }}x{{ Math.round(displaySize) }}</span>
                <span v-else>{{ naturalSize.w }}x{{ naturalSize.h }}</span>
              </div>

              <!-- Radio del Pokémon (Debug) — centrado DENTRO del wrapper del sprite -->
              <div
                v-if="debugShowPokeRadius"
                class="debug-poke-radius-sprite"
                :style="{
                  width: (fxRadius * 2) + '%',
                  height: (fxRadius * 2) + '%'
                }"
              >
                <span class="debug-poke-radius-label">POKE (Radius: {{ fxRadius.toFixed(1) }}%)</span>
              </div>
            </div>
          </PVSpriteFX>
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
