<script setup>
import { ref } from 'vue'
import { useUIStore } from '@/stores/ui'
import PVTooltip from '@/components/common/PVTooltip.vue'
import MoveTooltip from '@/components/battle/MoveTooltip.vue'
import { PDEX_TYPE_COLORS } from '@/logic/pokedexConstants'

const _props = defineProps({
  isInstance: { type: Boolean, default: false },
  currentMoves: { type: Array, default: () => [] },
  moveDetails: { type: Array, required: true },
  canReorder: { type: Boolean, default: true }
})

const emit = defineEmits(['reorder-moves'])

const _uiStore = useUIStore()

// Drag and Drop Logic
const draggedIndex = ref(null)
const isDragging = ref(false)
const dragOverIndex = ref(null)

function onDragStart(index, e) {
  draggedIndex.value = index
  isDragging.value = true
  e.dataTransfer.effectAllowed = 'move'
  
  // Safety reset
  window.addEventListener('dragend', onDragEnd, { once: true })
}

function onDragOver(index, e) {
  e.preventDefault()
  dragOverIndex.value = index
}

function onDrop(targetIndex, e) {
  e.preventDefault()
  if (draggedIndex.value !== null && draggedIndex.value !== targetIndex) {
    emit('reorder-moves', draggedIndex.value, targetIndex)
  }
  onDragEnd()
}

function onDragEnd() {
  isDragging.value = false
  draggedIndex.value = null
  dragOverIndex.value = null
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
</script>

<template>
  <div class="pdex-moves-pane">
    <div
      v-if="isInstance"
      class="current-moves-section"
    >
      <h4 class="vp-section-title">
        MOVIMIENTOS ACTUALES
      </h4>
      <div 
        class="moves-grid-vicio"
        :class="{ 'is-reordering': isDragging }"
      >
        <PVTooltip
          v-for="(m, i) in currentMoves"
          :key="m.name + i"
          :delay="400" 
          position="top"
          tag="div"
          :disabled="draggedIndex !== null"
          class="move-card-vicio"
          :class="{ 
            'is-dragging': draggedIndex === i,
            'is-drag-over': dragOverIndex === i,
            'is-draggable': canReorder
          }"
          :style="{ 
            '--m-type-color': PDEX_TYPE_COLORS[m.type?.toLowerCase() || 'normal'],
            '--m-type-rgb': hexToRgb(PDEX_TYPE_COLORS[m.type?.toLowerCase() || 'normal']),
            background: `Linear-Gradient(135deg, Rgba(${hexToRgb(PDEX_TYPE_COLORS[m.type?.toLowerCase() || 'normal'])}, 0.25) 0%, Rgba(255, 255, 255, 0.05) 100%)`,
            borderColor: `Rgba(${hexToRgb(PDEX_TYPE_COLORS[m.type?.toLowerCase() || 'normal'])}, 0.3)`
          }"
          :draggable="canReorder"
          @dragstart="onDragStart(i, $event)"
          @dragover="onDragOver(i, $event)"
          @dragleave="dragOverIndex = null"
          @drop="onDrop(i, $event)"
        >
          <template #content>
            <MoveTooltip :move="m" />
          </template>

          <div class="move-top">
            <span class="m-name pixelated">{{ m.name || '???' }}</span>
            <span
              class="m-type-tag pixelated"
              :style="{ background: PDEX_TYPE_COLORS[m.type?.toLowerCase() || 'normal'] }"
            >
              {{ (m.type || 'normal').toUpperCase() }}
            </span>
          </div>
          
          <div class="move-details-row">
            <div class="detail-item">
              <span class="d-label pixelated">POT:</span>
              <span class="d-val pixelated">{{ m.power || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="d-label pixelated">PREC:</span>
              <span class="d-val pixelated">
                <span
                  v-if="m.acc === 1000"
                  class="infinity-emoji"
                >♾️</span>
                <template v-else>{{ m.acc || '-' }}</template>
              </span>
            </div>
            <div class="detail-item">
              <span class="d-label pixelated">CAT:</span>
              <span class="d-val pixelated">
                {{ { physical: '⚔️ Físico', special: '✨ Especial', status: '🔮 Estado' }[m.cat] || '🔮 Estado' }}
              </span>
            </div>
            <div class="m-pp-wrap">
              <span class="m-pp-label pixelated">PP</span>
              <span class="m-pp-val pixelated">{{ m.pp }}/{{ m.maxPP }}</span>
            </div>
          </div>
        </PVTooltip>
      </div>
    </div>

    <h4 class="vp-section-title">
      APRENDIZAJE POR NIVEL
    </h4>
    <div class="vp-moves-list-grid">
      <!-- Header -->
      <div class="grid-header">
        <div class="h-col">
          NV
        </div>
        <div class="h-col">
          ATAQUE
        </div>
        <div class="h-col">
          TIPO
        </div>
        <div class="h-col">
          CAT
        </div>
        <div class="h-col">
          POT
        </div>
        <div class="h-col">
          PREC
        </div>
        <div class="h-col">
          PP
        </div>
      </div>

      <!-- Rows -->
      <div class="grid-body">
        <PVTooltip 
          v-for="m in moveDetails" 
          :key="m.name"
          tag="div"
          class="grid-row"
          position="top"
          :delay="150"
        >
          <template #content>
            <MoveTooltip :move="m" />
          </template>

          <div class="grid-cell vp-move-lv pixelated">
            {{ m.level }}
          </div>
          <div class="grid-cell vp-move-name pixelated">
            {{ m.name }}
          </div>
          <div class="grid-cell move-type">
            <span
              class="m-type-tag pixelated"
              :style="{ background: PDEX_TYPE_COLORS[m.type.toLowerCase()] }"
            >
              {{ m.type.toUpperCase() }}
            </span>
          </div>
          <div class="grid-cell move-cat pixelated">
            {{ { physical: '⚔️ FÍSICO', special: '✨ ESPECIAL', status: '🔮 ESTADO' }[m.cat] || '🔮 ESTADO' }}
          </div>
          <div class="grid-cell move-power pixelated">
            {{ m.power }}
          </div>
          <div class="grid-cell move-acc pixelated">
            <span
              v-if="m.acc === 1000"
              class="infinity-emoji"
            >♾️</span>
            <template v-else>
              {{ m.acc }}
            </template>
          </div>
          <div class="grid-cell move-pp pixelated">
            {{ m.pp }}
          </div>
        </PVTooltip>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/pokemon-detail/_vicio-panes.scss";

:deep(.pv-tooltip-wrapper) {
  width: 100%;
  display: block;
}
</style>
