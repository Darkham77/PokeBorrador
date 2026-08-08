<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { gsap } from 'gsap'
import { Z_LAYERS } from '@/logic/constants/visuals'
import BattleMoveSlot from '@/components/battle/BattleMoveSlot.vue'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'

interface Props {
  moves: (Move | null)[]
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

const touchTimer = ref<gsap.core.Tween | null>(null)
const isTouchDragging = ref(false)
const touchStartX = ref(0)
const touchStartY = ref(0)
const touchDeltaX = ref(0)
const touchDeltaY = ref(0)

const moveRefs = ref<(HTMLElement | null)[]>([])
const setMoveRef = (el: Element | ComponentPublicInstance | null, index: number) => {
  if (el) {
    moveRefs.value[index] = (el as ComponentPublicInstance).$el as HTMLElement
  } else {
    moveRefs.value[index] = null
  }
}

const touchDragStyle = (index: number) => {
  if (!isTouchDragging.value || draggedIndex.value !== index) return {}
  return {
    transform: `translate(${touchDeltaX.value}px, ${touchDeltaY.value}px)`,
    zIndex: Z_LAYERS.OVERLAY,
    pointerEvents: 'none' as const,
    position: 'relative' as const
  }
}

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

const TOUCH_LONG_PRESS_DELAY_SEC = 0.3
const TOUCH_VIBRATE_DURATION_MS = 50
const TOUCH_MOVE_CANCEL_THRESHOLD_PX = 15

function handleTouchStart(index: number, e: TouchEvent) {
  if (!props.canReorder || !fullMoves.value[index]) return
  
  const touch = e.touches?.[0]
  if (!touch) return
  
  touchStartX.value = touch.clientX
  touchStartY.value = touch.clientY
  touchDeltaX.value = 0
  touchDeltaY.value = 0
  isTouchDragging.value = false
  
  const el = moveRefs.value[index]
  if (el) {
    el.addEventListener('touchmove', handleTouchMoveNonPassive, { passive: false })
    el.addEventListener('touchend', handleTouchEndNonPassive)
    el.addEventListener('touchcancel', handleTouchEndNonPassive)
  }
  
  touchTimer.value = gsap.delayedCall(TOUCH_LONG_PRESS_DELAY_SEC, () => {
    isTouchDragging.value = true
    draggedIndex.value = index
    isDragging.value = true
    if (el) el.style.touchAction = 'none'
    if ('vibrate' in navigator) navigator.vibrate(TOUCH_VIBRATE_DURATION_MS)
  })
}

function handleTouchMoveNonPassive(e: TouchEvent) {
  if (isTouchDragging.value) {
    e.preventDefault()
  }
  handleTouchMove(e)
}

function handleTouchEndNonPassive(e: TouchEvent) {
  const index = draggedIndex.value
  if (index !== null) {
    const el = moveRefs.value[index]
    if (el) {
      el.removeEventListener('touchmove', handleTouchMoveNonPassive)
      el.removeEventListener('touchend', handleTouchEndNonPassive)
      el.removeEventListener('touchcancel', handleTouchEndNonPassive)
    }
  }
  handleTouchEnd(e)
}

function handleTouchMove(e: TouchEvent) {
  const touch = e.touches?.[0]
  if (!touch) return

  if (isTouchDragging.value && draggedIndex.value !== null) {
    touchDeltaX.value = touch.clientX - touchStartX.value
    touchDeltaY.value = touch.clientY - touchStartY.value
    
    const el = moveRefs.value[draggedIndex.value]
    if (el) el.style.pointerEvents = 'none'
    
    const target = document.elementFromPoint(touch.clientX, touch.clientY)
    const slot = target?.closest('.move-slot-wrapper') as HTMLElement | null
    
    if (el) el.style.pointerEvents = 'auto'
    
    if (slot) {
      const targetIndex = moveRefs.value.indexOf(slot)
      if (targetIndex !== -1) {
        dragOverIndex.value = targetIndex
      } else {
        dragOverIndex.value = null
      }
    } else {
      dragOverIndex.value = null
    }
  } else {
    const deltaX = Math.abs(touch.clientX - touchStartX.value)
    const deltaY = Math.abs(touch.clientY - touchStartY.value)
    if (deltaX > TOUCH_MOVE_CANCEL_THRESHOLD_PX || deltaY > TOUCH_MOVE_CANCEL_THRESHOLD_PX) {
      if (touchTimer.value) touchTimer.value.kill()
    }
  }
}

function handleTouchEnd(e: TouchEvent) {
  if (touchTimer.value) touchTimer.value.kill()
  if (isTouchDragging.value && draggedIndex.value !== null) {
    const el = moveRefs.value[draggedIndex.value]
    if (el) el.style.touchAction = ''
    
    if (el) el.style.pointerEvents = 'none'
    
    const touch = e.changedTouches?.[0]
    let slot: HTMLElement | null = null
    if (touch) {
      const target = document.elementFromPoint(touch.clientX, touch.clientY)
      slot = target?.closest('.move-slot-wrapper') as HTMLElement | null
    }
    
    if (el) el.style.pointerEvents = 'auto'
    
    if (slot) {
      const targetIndex = moveRefs.value.indexOf(slot)
      if (targetIndex !== -1 && targetIndex !== draggedIndex.value) {
        emit('reorder-moves', draggedIndex.value, targetIndex)
      }
    }
    
    isTouchDragging.value = false
    draggedIndex.value = null
    isDragging.value = false
    dragOverIndex.value = null
    touchDeltaX.value = 0
    touchDeltaY.value = 0
  }
}

onUnmounted(() => {
  if (touchTimer.value) touchTimer.value.kill()
})
</script>

<template>
  <div 
    class="moves-grid-vicio"
    :class="{ 'is-reordering': isDragging }"
  >
    <BattleMoveSlot
      v-for="(move, i) in fullMoves" 
      :key="i"
      :ref="(el) => setMoveRef(el, i)"
      :move="move"
      :index="i"
      :is-processing="isProcessing"
      :player-info="playerInfo"
      :can-reorder="canReorder"
      :dragged-index="draggedIndex"
      :drag-over-index="dragOverIndex"
      :style="touchDragStyle(i)"
      :draggable="canReorder && !!move"
      @dragstart="onDragStart(i, $event)"
      @dragover="onDragOver(i, $event)"
      @dragleave="dragOverIndex = null"
      @drop="onDrop(i, $event)"
      @dragend="onDragEnd"
      @touchstart="handleTouchStart(i, $event)"
      @use-move="emit('use-move', i)"
      @contextmenu.prevent
    />
  </div>
</template>

<style scoped lang="scss">
.moves-grid-vicio {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: 1fr;
  gap: var(--move-panel-gap, 12px);
}
</style>
