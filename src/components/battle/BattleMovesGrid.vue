<script setup>
import { computed } from 'vue'

const props = defineProps({
  moves: { type: Array, required: true },
  isProcessing: { type: Boolean, default: false },
  playerInfo: { type: Object, required: true }
})

const emit = defineEmits(['use-move'])

const TYPE_COLORS = {
  normal: '#aaa', fire: '#FF6B35', water: '#3B8BFF', grass: '#6BCB77',
  electric: '#FFD93D', ice: '#7DF9FF', fighting: '#FF3B3B', poison: '#C77DFF',
  ground: '#c8a060', flying: '#89CFF0', psychic: '#FF6EFF', bug: '#8BC34A',
  rock: '#c8a060', ghost: '#7B2FBE', dragon: '#5C16C5', dark: '#555', steel: '#9E9E9E'
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
      @click="emit('use-move', i)"
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

<style scoped>
.moves-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.move-button-card {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255,255,255,0.1);
  border-left: 5px solid var(--move-color);
  border-radius: 12px;
  padding: 15px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.move-button-card:hover:not(:disabled) {
  background: rgba(30, 41, 59, 0.9);
  transform: translateY(-2px);
  border-color: var(--move-color);
}

.move-button-card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.8);
}

.move-name-txt {
  font-family: 'Press Start 2P', monospace;
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
