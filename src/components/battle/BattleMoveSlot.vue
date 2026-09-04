<!-- [PureVue-Ignore-Length] -->
<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import MoveTooltip from '@/components/battle/MoveTooltip.vue'
import BattleMoveDetails from '@/components/battle/BattleMoveDetails.vue'
import { useMoveSlotData } from '@/composables/battle/useMoveSlotData'
import { toPokemonType } from '@/data/battle/types'
import { PDEX_TYPE_COLORS as TYPE_COLORS } from '@/logic/constants/pokedexConstants'
import { Z_LAYERS } from '@/logic/constants/visuals'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'

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

import { useBattleStore } from '@/stores/battle/battle'
import { isPokemonLocked } from '@/logic/pokemon/pokemonUtils'

const MOVE_TOOLTIP_DELAY_MS = 400;
const GLOW_PULSE_DURATION_SEC = 0.8;
const COLOR_HEX_SHORT_LENGTH = 3;
const HEX_BYTE_SLICE_TWO = 2;
const HEX_BYTE_SLICE_FOUR = 4;
const HEX_BYTE_SLICE_SIX = 6;
const HOVER_SCALED_MULT = 1.08;
import { SCALE_DEFAULT_BASE_FACTOR } from '@/logic/constants/visuals';
const HOVER_ANIM_DURATION_SEC = 0.3;
// Relative z-index within the moves grid local stacking context
const HOVER_Z_INDEX_ELEVATED = Z_LAYERS.BASE + 10; // no-magic: Explicit mathematical constant or threshold value
const HOVER_Z_INDEX_NORMAL = Z_LAYERS.BASE + 1;   // no-magic: Explicit mathematical constant or threshold value

const emit = defineEmits<{
  (e: 'use-move', index: number): void
}>()

const battleStore = useBattleStore()
const rootEl = ref<HTMLElement | null>(null)
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

const DEFAULT_WHITE_RGB = '255, 255, 255'

const hexColorRgb = computed(() => {
  const hex = moveColor.value
  if (!hex) return DEFAULT_WHITE_RGB
  let h = hex.replace('#', '')
  if (h.length === COLOR_HEX_SHORT_LENGTH) {
    h = h.split('').map((c: string) => c + c).join('')
  }
  const r = parseInt(h.slice(0, HEX_BYTE_SLICE_TWO), 16)
  const g = parseInt(h.slice(HEX_BYTE_SLICE_TWO, HEX_BYTE_SLICE_FOUR), 16)
  const b = parseInt(h.slice(HEX_BYTE_SLICE_FOUR, HEX_BYTE_SLICE_SIX), 16)
  return `${r}, ${g}, ${b}`
})

const isDisabled = computed(() => {
  if (props.isProcessing) return true
  if (!props.move) return true
  if (props.move.disabled === true) return true

  interface ShowdownMoveRequest {
    id: string;
    disabled?: boolean;
  }
  interface ShowdownActiveRequest {
    moves?: ShowdownMoveRequest[];
  }
  interface ShowdownPlayerRequest {
    active?: ShowdownActiveRequest[];
  }

  // 1. Prioridad Absoluta: Consultar el request de Showdown para bloquear botones en la UI
  const playerRequest = battleStore.state?.playerRequest as ShowdownPlayerRequest | undefined;
  if (playerRequest && playerRequest.active?.[0]?.moves) {
    const reqMoves = playerRequest.active[0].moves;
    if (reqMoves.length > 0) {
      const reqMove = reqMoves.find((rm: ShowdownMoveRequest) => rm.id === props.move?.id);
      if (reqMove) {
        return !!reqMove.disabled;
      }
      // Si Showdown restringió los movimientos permitidos (lockedmove, recharge, encore),
      // cualquier movimiento no listado por Showdown debe bloquearse en gris en la UI.
      return true;
    }
  }

  // 2. Validaciones locales de estado:
  const p = props.playerInfo

  // 2.1 Si el Pokémon está en estado bloqueado (lockedmove, twoturnmove, thrash), bloquear cualquier otro movimiento
  const isLocked = isPokemonLocked(p);
  if (isLocked && p?.lastMove) {
    if (props.move.id !== p.lastMove.id) {
      return true;
    }
  }

  // 2.2 Validación de Choice Items (Choice Band, Specs, Scarf)
  const isChoiceItem = p?.heldItem && ['choiceband', 'choicespecs', 'choicescarf'].includes(p.heldItem.toLowerCase());
  if (isChoiceItem && p?.choiceMove) {
    const choiceLower = p.choiceMove.toLowerCase();
    const moveNameLower = (props.move?.name || '').toLowerCase();
    const moveIdLower = (props.move?.id || '').toLowerCase();
    if (moveNameLower !== choiceLower && moveIdLower !== choiceLower) {
      return true;
    }
  }

  if (props.move.id !== 'struggle' && props.move.pp <= 0) return true

  return false
})

const weatherAuraClass = computed(() => {
  if (!props.move || !moveModifier.value) return null
  const weather = battleStore.state?.weather
  if (!weather || weather.turns === 0) return null
  const wType = (weather.visual || weather.type || '').toLowerCase()
  
  if (wType.includes('rain') || wType.includes('storm') || wType.includes('lluvia')) {
    return 'weather-rain'
  }
  if (wType.includes('sun') || wType.includes('heatwave') || wType.includes('sol')) {
    return 'weather-sun'
  }
  if (wType.includes('thunder') || wType.includes('tormenta')) {
    return 'weather-thunderstorm'
  }
  if (wType.includes('hail') || wType.includes('snow') || wType.includes('granizo') || wType.includes('nieve')) {
    return 'weather-hail-snow'
  }
  if (wType.includes('fog') || wType.includes('mist') || wType.includes('niebla') || wType.includes('neblina')) {
    return 'weather-fog'
  }
  return null
})

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
      zIndex: HOVER_Z_INDEX_ELEVATED,
      duration: HOVER_ANIM_DURATION_SEC, 
      ease: 'power2.out' 
    })
  } else {
    gsap.to(el, { 
      scale: SCALE_DEFAULT_BASE_FACTOR, 
      filter: 'Brightness(1)',
      zIndex: HOVER_Z_INDEX_NORMAL,
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

const formatMoveName = (name: string) => {
  return name.toUpperCase()
    .replace(/Ñ/g, 'ñ')
    .replace(/Á/g, 'á')
    .replace(/É/g, 'é')
    .replace(/Í/g, 'í')
    .replace(/Ó/g, 'ó')
    .replace(/Ú/g, 'ú')
}
</script>

<template>
  <div
    :id="'move-btn-wrapper-' + index"
    ref="rootEl"
    class="move-slot-wrapper"
    :class="[
      index % 2 === 0 ? 'is-left' : 'is-right',
      weatherAuraClass,
      { 
        'is-dragging': draggedIndex === index,
        'is-drag-over': dragOverIndex === index,
        'is-draggable': canReorder && move,
        'is-empty': !move,
        'is-disabled': move && isDisabled
      }
    ]"
    :style="{ 
      '--m-type-color': moveColor,
      '--m-type-rgb': hexColorRgb,
      background: move 
        ? `#12141c Linear-Gradient(${index % 2 === 0 ? '90deg' : '270deg'}, Rgba(${hexColorRgb}, 0.15) 0%, Transparent 100%)`
        : `#0a0c10`,
      borderColor: move ? `Rgba(${hexColorRgb}, 0.6)` : 'Rgba(255, 255, 255, 0.1)'
    }"
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
    <template v-if="move">
      <PVTooltip
        :title="move.name"
        :delay="MOVE_TOOLTIP_DELAY_MS" 
        position="top"
        hide-on-click
        touch-instant
        class="info-tooltip-wrapper"
        :disabled="draggedIndex !== null"
      >
        <template #content>
          <MoveTooltip 
            v-if="moveData"
            :move="moveData as Move" 
            :player-info="props.playerInfo"
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
      :id="'move-btn-' + index"
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

<style scoped lang="scss" src="@/styles/components/_battle-move-slot.scss"></style>
