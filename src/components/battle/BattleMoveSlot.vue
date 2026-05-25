<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import MoveTooltip from '@/components/battle/MoveTooltip.vue'
import { PDEX_TYPE_COLORS } from '@/logic/pokedexConstants'
import { MOVE_DATA } from '@/data/moves'
import { getMechanicalWeather, WEATHER_MECHANICAL } from '@/logic/weather/weatherRegistry'
import { getDayCycle } from '@/logic/timeUtils'
import { useBattleStore } from '@/stores/battle'
import type { Pokemon, Move } from '@/types/pokemon'

interface Props {
  move: Move | null
  index: number
  isProcessing?: boolean
  playerInfo?: Pokemon | null
  canReorder?: boolean
  draggedIndex?: number | null
  dragOverIndex?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  isProcessing: false,
  playerInfo: null,
  canReorder: false,
  draggedIndex: null,
  dragOverIndex: null
})

const emit = defineEmits<{
  (e: 'use-move', index: number): void
}>()

const battleStore = useBattleStore()
const rootEl = ref<HTMLElement | null>(null)
let glowTween: gsap.core.Tween | null = null

const moveData = computed(() => {
  if (!props.move) return null
  const md = (MOVE_DATA as Record<string, { type?: string; power?: number; acc?: number; cat?: string }>)[props.move.name] || {}
  return {
    ...props.move,
    type: props.move.type || md.type || 'normal',
    power: props.move.power !== undefined ? props.move.power : md.power,
    acc: props.move.acc !== undefined ? props.move.acc : md.acc,
    cat: props.move.cat || md.cat || 'physical'
  }
})

const moveColor = computed(() => {
  if (!props.move) return '#444'
  const type = moveData.value ? moveData.value.type.toLowerCase() : 'normal'
  return (PDEX_TYPE_COLORS as Record<string, string>)[type] || '#444'
})

const hexColorRgb = computed(() => {
  const hex = moveColor.value
  if (!hex) return '255, 255, 255'
  let h = hex.replace('#', '')
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('')
  }
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r}, ${g}, ${b}`
})

const moveModifier = computed(() => {
  if (!props.move || !battleStore.isBattleActive) return null
  const md = moveData.value
  if (!md) return null
  
  const weather = battleStore.state?.weather?.type
  const mechWeather = getMechanicalWeather(weather)
  const cycle = getDayCycle()

  const isRaining = mechWeather === WEATHER_MECHANICAL.RAIN
  const isSunny = mechWeather === WEATHER_MECHANICAL.SUN
  const isSnowing = mechWeather === WEATHER_MECHANICAL.SNOW || mechWeather === WEATHER_MECHANICAL.HAIL
  const isDayTime = cycle === 'day' || cycle === 'morning'
  const isNightTime = cycle === 'night' || cycle === 'dusk'

  const isSunActive = isSunny || (mechWeather === WEATHER_MECHANICAL.CLEAR && isDayTime)
  const isRainActive = isRaining || (mechWeather === WEATHER_MECHANICAL.CLEAR && isNightTime)

  const moveName = (md.name || '').toLowerCase()

  // 1. Accuracy Boosted
  if (moveName === 'trueno' || moveName === 'thunder' || moveName === 'vendaval' || moveName === 'hurricane') {
    if (isSunny) return 'penalized'
    if (isRaining) return 'boosted'
  }
  
  if (moveName === 'ventisca' || moveName === 'blizzard') {
    if (isSnowing) return 'boosted'
  }

  // 2. Solar Moves
  if (moveName === 'rayo solar' || moveName === 'solar beam' || moveName === 'cuchilla solar' || moveName === 'solar blade') {
    if (mechWeather !== WEATHER_MECHANICAL.CLEAR && !isSunActive) return 'penalized'
    if (isSunActive) return 'boosted'
  }

  // 3. Weather Ball
  if (moveName === 'meteorobola' || moveName === 'weather ball') {
    if (mechWeather !== WEATHER_MECHANICAL.CLEAR) return 'boosted'
  }

  // 4. Accuracy Penalties (Fog)
  if (mechWeather === WEATHER_MECHANICAL.FOG) {
    return 'penalized'
  }

  if (md.cat === 'status') return null

  // 5. Elemental
  if (md.type === 'fire') {
    if (isRaining) return 'penalized'
    if (isSunActive) return 'boosted'
  }
  if (md.type === 'water') {
    if (isSunny) return 'penalized'
    if (isRainActive) return 'boosted'
  }
  
  return null
})

const isDisabled = computed(() => {
  if (props.isProcessing) return true
  if (!props.move || props.move.pp <= 0) return true
  
  // Choice Item Logic
  const p = props.playerInfo
  if (p && p.heldItem === 'Cinta Elegida') {
    const pk = p as Pokemon & { choiceMove?: string }
    if (pk.choiceMove && pk.choiceMove !== props.move.name) {
      return true
    }
  }
  return false
})

const updateGlow = () => {
  if (glowTween) {
    glowTween.kill()
    glowTween = null
  }

  const el = rootEl.value
  if (!el || !props.move) return

  const mod = moveModifier.value
  if (mod === 'boosted') {
    glowTween = gsap.to(el, {
      boxShadow: '0 0 22px Rgba(255, 215, 0, 0.9), inset 0 0 15px Rgba(255, 215, 0, 0.5)',
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    })
  } else if (mod === 'penalized') {
    glowTween = gsap.to(el, {
      boxShadow: '0 0 22px Rgba(255, 0, 0, 0.9), inset 0 0 15px Rgba(255, 0, 0, 0.5)',
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    })
  } else {
    // Reset shadow
    gsap.set(el, { clearProps: 'boxShadow' })
  }
}

const onHover = (isEntering: boolean) => {
  const el = rootEl.value
  if (!el || isDisabled.value) return

  if (isEntering) {
    gsap.to(el, { 
      scale: 1.08, 
      filter: 'Brightness(1.1)',
      zIndex: 10,
      duration: 0.3, 
      ease: 'power2.out' 
    })
  } else {
    gsap.to(el, { 
      scale: 1, 
      filter: 'Brightness(1)',
      zIndex: 1,
      duration: 0.3, 
      ease: 'power2.out',
      onComplete: () => {
        if (el) gsap.set(el, { clearProps: 'zIndex' })
      }
    })
  }
}

watch([() => props.move, moveModifier], () => {
  updateGlow()
})

onMounted(() => {
  updateGlow()
})

onUnmounted(() => {
  if (glowTween) glowTween.kill()
})
</script>

<template>
  <div
    ref="rootEl"
    class="move-slot-wrapper"
    :class="[
      index % 2 === 0 ? 'is-left' : 'is-right',
      { 
        'is-dragging': draggedIndex === index,
        'is-drag-over': dragOverIndex === index,
        'is-draggable': canReorder && move,
        'is-empty': !move,
        'is-boosted': move && moveModifier === 'boosted',
        'is-penalized': move && moveModifier === 'penalized',
        'is-disabled': move && isDisabled
      }
    ]"
    :style="{ 
      '--m-type-color': moveColor,
      '--m-type-rgb': hexColorRgb,
      background: move 
        ? `#12141c Linear-Gradient(${index % 2 === 0 ? '90deg' : '270deg'}, Rgba(${hexColorRgb}, 0.15) 0%, Transparent 100%)`
        : `#0a0c10`,
      borderColor: move && moveModifier === 'boosted' ? '$coin-gold' : 
        move && moveModifier === 'penalized' ? '#ff4444' :
        move ? `Rgba(${hexColorRgb}, 0.6)` : 
        'Rgba(255, 255, 255, 0.1)'
    }"
    @mouseenter="onHover(true)"
    @mouseleave="onHover(false)"
  >
    <!-- Info Zone with Tooltip -->
    <template v-if="move">
      <PVTooltip
        :title="move.name"
        :delay="400" 
        position="top"
        hide-on-click
        touch-instant
        class="info-tooltip-wrapper"
        :disabled="draggedIndex !== null"
      >
        <template #content>
          <MoveTooltip 
            v-if="moveData"
            :move="moveData as any" 
          />
        </template>
        
        <div 
          class="move-info-zone pixelated"
          @click.stop
        >
          ?
        </div>
      </PVTooltip>
    </template>
    <div
      v-else
      class="info-tooltip-wrapper is-empty-tab"
    />

    <button 
      class="move-card-vicio"
      :class="{ 
        'disabled-move': !canReorder && move && isDisabled,
        'is-draggable': canReorder && move,
        'is-empty': !move
      }"
      :disabled="!move || (!canReorder && isDisabled)"
      @click.stop="move && emit('use-move', index)"
    >
      <template v-if="move">
        <div class="move-top">
          <span class="mv-name pixelated">{{ move.name ? move.name.toUpperCase() : '???' }}</span>
          <PokemonTypeTag
            :type="moveData!.type || 'normal'"
            size="ssm"
          />
        </div>
        
        <div class="move-details-row">
          <div class="detail-item">
            <span class="d-label pixelated">POT:</span>
            <span class="d-val pixelated">{{ moveData!.power || '-' }}</span>
          </div>
          <div class="detail-item">
            <span class="d-label pixelated">PREC:</span>
            <span class="d-val pixelated">
              <span
                v-if="moveData!.acc === 1000"
                class="infinity-emoji"
              >♾️</span>
              <template v-else>{{ moveData!.acc || '-' }}</template>
            </span>
          </div>
          <div class="detail-item">
            <span class="d-label pixelated">CAT:</span>
            <span class="d-val pixelated">
              <span class="cat-full">{{ ({ physical: '⚔️ Físico', special: '✨ Especial', status: '🔮 Estado' } as Record<string, string>)[moveData!.cat] || '🔮 Estado' }}</span>
              <span class="cat-short">{{ ({ physical: '⚔️ FIS', special: '✨ ESP', status: '🔮 EST' } as Record<string, string>)[moveData!.cat] || '🔮 EST' }}</span>
            </span>
          </div>
          <div class="mv-pp-wrap">
            <span class="mv-pp-label pixelated">PP</span>
            <span class="mv-pp-val pixelated">{{ move.pp }}/{{ move.maxPP }}</span>
          </div>
        </div>
      </template>
      <div
        v-else
        class="empty-move-placeholder-wrap"
      >
        <PVTooltip
          position="top"
          :delay="300"
        >
          <template #content>
            <div class="empty-slot-hint">
              Puedes organizar y aprender nuevos movimientos desde la ficha de información del Pokémon.
            </div>
          </template>
          <div class="empty-move-placeholder pixelated">
            <span class="slot-num">SLOT {{ index + 1 }}</span>
            <span class="empty-text">- VACÍO -</span>
          </div>
        </PVTooltip>
      </div>
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
@use "@/styles/tokens/colors" as *;
@use "@/styles/components/pokemon-detail/_vicio-panes.scss";

// Re-expose component styles locally to preserve styles when rendered inside BattleMovesGrid
.move-slot-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  align-items: stretch;
  z-index: var(--z-base);
  border: 1px solid var(--m-type-color); 
  border-radius: 12px;
  overflow: hidden;
  box-sizing: border-box;
  min-height: 52px;
  user-select: none;
  filter: Brightness(1) Grayscale(0);
  will-change: filter, transform;

  &.is-dragging {
    opacity: 0.4;
    transform: Scale(0.95);
    border-style: dashed;
  }

  &.is-drag-over {
    border-color: var(--yellow) !important;
    background: Rgba(255, 214, 10, 0.1) !important;
    box-shadow: 0 0 20px Rgba(255, 214, 10, 0.2);
  }

  &:hover:not(.is-dragging):not(.is-disabled) {
    .move-info-zone {
      color: $white;
      text-shadow: 0 0 5px var(--m-type-color);
    }
  }

  &.is-disabled {
    will-change: transform, filter, opacity;
    filter: Grayscale(1);
    opacity: 0.6;
    cursor: not-allowed;
    
    .move-info-zone {
      pointer-events: none;
    }
  }

  &.is-right {
    padding-right: 16px;
    .info-tooltip-wrapper {
      right: 0;
      border-left: 1px solid Rgba(255, 255, 255, 0.1);
    }
    .move-card-vicio {
      padding-right: 4px !important;
    }
  }

  &.is-left {
    padding-left: 16px;
    .info-tooltip-wrapper {
      left: 0;
      border-right: 1px solid Rgba(255, 255, 255, 0.1);
    }
    .move-card-vicio {
      padding-left: 4px !important;
    }
  }

  .info-tooltip-wrapper {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 16px;
    display: flex;
    z-index: var(--z-base);

    @media (max-width: 420px) {
      width: 12px;
    }
  }

  .move-card-vicio {
    flex: 1;
    min-width: 0;
    width: 100% !important;
    max-width: none !important;
    min-height: 0 !important;
    z-index: calc(var(--z-base) + 2);
    height: 100%;
    margin: 0;
    background: none !important;
    border: none !important;
    box-shadow: none !important;
    transform: none !important;
  }

  &.is-boosted {
    border-color: $coin-gold !important;
  }

  &.is-penalized {
    border-color: #ff0000 !important;
  }

  &.is-empty {
    cursor: default;
    border-style: dotted;
    opacity: 0.6;
    
    &:hover {
      transform: none;
      box-shadow: none;
      will-change: transform, filter, opacity;
      filter: none;
    }
  }
}

.move-info-zone {
  width: 100%;
  height: 100%;
  background: none;
  color: Rgba(255, 255, 255, 0.6);
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: help;
  user-select: none;
  @include pixelated;

  @media (max-width: 420px) {
    font-size: 8px;
  }
}

.move-card-vicio {
  text-align: left; 
  width: 100%;
  height: 100%;
  margin: 0;
  user-select: none;

  &:disabled:not(.is-draggable) {
    cursor: not-allowed;
    
    &:hover {
      transform: none;
      box-shadow: none;
    }
  }
}

.empty-slot-hint {
  font-size: 9px;
  max-width: 160px;
  text-align: center;
  line-height: 1.4;
  color: Rgba(255, 255, 255, 0.9);
  padding: 4px;
}

.empty-move-placeholder-wrap {
  width: 100%;
  height: 100%;
  
  :deep(.pv-tooltip-wrapper) {
    width: 100%;
    height: 100%;
    display: flex;
  }
}

.empty-move-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  opacity: 0.4;
  gap: 4px;
  color: $white;

  .slot-num {
    font-size: 8px;
    letter-spacing: 1px;
    opacity: 0.7;
  }
  
  .empty-text {
    font-size: 10px;
    font-weight: 900;
  }
}
</style>
