<script setup lang="ts">
import { computed, onMounted, watch, onUnmounted, useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import BattleMoveInfoZone from '@/components/battle/BattleMoveInfoZone.vue'
import BattleMoveDetails from '@/components/battle/BattleMoveDetails.vue'
import BattleMoveEmptySlot from '@/components/battle/BattleMoveEmptySlot.vue'
import { useMoveSlotData } from '@/composables/battle/useMoveSlotData'
import { toPokemonType } from '@/data/battle/types'
import { PDEX_TYPE_COLORS as TYPE_COLORS } from '@/logic/constants/pokedexConstants'
import { Z_LAYERS, SCALE_DEFAULT_BASE_FACTOR } from '@/logic/constants/visuals'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import { useBattleStore } from '@/stores/battle/battle'
import {
  type ShowdownPlayerRequest,
  isBattleMoveDisabled,
  resolveWeatherAuraClass,
  formatMoveName,
  hexToRgbString
} from './battleMoveSlotHelpers.ts'

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

const GLOW_PULSE_DURATION_SEC = 0.8;
const HOVER_SCALED_MULT = 1.08;
const HOVER_ANIM_DURATION_SEC = 0.3;
// Relative layer offset within the moves grid local stacking context
const HOVER_OFFSET_ELEVATED = 10;
const HOVER_OFFSET_NORMAL = 1;
const HOVER_LAYER_ELEVATED = Z_LAYERS.BASE + HOVER_OFFSET_ELEVATED;
const HOVER_LAYER_NORMAL = Z_LAYERS.BASE + HOVER_OFFSET_NORMAL;

const emit = defineEmits<{
  (e: 'use-move', index: number): void
}>()

const battleStore = useBattleStore()
const rootEl = useTemplateRef<HTMLElement>('rootEl')
let glowTween: gsap.core.Tween | null = null

const { moveData, finalPower, finalAccuracy, moveModifier, effectivenessMultiplier } = useMoveSlotData(
  () => props.move,
  () => props.playerInfo
)

const moveColor = computed(() => {
  if (!props.move) return '#444'
  return (TYPE_COLORS?.[moveType.value]) || '#444'
})

const moveType = computed(() => toPokemonType(moveData.value?.type || 'normal'))

const hexColorRgb = computed(() => hexToRgbString(moveColor.value))

const isDisabled = computed(() => isBattleMoveDisabled(
  props.move,
  props.isProcessing,
  props.playerInfo,
  battleStore.state?.playerRequest as ShowdownPlayerRequest | undefined
))

const weatherAuraClass = computed(() => resolveWeatherAuraClass(
  Boolean(props.move),
  Boolean(moveModifier.value),
  battleStore.state?.weather
))

const updateGlow = () => {
  if (glowTween) {
    glowTween.kill()
    glowTween = null
  }

  const el = rootEl.value
  if (!el) return

  if (!props.move) {
    gsap.set(el, { clearProps: 'boxShadow,borderColor' })
    return
  }

  const eff = effectivenessMultiplier.value
  const isStatus = moveData.value?.cat === 'status'

  // Determine glow state:
  // - Gold border pulse for super effective (eff > 1) on damage moves
  // - Red border pulse for immune (eff === 0) or resisted (eff < 1)
  // - Neutral (eff === 1) resets
  let glowType: 'gold' | 'red' | null = null
  if (isStatus) {
    if (eff === 0) glowType = 'red' // Inmune al tipo del movimiento de estado
  } else {
    if (eff > 1) glowType = 'gold'
    else if (eff < 1) glowType = 'red'
  }

  if (glowType === 'gold') {
    glowTween = gsap.fromTo(el,
      { 
        boxShadow: '0 0 4px rgba(255, 215, 0, 0.4)',
        borderColor: 'rgba(255, 215, 0, 0.6)'
      },
      {
        boxShadow: '0 0 16px rgba(255, 215, 0, 0.95)',
        borderColor: 'rgba(255, 215, 0, 1)',
        duration: GLOW_PULSE_DURATION_SEC,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      }
    )
  } else if (glowType === 'red') {
    glowTween = gsap.fromTo(el,
      { 
        boxShadow: '0 0 4px rgba(239, 68, 68, 0.4)',
        borderColor: 'rgba(239, 68, 68, 0.6)'
      },
      {
        boxShadow: '0 0 16px rgba(239, 68, 68, 0.95)',
        borderColor: 'rgba(239, 68, 68, 1)',
        duration: GLOW_PULSE_DURATION_SEC,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      }
    )
  } else {
    gsap.set(el, { clearProps: 'boxShadow,borderColor' })
  }
}

const onHover = (isEntering: boolean) => {
  const el = rootEl.value
  if (!el || isDisabled.value) return

  if (isEntering) {
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth <= 768
    gsap.to(el, { 
      scale: isSmallScreen ? SCALE_DEFAULT_BASE_FACTOR : HOVER_SCALED_MULT, 
      filter: 'Brightness(1.1)',
      zIndex: HOVER_LAYER_ELEVATED,
      duration: HOVER_ANIM_DURATION_SEC, 
      ease: 'power2.out' 
    })
  } else {
    gsap.to(el, { 
      scale: SCALE_DEFAULT_BASE_FACTOR, 
      filter: 'Brightness(1)',
      zIndex: HOVER_LAYER_NORMAL,
      duration: HOVER_ANIM_DURATION_SEC, 
      ease: 'power2.out',
      onComplete: () => {
        if (el) gsap.set(el, { clearProps: 'zIndex' })
      }
    })
  }
}

watch([() => props.move, moveModifier, effectivenessMultiplier], () => {
  updateGlow()
})

onMounted(() => {
  updateGlow()
})

onUnmounted(() => {
  if (glowTween) glowTween.kill()
})

const slotWrapperClass = computed(() => [
  props.index % 2 === 0 ? 'is-left' : 'is-right',
  weatherAuraClass.value,
  { 
    'is-dragging': props.draggedIndex === props.index,
    'is-drag-over': props.dragOverIndex === props.index,
    'is-draggable': props.canReorder && !!props.move,
    'is-empty': !props.move,
    'is-disabled': !!props.move && isDisabled.value
  }
])

const slotWrapperStyle = computed(() => {
  const gradientDir = props.index % 2 === 0 ? '90deg' : '270deg'
  return { 
    '--m-type-color': moveColor.value,
    '--m-type-rgb': hexColorRgb.value,
    background: props.move 
      ? `#12141c Linear-Gradient(${gradientDir}, Rgba(${hexColorRgb.value}, 0.15) 0%, Transparent 100%)`
      : '#0a0c10',
    borderColor: props.move ? `Rgba(${hexColorRgb.value}, 0.6)` : 'Rgba(255, 255, 255, 0.1)'
  }
})

const buttonClass = computed(() => ({ 
  'disabled-move': !props.canReorder && !!props.move && isDisabled.value,
  'is-draggable': props.canReorder && !!props.move,
  'is-empty': !props.move
}))

const isButtonDisabled = computed(() => !props.move || (!props.canReorder && isDisabled.value))
</script>

<template>
  <div
    :id="'move-btn-wrapper-' + index"
    ref="rootEl"
    class="move-slot-wrapper"
    :class="slotWrapperClass"
    :style="slotWrapperStyle"
    @mouseenter="onHover(true)"
    @mouseleave="onHover(false)"
  >
    <!-- Weather Aura layer to prevent GSAP boxShadow overrides -->
    <div
      v-if="move && weatherAuraClass"
      class="weather-aura-overlay"
      :class="weatherAuraClass"
    />

    <!-- Info Zone with Tooltip -->
    <BattleMoveInfoZone
      :move="move"
      :move-data="moveData as Move"
      :player-info="props.playerInfo"
      :is-dragging="draggedIndex !== null"
    />

    <button 
      :id="'move-btn-' + index"
      class="move-card-vicio"
      :class="buttonClass"
      :disabled="isButtonDisabled"
      @click.stop="move && emit('use-move', index)"
    >
      <template v-if="move">
        <div class="move-top">
          <span class="mv-name pixelated">{{ move.name ? formatMoveName(move.name) : '???' }}</span>
          <PokemonTypeTag
            :type="moveType"
            size="ssm"
          />
        </div>
        
        <BattleMoveDetails
          :move="move"
          :move-data="moveData as Move"
          :final-power="finalPower"
          :final-accuracy="finalAccuracy"
        />
      </template>
      <BattleMoveEmptySlot
        v-else
        :index="index"
      />
    </button>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_battle-move-slot.scss"></style>
