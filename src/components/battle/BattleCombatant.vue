// [PureVue-Ignore-Length]
<script setup>
import { ref, computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import VirtualEntity from './VirtualEntity.vue'
import CombatShadow from './CombatShadow.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { useCombatShadowStore } from '@/stores/combatShadows'
import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'

const props = defineProps({
  side: { type: String, required: true }, // 'player' | 'enemy'
  pokemon: { type: Object, default: null },
  position: { type: Object, required: true }, // { x, y }
  baseSize: { type: Number, required: true },
  groundY: { type: String, default: '90%' },
  shadowKey: { type: String, default: null },
  animState: { type: String, default: null }, // 'catching' | 'trapped' | 'releasing'
  ballId: { type: String, default: 'pokeball' },
  isShaking: { type: Boolean, default: false },
  isBlinking: { type: Boolean, default: false },
  isSilhouette: { type: Boolean, default: false },
  isAttacking: { type: Boolean, default: false },
  activeMove: { type: Object, default: null },
  showGuides: { type: Boolean, default: false },
  isCaptureSuccess: { type: Boolean, default: false },
  sparkles: { type: Array, default: () => [] },
  isFainting: { type: Boolean, default: false },
  isEmerging: { type: Boolean, default: false },
  suppressFX: { type: Boolean, default: false },
  stages: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['load'])

const naturalSize = ref({ w: 0, h: 0 })
const animSeed = Math.random()

const isPlayer = computed(() => props.side === 'player')

const imageUrl = computed(() => {
  if (!props.pokemon) return ''
  return getAssetUrl(ASSET_TYPES.POKEMON, props.pokemon.id, { 
    isShiny: props.pokemon.isShiny, 
    isBack: isPlayer.value 
  })
})

const isFloating = computed(() => {
  if (!props.pokemon) return false
  if (props.pokemon.isFloating !== undefined) return props.pokemon.isFloating
  const data = pokemonDataProvider.getPokemonData(props.pokemon.id)
  return data?.isFloating || false
})

const handleLoad = (e) => {
  naturalSize.value = { w: e.target.naturalWidth, h: e.target.naturalHeight }
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
  const canvas = document.createElement('canvas') // [PureVue-Ignore]
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
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
    const scale = WORLD_CONSTANTS.OBJECT_SCALE || 2
    const entitySize = props.baseSize * scale

    if (shadow.feetX !== undefined) {
      const offsetX = (shadow.feetX - 0.5) * entitySize
      left = `calc(50% + ${offsetX}px)`
    }
  }
  
  return { top, left }
})

const handleImageError = (e) => {
  e.target.src = getAssetUrl(ASSET_TYPES.ENVIRONMENT, 'tall-grass')
}

const handleBallError = (e) => {
  // Si falla la bola, mejor dejarla invisible o usar una pokeball básica, NO pasto
  e.target.src = getAssetUrl(ASSET_TYPES.ITEM, 'pokeball')
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
      v-if="animState !== 'trapped' && !isCaptureSuccess"
      class="sprite-animator"
      :class="[{ 
        'fainted': isFainting,
        'is-attacking': isAttacking 
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
            v-if="stages.spikes > 0"
            :key="`spikes-${side}-${stages.spikes}`"
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
            'combatant-idle-subtle': !animState && pokemon.status !== 'freeze', 
            'is-floating-species': isFloating, 
            'energy-catching': animState === 'catching', 
            'energy-releasing': animState === 'releasing' || isEmerging
          }]"
          :style="{ 
            animationDelay: `calc(${animSeed} * -3s)`, 
            '--idle-dist': isFloating ? '-12px' : '-3px', 
            '--shadow-y': localGroundY 
          }"
        >
          <PVSpriteFX
            :poke-id="pokemon.uid || pokemon.id"
            :is-shiny="!isSilhouette && !suppressFX && pokemon.isShiny"
            :is-guardian="!isSilhouette && !suppressFX && pokemon.isGuardian"
            :status="!isSilhouette && !suppressFX ? pokemon.status : null"
            :is-confused="!isSilhouette && !suppressFX && pokemon.confused > 0"
            :is-cursed="!isSilhouette && !suppressFX && pokemon.cursed"
            :is-seeded="!isSilhouette && !suppressFX && pokemon.seeded"
            :is-trapped="!isSilhouette && !suppressFX && (pokemon.trapped || (pokemon.bound > 0))"
            :attracted="!isSilhouette && !suppressFX && pokemon.attracted"
            :is-focus-energy="!isSilhouette && !suppressFX && pokemon.focusEnergy"
            :is-protected="!isSilhouette && !suppressFX && (pokemon.protect || pokemon.detect)"
            :is-enduring="!isSilhouette && !suppressFX && pokemon.endure"
            :is-lock-on="!isSilhouette && !suppressFX && pokemon.lockOn"
            :has-reflect="!isSilhouette && !suppressFX && stages.reflect > 0"
            :has-light-screen="!isSilhouette && !suppressFX && stages.lightScreen > 0"
            :has-safeguard="!isSilhouette && !suppressFX && stages.safeguard > 0"
            :has-mist="!isSilhouette && !suppressFX && stages.mist > 0"
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
  image-rendering: pixelated;
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
    transition: filter 0.3s ease;
    image-rendering: pixelated;
    &.is-silhouette { 
      @include pokemon-silhouette;
      transition: none !important;
    }
  }
}

.sprite-animator {
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
  transform: translateX(-50%) translateY(-85%);
  width: calc(var(--obj-scale, 1) * 40px);
  height: calc(var(--obj-scale, 1) * 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-map-ui);
  pointer-events: none;
  image-rendering: pixelated;
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

@keyframes pokeball-shake-blink { 0%, 100% { filter: Brightness(1); } 50% { filter: Brightness(2) Hue-Rotate(10deg); } }
@keyframes pokeball-success-blink { 0%, 100% { filter: Brightness(1); } 50% { filter: Brightness(1.8) Sepia(0.5) Hue-Rotate(-10deg); } }

.pokeball-shadow {
  position: absolute;
  top: 85%;
  left: 50%;
  transform: TranslateX(-50%) TranslateY(-50%);
  width: 70%;
  height: 15%;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  z-index: -1;
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
  transform: translateX(-50%) translateY(-50%);
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
      filter: Drop-Shadow(0 2px 2px Rgba(0,0,0,0.3));
      
      &:nth-child(2) { animation-delay: 0.1s, 0.7s; }
      &:nth-child(3) { animation-delay: 0.2s, 1s; }
    }
  }
  
  &.ingrain {
    .root-item {
      font-size: 42px;
      display: inline-block;
      transform: translateY(5px);
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

@keyframes ground-pop { 0% { transform: Scale(0); opacity: 0; } 100% { transform: Scale(1); opacity: 1; } }
@keyframes ground-grow { 0% { transform: ScaleY(0) translateY(20px); opacity: 0; } 100% { transform: ScaleY(1) translateY(5px); opacity: 1; } }
@keyframes ground-item-jump { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
@keyframes ground-item-pulse { 0%, 100% { transform: Scale(1); } 50% { transform: Scale(1.05); } }

@keyframes energy-catch {
  0% { filter: none; transform: Scale(1); opacity: 1; }
  25% { filter: Brightness(0) Invert(1) Drop-Shadow(0 0 10px #00ccff); transform: Scale(1.05); }
  100% { filter: Brightness(0) Invert(1) Drop-Shadow(0 0 20px #00ccff); transform: Scale(0); opacity: 1; }
}

@keyframes energy-release {
  0% { filter: Brightness(0) Invert(1) Drop-Shadow(0 0 20px #00ccff); transform: Scale(0); opacity: 1; }
  75% { filter: Brightness(0) Invert(1) Drop-Shadow(0 0 10px #00ccff); transform: Scale(1.1); }
  100% { filter: none; transform: Scale(1); opacity: 1; }
}
</style>
