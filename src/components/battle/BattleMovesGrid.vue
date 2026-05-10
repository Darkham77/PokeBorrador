<script setup lang="ts">
import { ref, computed } from 'vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import MoveTooltip from '@/components/battle/MoveTooltip.vue'
import { PDEX_TYPE_COLORS } from '@/logic/pokedexConstants'
import { MOVE_DATA } from '@/data/moves'
import { getMechanicalWeather, WEATHER_MECHANICAL } from '@/logic/battle/weatherMapper'
import { getDayCycle } from '@/logic/timeUtils'
import { useBattleStore } from '@/stores/battle'

import type { Pokemon, Move } from '@/types/pokemon'

interface Props {
  moves: ( Move | null )[]
  isProcessing?: boolean
  playerInfo?: Pokemon | null
  canReorder?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isProcessing: false,
  playerInfo: null,
  canReorder: false
})

const emit = defineEmits<{
  (e: 'use-move', index: number): void
  (e: 'reorder-moves', fromIndex: number, toIndex: number): void
}>()

const battleStore = useBattleStore()

// Grid Stability: Always 4 slots
const fullMoves = computed(() => {
  const result = [...props.moves]
  while (result.length < 4) {
    result.push(null)
  }
  return result
})

// Drag and Drop Logic (Modular)
const draggedIndex = ref<number | null>(null)
const isDragging = ref(false)
const dragOverIndex = ref<number | null>(null)

const onDragStart = (index: number, e: DragEvent) => {
  if (!props.canReorder || !fullMoves.value[index]) return
  draggedIndex.value = index
  isDragging.value = true
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
  }
}

const onDragOver = (index: number, e: DragEvent) => {
  if (!props.canReorder) return
  e.preventDefault()
  dragOverIndex.value = index
}

const onDrop = (targetIndex: number, e: DragEvent) => {
  if (!props.canReorder) return
  e.preventDefault()
  if (draggedIndex.value !== null && draggedIndex.value !== targetIndex) {
    emit('reorder-moves', draggedIndex.value, targetIndex)
  }
  onDragEnd()
}

const onDragEnd = () => {
  isDragging.value = false
  draggedIndex.value = null
  dragOverIndex.value = null
}

const getMoveData = (move: Move | null) => {
  if (!move) return null
  const md = (MOVE_DATA as Record<string, { type?: string; power?: number; acc?: number; cat?: string }>)[move.name] || {}
  return {
    ...move,
    type: move.type || md.type || 'normal',
    power: move.power !== undefined ? move.power : md.power,
    acc: move.acc !== undefined ? move.acc : md.acc,
    cat: move.cat || md.cat || 'physical'
  }
}

const hexToRgb = (hex: string) => {
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

const getMoveModifier = (move: Move | null) => {
  if (!move || !battleStore.isBattleActive) return null
  const md = getMoveData(move)
  if (!md) return null
  
  const weather = battleStore.state?.weather?.type
  const mechWeather = getMechanicalWeather(weather)
  const cycle = getDayCycle()

  const isRaining = mechWeather === WEATHER_MECHANICAL.RAIN
  const isSunny = mechWeather === WEATHER_MECHANICAL.SUN
  const isDayTime = cycle === 'day' || cycle === 'morning'
  const isNightTime = cycle === 'night' || cycle === 'dusk'

  const isSunActive = isSunny || (mechWeather === WEATHER_MECHANICAL.CLEAR && isDayTime)
  const isRainActive = isRaining || (mechWeather === WEATHER_MECHANICAL.CLEAR && isNightTime)

  const moveName = (md.name || '').toLowerCase()

  // Trueno (Thunder) and Vendaval (Hurricane) are always boosted in Rain, penalized in Sun
  if (moveName === 'trueno' || moveName === 'thunder' || moveName === 'vendaval' || moveName === 'hurricane') {
    if (isSunny) return 'penalized'
    if (isRaining) return 'boosted'
    return null
  }

  // Rayo Solar (Solar Beam) and Cuchilla Solar (Solar Blade)
  if (moveName === 'rayo solar' || moveName === 'solar beam' || moveName === 'cuchilla solar' || moveName === 'solar blade') {
    if (mechWeather !== WEATHER_MECHANICAL.CLEAR && !isSunActive) return 'penalized'
    if (isSunActive) return 'boosted'
  }

  // Meteorobola (Weather Ball)
  if (moveName === 'meteorobola' || moveName === 'weather ball') {
    if (mechWeather !== WEATHER_MECHANICAL.CLEAR) return 'boosted'
  }

  // Status moves don't get weather/cycle damage multipliers (except explicit ones above)
  if (md.cat === 'status') return null

  if (md.type === 'fire') {
    if (mechWeather === WEATHER_MECHANICAL.RAIN) return 'penalized'
    if (isSunActive) return 'boosted'
  }
  if (md.type === 'water') {
    if (mechWeather === WEATHER_MECHANICAL.SUN) return 'penalized'
    if (isRainActive) return 'boosted'
  }
  
  return null
}

const isMoveDisabled = (move: Move | null) => {
  if (props.isProcessing) return true
  if (!move || move.pp <= 0) return true
  
  // Choice Item Logic
  const p = props.playerInfo
  if (p && p.heldItem === 'Cinta Elegida') {
    const pk = p as Pokemon & { choiceMove?: string }
    if (pk.choiceMove && pk.choiceMove !== move.name) {
      return true
    }
  }
  return false
}

const getMoveColor = (move: Move | null) => {
  if (!move) return '#444'
  const md = getMoveData(move)
  const type = md ? md.type.toLowerCase() : 'normal'
  return (PDEX_TYPE_COLORS as Record<string, string>)[type] || '#444'
}
</script>

<template>
  <div 
    class="moves-grid-vicio"
    :class="{ 'is-reordering': isDragging }"
  >
    <div
      v-for="(move, i) in fullMoves" 
      :key="i"
      class="move-slot-wrapper"
      :class="[
        i % 2 === 0 ? 'is-left' : 'is-right',
        { 
          'is-dragging': draggedIndex === i,
          'is-drag-over': dragOverIndex === i,
          'is-draggable': canReorder && move,
          'is-empty': !move,
          'is-boosted': move && getMoveModifier(move) === 'boosted',
          'is-penalized': move && getMoveModifier(move) === 'penalized',
          'is-disabled': move && isMoveDisabled(move)
        }
      ]"
      :style="{ 
        '--m-type-color': getMoveColor(move),
        '--m-type-rgb': hexToRgb(getMoveColor(move)),
        background: move 
          ? `Linear-Gradient(${i % 2 === 0 ? '90deg' : '270deg'}, Rgba(${hexToRgb(getMoveColor(move))}, 0.25) 0%, Rgba(255, 255, 255, 0.05) 100%)`
          : `Linear-Gradient(${i % 2 === 0 ? '90deg' : '270deg'}, Rgba(50, 50, 50, 0.2) 0%, Rgba(0, 0, 0, 0.1) 100%)`,
        borderColor: move && getMoveModifier(move) === 'boosted' ? '$coin-gold' : 
          move && getMoveModifier(move) === 'penalized' ? '#ff4444' :
          move ? `Rgba(${hexToRgb(getMoveColor(move))}, 0.7)` : 
          'Rgba(255, 255, 255, 0.1)'
      }"
      :draggable="canReorder && !!move"
      @dragstart="onDragStart(i, $event)"
      @dragover="onDragOver(i, $event)"
      @dragleave="dragOverIndex = null"
      @drop="onDrop(i, $event)"
      @dragend="onDragEnd"
    >
      <!-- Info Zone with Tooltip -->
      <template v-if="move">
        <PVTooltip
          :title="move.name"
          :delay="400" 
          position="top"
          hide-on-click
          class="info-tooltip-wrapper"
          :disabled="isDragging"
        >
          <template #content>
            <MoveTooltip 
              v-if="getMoveData(move)"
              :move="getMoveData(move) as any" 
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
          'disabled-move': !canReorder && move && isMoveDisabled(move),
          'is-draggable': canReorder && move,
          'is-empty': !move
        }"
        :disabled="!move || (!canReorder && isMoveDisabled(move))"
        @click.stop="move && emit('use-move', i)"
      >
        <template v-if="move">
          <div class="move-top">
            <span class="mv-name pixelated">{{ (move && move.name) ? move.name.toUpperCase() : '???' }}</span>
            <span
              class="mv-type-tag pixelated"
              :style="{ background: PDEX_TYPE_COLORS[getMoveData(move)!.type.toLowerCase() || 'normal'] }"
            >
              {{ (getMoveData(move)!.type || 'normal').toUpperCase() }}
            </span>
          </div>
          
          <div class="move-details-row">
            <div class="detail-item">
              <span class="d-label pixelated">POT:</span>
              <span class="d-val pixelated">{{ getMoveData(move)!.power || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="d-label pixelated">PREC:</span>
              <span class="d-val pixelated">
                <span
                  v-if="getMoveData(move)!.acc === 1000"
                  class="infinity-emoji"
                >♾️</span>
                <template v-else>{{ getMoveData(move)!.acc || '-' }}</template>
              </span>
            </div>
            <div class="detail-item">
              <span class="d-label pixelated">CAT:</span>
              <span class="d-val pixelated">
                <span class="cat-full">{{ ({ physical: '⚔️ Físico', special: '✨ Especial', status: '🔮 Estado' } as Record<string, string>)[getMoveData(move)!.cat] || '🔮 Estado' }}</span>
                <span class="cat-short">{{ ({ physical: '⚔️ FIS', special: '✨ ESP', status: '🔮 EST' } as Record<string, string>)[getMoveData(move)!.cat] || '🔮 EST' }}</span>
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
              <span class="slot-num">SLOT {{ i + 1 }}</span>
              <span class="empty-text">- VACÍO -</span>
            </div>
          </PVTooltip>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
@use "@/styles/tokens/colors" as *;
@use "@/styles/components/pokemon-detail/_vicio-panes.scss";

.moves-grid-vicio {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: 1fr;
  gap: var(--move-panel-gap, 12px);
}

// Estos estilos ya viven en _vicio-panes.scss pero mantenemos la modularidad
.move-slot-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  align-items: stretch;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, border-color 0.3s ease, opacity 0.3s ease;
  z-index: var(--z-base);
  border: 1px solid var(--m-type-color); 
  border-radius: 12px;
  overflow: hidden;
  box-sizing: border-box;
  min-height: 56px;
  user-select: none;

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
    z-index: var(--z-low);
    transform: Scale(1.08);
    box-shadow: 0 8px 24px Rgba(0, 0, 0, 0.5);
    will-change: transform, filter, opacity;
  filter: Brightness(1.1);

    @media (max-width: 420px) {
      transform: Scale(1.02);
    }

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
      padding-right: 4px !important; // Ajuste para eliminar espacio muerto
    }
  }

  &.is-left {
    padding-left: 16px;
    .info-tooltip-wrapper {
      left: 0;
      border-right: 1px solid Rgba(255, 255, 255, 0.1);
    }
    .move-card-vicio {
      padding-left: 4px !important; // Ajuste para eliminar espacio muerto
    }
  }

  .info-tooltip-wrapper {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 16px;
    display: flex;
    z-index: var(--z-base);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);

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
    transition: all 0.3s ease;
  }

  &.is-boosted {
    border-color: $coin-gold !important;
    box-shadow: 0 0 15px Rgba(255, 215, 0, 0.4);
    animation: move-glow 2s infinite alternate;
  }

  &.is-penalized {
    border-color: #ff0000 !important;
    box-shadow: 0 0 12px Rgba(255, 0, 0, 0.5);
    animation: penalty-glow 2s infinite alternate;
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
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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
@keyframes move-glow { from { box-shadow: 0 0 8px Rgba(255, 215, 0, 0.4), inset 0 0 5px Rgba(255, 215, 0, 0.2); } to { box-shadow: 0 0 22px Rgba(255, 215, 0, 0.9), inset 0 0 15px Rgba(255, 215, 0, 0.5); } }
@keyframes penalty-glow { from { box-shadow: 0 0 8px Rgba(255, 0, 0, 0.4), inset 0 0 5px Rgba(255, 0, 0, 0.2); } to { box-shadow: 0 0 22px Rgba(255, 0, 0, 0.9), inset 0 0 15px Rgba(255, 0, 0, 0.5); } }

</style>
