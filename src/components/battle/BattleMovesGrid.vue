<script setup>
import PVTooltip from '@/components/common/PVTooltip.vue'
import MoveTooltip from '@/components/battle/MoveTooltip.vue'
import { PDEX_TYPE_COLORS } from '@/logic/pokedexConstants'
import { MOVE_DATA } from '@/data/moves'

const props = defineProps({
  moves: { type: Array, required: true },
  isProcessing: { type: Boolean, default: false },
  playerInfo: { type: Object, required: true },
  canReorder: { type: Boolean, default: false }
})

const emit = defineEmits(['use-move'])

const getMoveData = (move) => {
  const md = MOVE_DATA[move.name] || {}
  return {
    ...move,
    type: md.type || 'normal',
    power: md.power,
    acc: md.acc,
    cat: md.cat || 'physical'
  }
}

const hexToRgb = (hex) => {
  if (!hex) return '255, 255, 255'
  let h = hex.replace('#', '')
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('')
  }
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

const isMoveDisabled = (move) => {
  if (props.isProcessing) return true
  if (!move || move.pp <= 0) return true
  
  // Choice Item Logic
  const p = props.playerInfo
  if (p.heldItem === 'Cinta Elegida' && p.choiceMove && p.choiceMove !== move.name) {
    return true
  }
  return false
}


</script>

<template>
  <div class="moves-grid-vicio">
    <PVTooltip
      v-for="(move, i) in moves" 
      :key="i"
      :delay="400" 
      position="top"
      hide-on-click
    >
      <template #content>
        <MoveTooltip :move="getMoveData(move)" />
      </template>

      <button 
        class="move-card-vicio"
        :class="{ 
          'disabled-move': isMoveDisabled(move),
          'is-draggable': canReorder 
        }"
        :draggable="canReorder"
        :style="{ 
          '--m-type-color': PDEX_TYPE_COLORS[getMoveData(move).type.toLowerCase() || 'normal'],
          '--m-type-rgb': hexToRgb(PDEX_TYPE_COLORS[getMoveData(move).type.toLowerCase() || 'normal']),
          background: `Linear-Gradient(135deg, Rgba(${hexToRgb(PDEX_TYPE_COLORS[getMoveData(move).type.toLowerCase() || 'normal'])}, 0.25) 0%, Rgba(255, 255, 255, 0.05) 100%)`,
          borderColor: `Rgba(${hexToRgb(PDEX_TYPE_COLORS[getMoveData(move).type.toLowerCase() || 'normal'])}, 0.7)`
        }"
        :disabled="isMoveDisabled(move)"
        @click.stop="emit('use-move', i)"
      >
        <div class="move-top">
          <span class="m-name pixelated">{{ (move && move.name) ? move.name.toUpperCase() : '???' }}</span>
          <span
            class="m-type-tag pixelated"
            :style="{ background: PDEX_TYPE_COLORS[getMoveData(move).type.toLowerCase() || 'normal'] }"
          >
            {{ (getMoveData(move).type || 'normal').toUpperCase() }}
          </span>
        </div>
        
        <div class="move-details-row">
          <div class="detail-item">
            <span class="d-label pixelated">POT:</span>
            <span class="d-val pixelated">{{ getMoveData(move).power || '-' }}</span>
          </div>
          <div class="detail-item">
            <span class="d-label pixelated">PREC:</span>
            <span class="d-val pixelated">
              <span
                v-if="getMoveData(move).acc === 1000"
                class="infinity-emoji"
              >♾️</span>
              <template v-else>{{ getMoveData(move).acc || '-' }}</template>
            </span>
          </div>
          <div class="detail-item">
            <span class="d-label pixelated">CAT:</span>
            <span class="d-val pixelated">
              {{ { physical: '⚔️ Físico', special: '✨ Especial', status: '🔮 Estado' }[getMoveData(move).cat] || '🔮 Estado' }}
            </span>
          </div>
          <div class="m-pp-wrap">
            <span class="m-pp-label pixelated">PP</span>
            <span class="m-pp-val pixelated">{{ move.pp }}/{{ move.maxPP }}</span>
          </div>
        </div>
      </button>
    </PVTooltip>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
@use "@/styles/tokens/colors" as *;
@use "@/styles/components/pokemon-detail/_vicio-panes.scss";

.move-card-vicio {
  text-align: left; 
  width: 100%;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: Grayscale(1);
    
    &:hover {
      transform: none;
      box-shadow: none;
    }
  }
}

/* Fix for Tooltip wrapper not expanding in grid */
:deep(.pv-tooltip-wrapper) {
  width: 100%;
  height: 100%;
  display: block;
}
.move-card-vicio {
  height: 100%;
}
</style>
