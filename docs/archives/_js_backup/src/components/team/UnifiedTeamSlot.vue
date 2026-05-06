<script setup>
import { computed, ref } from 'vue'
import PokemonDisplayCard from '@/components/pokemon/PokemonDisplayCard.vue'

const props = defineProps({
  pokemon: { type: Object, default: null },
  index: { type: Number, required: true },
  isPvp: { type: Boolean, default: false },
  maxObeyLv: { type: Number, default: 100 },
  isDraggingAny: { type: Boolean, default: false },
  isTouchOver: { type: Boolean, default: false }
})

const emit = defineEmits(['select', 'open-detail', 'open-item', 'send-to-box', 'drag-start', 'drag-over', 'drop-pokemon', 'drag-end'])

const touchTimer = ref(null)
const isTouchDragging = ref(false)
const touchStartX = ref(0)
const touchStartY = ref(0)

const isEmpty = computed(() => !props.pokemon)
const isDragOver = ref(false)

function onDragStart(e) {
  if (isEmpty.value) return
  e.dataTransfer.effectAllowed = 'move'
  emit('drag-start', props.index)
}

function onDragOver(e) {
  e.preventDefault()
  if (props.isDraggingAny) {
    isDragOver.value = true
  }
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(e) {
  e.preventDefault()
  isDragOver.value = false
  emit('drop-pokemon', props.index)
}

// ── TOUCH HANDLERS (MOBILE LONG-PRESS) ───────────────────────────────────────

function handleTouchStart(e) {
  if (isEmpty.value) return
  const touch = e.touches[0]
  touchStartX.value = touch.clientX
  touchStartY.value = touch.clientY
  isTouchDragging.value = false
  
  touchTimer.value = setTimeout(() => {
    isTouchDragging.value = true
    if (e.currentTarget) e.currentTarget.style.touchAction = 'none'
    emit('drag-start', props.index)
    if ('vibrate' in navigator) navigator.vibrate(50)
  }, 800) // Long press threshold
}

function handleTouchMove(e) {
  if (isTouchDragging.value) {
    e.preventDefault()
    
    // Temporarily disable pointer events to detect what's UNDER the finger
    const el = e.currentTarget
    el.style.pointerEvents = 'none'
    
    const touch = e.touches[0]
    const target = document.elementFromPoint(touch.clientX, touch.clientY)
    const slot = target?.closest('.team-slot')
    
    // Restore pointer events
    el.style.pointerEvents = 'auto'

    if (slot && slot.dataset.index !== undefined) {
      const targetIndex = parseInt(slot.dataset.index)
      // Emit event so parent can manage the "over" state
      emit('drag-over', targetIndex)
    } else {
      emit('drag-over', null)
    }
  } else {
    const touch = e.touches[0]
    const deltaX = Math.abs(touch.clientX - touchStartX.value)
    const deltaY = Math.abs(touch.clientY - touchStartY.value)
    if (deltaX > 10 || deltaY > 10) {
      clearTimeout(touchTimer.value)
    }
  }
}

function handleTouchEnd(e) {
  clearTimeout(touchTimer.value)
  if (isTouchDragging.value) {
    if (e.currentTarget) e.currentTarget.style.touchAction = ''
    const touch = e.changedTouches[0]
    const target = document.elementFromPoint(touch.clientX, touch.clientY)
    const slot = target?.closest('.team-slot')
    
    if (slot && slot.dataset.index !== undefined) {
      const targetIndex = parseInt(slot.dataset.index)
      emit('drop-pokemon', targetIndex)
    } else {
      emit('drag-end')
    }
    isTouchDragging.value = false
  }
}
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
      v-else
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
    transform: TranslateY(-4px);
    
    .plus-icon {
      transform: Scale(1.2) Rotate(90deg);
      filter: Drop-shadow(0 0 15px var(--blue));
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
      .plus-icon { filter: Drop-shadow(0 0 10px var(--purple-light)); }
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
  -webkit-backdrop-filter: Blur(4px);
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
    filter: Drop-shadow(0 0 10px Rgba(10, 132, 255, 0.5));
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