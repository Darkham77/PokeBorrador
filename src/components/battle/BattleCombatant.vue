<script setup>
// [PureVue-Ignore-Length]
import { ref, computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import VirtualEntity from './VirtualEntity.vue'
import CombatShadow from './CombatShadow.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

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
  suppressFX: { type: Boolean, default: false }
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

const stickyCoords = computed(() => {
  return { top: props.groundY, left: '50%' }
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
      <!-- Sombra individual integrada -->
      <CombatShadow 
        v-if="shadowKey" 
        :shadow-id="shadowKey" 
        :style="{ '--shadow-y': groundY }"
      />

      <div
        class="sprite-rotation-layer"
        :class="[getAttackAnimClass, { 'is-floating-species': isFloating }]"
      >
        <div
          class="sprite-idle-wrapper"
          :class="[{ 
            'combatant-idle-subtle': !animState, 
            'is-floating-species': isFloating, 
            'energy-catching': animState === 'catching' || isFainting, 
            'energy-releasing': animState === 'releasing' 
          }]"
          :style="{ 
            animationDelay: `calc(${animSeed} * -3s)`, 
            '--idle-dist': isFloating ? '-12px' : '-3px', 
            '--shadow-y': groundY 
          }"
        >
          <PVSpriteFX
            :is-shiny="!isSilhouette && !suppressFX && pokemon.isShiny"
            :is-guardian="!isSilhouette && !suppressFX && pokemon.isGuardian"
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
            :style="{ '--tx': s.tx, '--ty': s.ty, 'animation-delay': s.delay }"
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
      filter: Brightness(0) Drop-Shadow(0 0 2px Rgba(255, 255, 255, 0.8)) !important; 
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

.sprite-idle-wrapper { width: 100%; height: 100%; display: flex; align-items: flex-end; justify-content: center; }
.combatant-idle-subtle { animation: combatant-idle-subtle 3s infinite ease-in-out !important; }

@keyframes combatant-idle-subtle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(var(--idle-dist, -6px)); } }
@keyframes attack-dash-player { 0% { transform: Translate(0, 0); } 25% { transform: Translate(50px, -50px); } 100% { transform: Translate(0, 0); } }
@keyframes attack-dash-enemy { 0% { transform: Translate(0, 0); } 25% { transform: Translate(-50px, 50px); } 100% { transform: Translate(0, 0); } }
@keyframes attack-pulse-player { 0% { transform: Scale(1); } 30% { transform: Scale(1.15) Translate(10px, -10px); filter: Brightness(1.3); } 100% { transform: Scale(1); } }
@keyframes attack-pulse-enemy { 0% { transform: Scale(1); } 30% { transform: Scale(1.15) Translate(-10px, 10px); filter: Brightness(1.3); } 100% { transform: Scale(1); } }
@keyframes attack-status-player { 0% { transform: Rotate(0deg); } 30% { transform: Rotate(10deg) Scale(1.1); } 100% { transform: Rotate(0deg); } }
@keyframes attack-status-enemy { 0% { transform: Rotate(0deg); } 30% { transform: Rotate(-10deg) Scale(1.1); } 100% { transform: Rotate(0deg); } }

@keyframes pokemon-faint {
  0%, 14%, 28%, 42%, 56%, 70% { opacity: 1; }
  7%, 21%, 35%, 49%, 63%, 77% { opacity: 0; }
  100% { opacity: 0; }
}

.trapped-pokeball {
  position: absolute;
  left: 50%;
  transform: translateX(-50%) translateY(-85%);
  width: calc(var(--obj-scale) * 40px);
  height: calc(var(--obj-scale) * 40px);
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
    font-size: calc(var(--obj-scale) * 12px);
    transform: Translate(-50%, -50%);
    animation: catch-sparkle-out 0.8s ease-out forwards;
    @include pixelated;
    text-shadow: 0 0 10px Rgba(255, 215, 0, 1), 0 0 20px Rgba(255, 255, 255, 0.8), 0 0 30px Rgba(255, 215, 0, 0.5);
    filter: Drop-Shadow(0 0 5px white);
  }
}

@keyframes catch-sparkle-out {
  0% { transform: Translate(-50%, -50%) Scale(0); opacity: 1; }
  20% { transform: Translate(-50%, -50%) Scale(2.5); opacity: 1; }
  100% { transform: Translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) Scale(1.2); opacity: 0; }
}

@keyframes pokeball-wobble {
  0%, 100% { transform: Rotate(0deg); }
  25% { transform: Rotate(-20deg); }
  75% { transform: Rotate(20deg); }
}

.guide-real-size {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: TranslateX(-50%);
  border: 1px dashed Rgba(255, 255, 255, 0.5);
  background: Rgba(255, 255, 255, 0.1);
  pointer-events: none;
  z-index: var(--z-hud);
  display: flex;
  align-items: center;
  justify-content: center;

  span {
    @include pixelated;
    font-size: 8px;
    color: white;
    background: black;
    padding: 2px;
    opacity: 0.8;
  }
}

.ball-fade-enter-active, .ball-fade-leave-active { transition: opacity 0.2s ease-in-out; }
.ball-fade-enter-from, .ball-fade-leave-to { opacity: 0; }
</style>
