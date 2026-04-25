<script setup>

const props = defineProps({
  moves: { type: Array, required: true },
  isProcessing: { type: Boolean, default: false },
  playerInfo: { type: Object, required: true }
})

const emit = defineEmits(['use-move'])

const TYPE_COLORS = {
  normal: 'Rgba(170, 170, 170, 1)', fire: 'Rgba(255, 107, 53, 1)', water: 'Rgba(59, 139, 255, 1)', grass: 'Rgba(107, 203, 119, 1)',
  electric: 'Rgba(255, 217, 61, 1)', ice: 'Rgba(125, 249, 255, 1)', fighting: 'Rgba(255, 59, 59, 1)', poison: 'Rgba(199, 125, 255, 1)',
  ground: 'Rgba(221, 187, 85, 1)', flying: 'Rgba(136, 153, 255, 1)', psychic: 'Rgba(255, 110, 255, 1)', bug: 'Rgba(139, 195, 74, 1)',
  rock: 'Rgba(187, 170, 102, 1)', ghost: 'Rgba(123, 47, 190, 1)', dragon: 'Rgba(92, 22, 197, 1)', dark: 'Rgba(119, 85, 68, 1)', steel: 'Rgba(170, 170, 187, 1)'
}

const CAT_ICON = { physical: '⚔️', special: '✨', status: '🔮' }

const getMoveColor = (moveName) => {
  const md = window.MOVE_DATA?.[moveName] || { type: 'normal' }
  return TYPE_COLORS[md.type] || '#aaa'
}

const getMoveType = (moveName) => {
  const md = window.MOVE_DATA?.[moveName] || { type: 'normal' }
  return md.type || '???'
}

const getMoveCatIcon = (moveName) => {
  const md = window.MOVE_DATA?.[moveName] || { cat: 'physical' }
  return CAT_ICON[md.cat] || ''
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

const showTooltip = (e, name) => { if (typeof window.showMoveTooltip === 'function') window.showMoveTooltip(e, name) }
const hideTooltip = () => { if (typeof window.hideMoveTooltip === 'function') window.hideMoveTooltip() }
</script>

<template>
  <div class="moves-grid">
    <button 
      v-for="(move, i) in moves" 
      :key="i"
      class="move-button-card"
      :style="{ '--move-color': getMoveColor(move.name) }"
      :disabled="isMoveDisabled(move)"
      @click.stop="emit('use-move', i)"
      @mouseenter="showTooltip($event, move.name)"
      @mouseleave="hideTooltip"
    >
      <div class="move-header">
        <span class="move-name-txt">{{ move.name }}</span>
      </div>
      <div class="move-footer">
        <span
          class="move-type-pill"
          :class="'type-' + getMoveType(move.name).toLowerCase()"
        >
          {{ getMoveType(move.name).toUpperCase() }}
        </span>
        <span class="move-pp-txt">{{ getMoveCatIcon(move.name) }} PP:{{ move.pp }}/{{ move.maxPP }}</span>
      </div>
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.moves-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.move-button-card {
  background: Rgba(30, 41, 59, 0.6);
  border: 1px solid Rgba(255,255,255,0.1);
  border-left: 5px solid var(--move-color);
  border-radius: 12px;
  padding: 15px;
  color: $white;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.move-button-card:hover:not(:disabled) {
  background: Rgba(30, 41, 59, 0.9);
  transform: translateY(-2px);
  border-color: var(--move-color);
}

.move-button-card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: Grayscale(0.8);
}

.move-name-txt {
  @include pixelated;
  font-size: 10px;
  display: block;
  margin-bottom: 10px;
}

.move-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.move-type-pill {
  font-size: 9px;
  font-weight: bold;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--move-color);
}

.move-pp-txt {
  font-size: 10px;
  opacity: 0.8;
}
</style>
