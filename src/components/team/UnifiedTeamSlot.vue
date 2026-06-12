<script setup lang="ts">
import { computed, ref, onUnmounted, watch } from 'vue'
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

const emit = defineEmits<{
  select: [index: number]
  'open-detail': [index: number]
  'open-item': [index: number]
  'send-to-box': [index: number]
  'drag-start': [index: number]
  'drag-over': [index: number | null]
  'drop-pokemon': [index: number]
  'drag-end': []
}>()

const slotRef = ref<HTMLElement | null>(null)
const touchTimer = ref<gsap.core.Tween | null>(null)
const isTouchDragging = ref(false)
const touchStartX = ref(0)
const touchStartY = ref(0)
const touchDeltaX = ref(0)
const touchDeltaY = ref(0)
const lastTouchOverIndex = ref<number | null>(null)

const touchDragStyle = computed(() => {
  if (!isTouchDragging.value) return {}
  return {
    transform: `translate(${touchDeltaX.value}px, ${touchDeltaY.value}px)`,
    zIndex: 9999,
    pointerEvents: 'none' as const,
    position: 'relative' as const
  }
})

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
  touchDeltaX.value = 0
  touchDeltaY.value = 0
  lastTouchOverIndex.value = null
  isTouchDragging.value = false
  
  const el = slotRef.value
  if (el) {
    el.addEventListener('touchmove', handleTouchMoveNonPassive, { passive: false })
    el.addEventListener('touchend', handleTouchEndNonPassive)
    el.addEventListener('touchcancel', handleTouchEndNonPassive)
  }
  
  touchTimer.value = gsap.delayedCall(0.35, () => {
    isTouchDragging.value = true
    if (el) el.style.touchAction = 'none'
    emit('drag-start', props.index)
    if ('vibrate' in navigator) navigator.vibrate(50)
  }) // Long press threshold
}

function handleTouchMoveNonPassive(e: TouchEvent) {
  if (isTouchDragging.value) {
    e.preventDefault() // Stop page scroll since it's registered non-passively
  }
  handleTouchMove(e)
}

function handleTouchEndNonPassive(e: TouchEvent) {
  const el = slotRef.value
  if (el) {
    el.removeEventListener('touchmove', handleTouchMoveNonPassive)
    el.removeEventListener('touchend', handleTouchEndNonPassive)
    el.removeEventListener('touchcancel', handleTouchEndNonPassive)
  }
  handleTouchEnd(e)
}

function handleTouchMove(e: TouchEvent) {
  const touch = e.touches?.[0]
  if (!touch) return

  if (isTouchDragging.value) {
    // Update visual displacement coordinates
    touchDeltaX.value = touch.clientX - touchStartX.value
    touchDeltaY.value = touch.clientY - touchStartY.value
    
    // Temporarily disable pointer events to detect what's UNDER the finger
    const el = slotRef.value
    if (el) el.style.pointerEvents = 'none'
    
    const target = document.elementFromPoint(touch.clientX, touch.clientY)
    const slot = target?.closest('.team-slot') as HTMLElement | null
    
    // Restore pointer events
    if (el) el.style.pointerEvents = 'auto'

    if (slot && slot.dataset.index !== undefined) {
      const targetIndex = parseInt(slot.dataset.index)
      lastTouchOverIndex.value = targetIndex
      // Emit event so parent can manage the "over" state
      emit('drag-over', targetIndex)
    } else {
      lastTouchOverIndex.value = null
      emit('drag-over', null)
    }
  } else {
    const deltaX = Math.abs(touch.clientX - touchStartX.value)
    const deltaY = Math.abs(touch.clientY - touchStartY.value)
    if (deltaX > 15 || deltaY > 15) {
      if (touchTimer.value) touchTimer.value.kill()
    }
  }
}

function handleTouchEnd(e: TouchEvent) {
  if (touchTimer.value) touchTimer.value.kill()
  if (isTouchDragging.value) {
    const el = slotRef.value
    if (el) el.style.touchAction = ''
    
    // Temporarily disable pointer events to find slot under finger
    if (el) el.style.pointerEvents = 'none'
    
    const touch = e.changedTouches?.[0]
    let slot: HTMLElement | null = null
    if (touch) {
      const target = document.elementFromPoint(touch.clientX, touch.clientY)
      slot = target?.closest('.team-slot') as HTMLElement | null
    }
    
    if (el) el.style.pointerEvents = 'auto'
    
    let targetIndex: number | null = null
    if (slot && slot.dataset.index !== undefined) {
      targetIndex = parseInt(slot.dataset.index)
    } else if (lastTouchOverIndex.value !== null) {
      targetIndex = lastTouchOverIndex.value
    }
    
    if (targetIndex !== null) {
      emit('drop-pokemon', targetIndex)
    } else {
      emit('drag-end')
    }
    
    isTouchDragging.value = false
    touchDeltaX.value = 0
    touchDeltaY.value = 0
    lastTouchOverIndex.value = null
  }
}

// ── GSAP HOVER HANDLERS ──────────────────────────────────────────────────────

const isPvpSlot = computed(() => props.isPvp)

function handlePlaceholderEnter(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  if (!el) return
  
  const accentColor = isPvpSlot.value ? 'var(--purple-light)' : 'var(--blue)'
  const shadowColor = isPvpSlot.value ? 'Rgba(199, 125, 255, 0.2)' : 'Rgba(10, 132, 255, 0.2)'
  
  gsap.to(el, {
    y: -4,
    scale: 1.02,
    borderColor: accentColor,
    boxShadow: `0 10px 25px Rgba(0, 0, 0, 0.3), 0 0 15px ${shadowColor}`,
    backgroundColor: 'Rgba(255, 255, 255, 0.04)',
    duration: 0.3,
    ease: 'power2.out'
  })

  const plus = el.querySelector('.plus-icon')
  if (plus) {
    gsap.to(plus, {
      scale: 1.2,
      rotation: 90,
      filter: `Drop-Shadow(0 0 15px ${accentColor})`,
      color: 'var(--white)',
      duration: 0.4,
      ease: 'back.out(1.7)'
    })
  }

  const label = el.querySelector('.label')
  if (label) {
    gsap.to(label, {
      color: accentColor,
      duration: 0.3,
      ease: 'power2.out'
    })
  }
}

function handlePlaceholderLeave(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  if (!el) return
  
  const baseBorderColor = isPvpSlot.value ? 'Rgba(199, 125, 255, 0.3)' : 'Rgba(255, 255, 255, 0.1)'

  gsap.to(el, {
    y: 0,
    scale: 1,
    borderColor: baseBorderColor,
    boxShadow: 'none',
    backgroundColor: 'Rgba(255, 255, 255, 0.02)',
    duration: 0.3,
    ease: 'power2.out'
  })

  const plus = el.querySelector('.plus-icon')
  if (plus) {
    gsap.to(plus, {
      scale: 1,
      rotation: 0,
      filter: 'none',
      color: 'Rgba(255, 255, 255, 0.3)',
      duration: 0.4,
      ease: 'power2.out'
    })
  }

  const label = el.querySelector('.label')
  if (label) {
    gsap.to(label, {
      color: 'var(--gray)',
      duration: 0.3,
      ease: 'power2.out'
    })
  }
}

// ── WATCHERS FOR DRAG OVERLAY ANIMATIONS ──────────────────────────────────────

const isOver = computed(() => isDragOver.value || props.isTouchOver)

watch(isOver, (newVal) => {
  const overlay = document.querySelector(`[data-index="${props.index}"] .drag-position-overlay`)
  const num = document.querySelector(`[data-index="${props.index}"] .pos-number`)
  if (!overlay || !num) return

  if (newVal) {
    gsap.to(overlay, {
      backgroundColor: 'Rgba(10, 132, 255, 0.15)',
      borderWidth: 3,
      borderStyle: 'solid',
      duration: 0.2,
      ease: 'power2.out'
    })
    gsap.to(num, {
      opacity: 1,
      scale: 1.2,
      duration: 0.2,
      ease: 'back.out(1.5)'
    })
  } else {
    gsap.to(overlay, {
      backgroundColor: 'Rgba(0, 0, 0, 0.85)',
      borderWidth: 2,
      borderStyle: 'dashed',
      duration: 0.2,
      ease: 'power2.out'
    })
    gsap.to(num, {
      opacity: 0.8,
      scale: 1,
      duration: 0.2,
      ease: 'power2.out'
    })
  }
})

onUnmounted(() => {
  if (touchTimer.value) touchTimer.value.kill()
})
</script>

<template>
  <div
    ref="slotRef"
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
    @contextmenu.prevent
  >
    <div
      v-if="isEmpty"
      class="empty-placeholder"
      @click.stop="emit('select', index)"
      @mouseenter="handlePlaceholderEnter"
      @mouseleave="handlePlaceholderLeave"
    >
      <span class="plus-icon">✚</span>
      <span class="label">AÑADIR</span>
    </div>
    
    <div
      v-else-if="pokemon"
      class="slot-card-wrapper"
      :style="touchDragStyle"
    >
      <PokemonDisplayCard
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
    </div>

    <!-- Overlay de número de posición durante el drag (animado por GSAP) -->
    <Transition
      :css="false"
      @enter="el => gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' })"
      @leave="(el, done) => gsap.to(el, { opacity: 0, duration: 0.2, ease: 'power2.in', onComplete: done })"
    >
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
  position: relative;

  @media (max-width: 580px) {
    min-height: 190px;
  }
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
  will-change: transform, border-color, background-color, box-shadow;

  @media (max-width: 580px) {
    border-radius: 12px;
    gap: 6px;
    padding: 8px;
  }

  .plus-icon {
    font-size: 32px;
    color: Rgba(255, 255, 255, 0.3);
    will-change: transform, filter, color;

    @media (max-width: 580px) {
      font-size: 20px;
    }
  }

  .label {
    @include pixelated;
    font-size: 8px;
    color: var(--gray);
    will-change: color;

    @media (max-width: 580px) {
      font-size: 7px;
    }
  }
}

.pvp-slot {
  .empty-placeholder {
    border-color: Rgba(199, 125, 255, 0.3);
  }
}

.drag-position-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: Rgba(0, 0, 0, 0.85);
  -webkit-will-change: transform, opacity;
  will-change: transform, opacity;
  @include gpu-layer;
  border-radius: 20px;
  z-index: var(--z-low);
  pointer-events: none; 
  border: 2px dashed var(--blue);

  @media (max-width: 580px) {
    border-radius: 12px;
  }

  .pos-number {
    font-size: 80px;
    color: var(--blue);
    @include pixelated;
    opacity: 0.8;
    filter: Drop-Shadow(0 0 10px Rgba(10, 132, 255, 0.5));
    will-change: transform, opacity;

    @media (max-width: 580px) {
      font-size: 40px;
    }
  }
}

.slot-card-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  position: relative;
  will-change: transform;
}
</style>
