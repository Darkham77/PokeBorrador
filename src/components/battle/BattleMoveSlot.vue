<!-- [PureVue-Ignore-Length] -->
<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import MoveTooltip from '@/components/battle/MoveTooltip.vue'
import { PDEX_TYPE_COLORS } from '@/logic/constants/pokedexConstants'
import { useMoveSlotData } from '@/composables/battle/useMoveSlotData'
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

const isDisabled = computed(() => {
  if (props.isProcessing) return true
  if (!props.move) return true

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

  // Consultar directamente el request de Showdown para bloquear botones en la UI
  const playerRequest = battleStore.state?.playerRequest as ShowdownPlayerRequest | undefined;
  if (playerRequest && playerRequest.active?.[0]?.moves) {
    const reqMove = playerRequest.active[0].moves.find((rm: ShowdownMoveRequest) => rm.id === props.move?.id);
    if (!reqMove || reqMove.disabled) return true;
  }

  const p = props.playerInfo

  // A Pokémon locked into a multi-turn move (Thrash, Outrage, Petal Dance...)
  // must be able to click even at 0 PP — the engine handles it without deducting PP.
  const isLockedMove = !!(p?.volatileCounters?.['lockedmove'] && p.volatileCounters['lockedmove'] > 0)
  const isThrashLocked = !!(p?.thrashTurns && p.thrashTurns > 0)
  const isLocked = isLockedMove || isThrashLocked

  // Block 0-PP moves only when NOT locked (normal situation).
  if (!isLocked && props.move.pp <= 0) return true

  if (p) {
    // Choice Item Logic
    if (p.heldItem && (p.heldItem === 'choiceband' || p.heldItem === 'choicespecs' || p.heldItem === 'choicescarf')) {
      const pk = p as Pokemon & { choiceMove?: string }
      if (pk.choiceMove && pk.choiceMove !== props.move.id) {
        return true
      }
    }
    // Taunt
    if (p.tauntTurns && p.tauntTurns > 0 && props.move.cat === 'status') {
      return true
    }
    // Disabled Move
    if (p.disabledMove && props.move.id === p.disabledMove.id) {
      return true
    }
    // Encore
    if (p.encoreMove && props.move.id !== p.encoreMove.id) {
      return true
    }
    // Locked Move: only the forced move is clickable
    if (isLockedMove && p.lastMove && props.move.id !== p.lastMove.id) {
      return true
    }
    // Two-Turn charging Move (Fly, Dig, Dive, etc.)
    if (p.volatileCounters?.['twoturnmove'] && p.volatileCounters['twoturnmove'] > 0 && p.lastMove && props.move.id !== p.lastMove.id) {
      return true
    }

    // Last Resort (Última Baza) requirements check
    if (props.move.id === 'lastresort') {
      const allMoves = p.moves.filter((m): m is NonNullable<typeof m> => !!m && !!m.id)
      if (allMoves.length <= 1) {
        return true
      }
      const otherMoveIds = allMoves.filter(m => m.id !== 'lastresort' && !!m.id).map(m => m.id as string)
      const hasUnused = otherMoveIds.some(id => !battleStore.playerUsedMoves.includes(id))
      if (hasUnused) {
        return true
      }
    }
  }
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
        duration: 0.8,
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
        duration: 0.8,
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
      scale: isSmallScreen ? 1 : 1.08, 
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
            :type="moveData!.type || 'normal'"
            size="ssm"
          />
        </div>
        
        <div class="move-details-row">
          <div class="detail-item">
            <span class="d-label pixelated">POT:</span>
            <span 
              class="d-val pixelated"
              :class="{
                'stat-boosted': finalPower > (moveData!.power || 0),
                'stat-penalized': finalPower < (moveData!.power || 0)
              }"
            >
              {{ finalPower || '-' }}
              <span
                v-if="finalPower > (moveData!.power || 0)"
                class="arrow up"
              >▲</span>
              <span
                v-if="finalPower < (moveData!.power || 0)"
                class="arrow down"
              >▼</span>
            </span>
          </div>
          <div class="detail-item">
            <span class="d-label pixelated">PREC:</span>
            <span 
              class="d-val pixelated"
              :class="{
                'stat-boosted': moveData!.acc !== 1000 && finalAccuracy > (moveData!.acc || 0),
                'stat-penalized': moveData!.acc !== 1000 && finalAccuracy < (moveData!.acc || 0)
              }"
            >
              <span
                v-if="moveData!.acc === 1000"
                class="infinity-emoji"
              >♾️</span>
              <template v-else>
                {{ finalAccuracy || '-' }}
                <span
                  v-if="finalAccuracy > (moveData!.acc || 0)"
                  class="arrow up"
                >▲</span>
                <span
                  v-if="finalAccuracy < (moveData!.acc || 0)"
                  class="arrow down"
                >▼</span>
              </template>
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
            <span class="mv-pp-val pixelated">
              <span
                v-if="move.id === 'struggle'"
                class="infinity-emoji"
              >♾️</span>
              <template v-else>{{ move.pp }}/{{ move.maxPP }}</template>
            </span>
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

<style scoped lang="scss" src="@/styles/components/_battle-move-slot.scss"></style>
