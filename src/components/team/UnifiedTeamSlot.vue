<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import PokemonDisplayCard from '@/components/pokemon/PokemonDisplayCard.vue'

import type { Pokemon } from '@/types/pokemon'

interface Props {
  pokemon?: Pokemon | null
  index: number
  isPvp?: boolean
  maxObeyLv?: number
  isDraggingAny?: boolean
  isTouchOver?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  pokemon: null,
  isPvp: false,
  maxObeyLv: 100,
  isDraggingAny: false,
  isTouchOver: false
})

const emit = defineEmits(['select', 'open-detail', 'open-item', 'send-to-box', 'drag-start', 'drag-over', 'drop-pokemon', 'drag-end'])

const touchTimer = ref<gsap.core.Tween | null>(null)
const isTouchDragging = ref(false)
const touchStartX = ref(0)
const touchStartY = ref(0)

const isEmpty = computed(() => !props.pokemon)
const isDragOver = ref(false)

function onDragStart(e: DragEvent) {
  if (isEmpty.value) return
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  emit('drag-start', props.index)
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  if (props.isDraggingAny) {
    isDragOver.value = true
  }
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  emit('drop-pokemon', props.index)
}

// ── TOUCH HANDLERS (MOBILE LONG-PRESS) ───────────────────────────────────────

function handleTouchStart(e: TouchEvent) {
  if (isEmpty.value) return
  const touch = e.touches?.[0]
  if (!touch) return
  touchStartX.value = touch.clientX
  touchStartY.value = touch.clientY
  isTouchDragging.value = false
  
  touchTimer.value = gsap.delayedCall(0.8, () => {
    isTouchDragging.value = true
    if (e.currentTarget) (e.currentTarget as HTMLElement).style.touchAction = 'none'
    emit('drag-start', props.index)
    if ('vibrate' in navigator) navigator.vibrate(50)
  }) // Long press threshold
}

function handleTouchMove(e: TouchEvent) {
  if (isTouchDragging.value) {
    e.preventDefault()
    
    // Temporarily disable pointer events to detect what's UNDER the finger
    const el = e.currentTarget as HTMLElement
    if (el) el.style.pointerEvents = 'none'
    
    const touch = e.touches?.[0]
    if (!touch) return
    const target = document.elementFromPoint(touch.clientX, touch.clientY)
    const slot = target?.closest('.team-slot') as HTMLElement | null
    
    // Restore pointer events
    if (el) el.style.pointerEvents = 'auto'

    if (slot && slot.dataset.index !== undefined) {
      const targetIndex = parseInt(slot.dataset.index)
      // Emit event so parent can manage the "over" state
      emit('drag-over', targetIndex)
    } else {
      emit('drag-over', null)
    }
  } else {
    const touch = e.touches?.[0]
    if (touch) {
      const deltaX = Math.abs(touch.clientX - touchStartX.value)
      const deltaY = Math.abs(touch.clientY - touchStartY.value)
      if (deltaX > 10 || deltaY > 10) {
        if (touchTimer.value) touchTimer.value.kill()
      }
    }
  }
}

function handleTouchEnd(e: TouchEvent) {
  if (touchTimer.value) touchTimer.value.kill()
  if (isTouchDragging.value) {
    if (e.currentTarget) (e.currentTarget as HTMLElement).style.touchAction = ''
    const touch = e.changedTouches?.[0]
    if (!touch) return
    const target = document.elementFromPoint(touch.clientX, touch.clientY)
    const slot = target?.closest('.team-slot') as HTMLElement | null
    
    if (slot && slot.dataset.index !== undefined) {
      const targetIndex = parseInt(slot.dataset.index)
      emit('drop-pokemon', targetIndex)
    } else {
      emit('drag-end')
    }
    isTouchDragging.value = false
  }
}
onUnmounted(() => {
  if (touchTimer.value) touchTimer.value.kill()
})
</script>

<template>
  <div
    class="team-slot"
    :class="{ 
      'empty': isEmpty, 
      'pvp-slot': isPvp, 
      'is-dragging-any': isDraggingAny,
      'is-drag-over': isDragOver || isTouchOver 
    }"
    :data-index="index"
    :draggable="!isEmpty"
    @dragstart="onDragStart"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchEnd"
  >
    <div
      v-if="isEmpty"
      class="empty-placeholder"
      @click.stop="emit('select', index)"
    >
      <span class="plus-icon">✚</span>
      <span class="label">AÑADIR</span>
    </div>
    
    <PokemonDisplayCard
      v-else-if="pokemon"
      :pokemon="pokemon"
      :index="index"
      :is-pvp="isPvp"
      :max-obey-lv="maxObeyLv"
      disable-card-click
      @open-detail="emit('open-detail', index)"
      @open-item="emit('open-item', index)"
      @send-to-box="emit('send-to-box', index)"
      @select="emit('select', index)"
    />

    <!-- Overlay de número de posición durante el drag -->
    <Transition name="fade">
      <div
        v-if="isDraggingAny"
        class="drag-position-overlay"
      >
        <span class="pos-number">{{ index + 1 }}</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.team-slot {
  width: 100%;
  min-height: 260px;
  display: flex;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.empty-placeholder {
  flex: 1;
  background: Rgba(255, 255, 255, 0.02);
  border: 2px dashed Rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: Rgba(255, 255, 255, 0.05);
    border-color: var(--blue);
    transform: Translatey(-4px);
    
    .plus-icon {
      transform: Scale(1.2) Rotate(90deg);
      will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 0 15px var(--blue));
      color: var(--white);
    }
    
    .label {
      color: var(--blue);
    }
  }

  .plus-icon {
    font-size: 32px;
    color: Rgba(255, 255, 255, 0.3);
    transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .label {
    @include pixelated;
    font-size: 8px;
    color: var(--gray);
    transition: all 0.3s;
  }
}

.pvp-slot {
  .empty-placeholder {
    border-color: Rgba(199, 125, 255, 0.3);
    
    &:hover {
      border-color: var(--purple-light);
      .plus-icon { will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 0 10px var(--purple-light)); }
      .label { color: var(--purple-light); }
    }
  }
}

.drag-position-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: Rgba(0, 0, 0, 0.4);
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(4px);
  backdrop-filter: Blur(4px);
  @include gpu-layer;
  border-radius: 20px;
  z-index: var(--z-low);
  pointer-events: none; 
  border: 2px dashed var(--blue);
  transition: all 0.2s;

  .pos-number {
    font-size: 80px;
    color: var(--blue);
    @include pixelated;
    opacity: 0.8;
  filter: Drop-Shadow(0 0 10px Rgba(10, 132, 255, 0.5));
    transition: all 0.2s;
  }
}

.is-drag-over .drag-position-overlay {
  background: Rgba(10, 132, 255, 0.15);
  border-style: solid;
  border-width: 3px;

  .pos-number {
    opacity: 1;
    transform: Scale(1.2);
  }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
