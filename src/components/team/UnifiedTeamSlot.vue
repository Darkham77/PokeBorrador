<script setup lang="ts">
import { computed, ref, onUnmounted, watch } from 'vue'
import { gsap } from 'gsap'
import { Z_LAYERS } from '@/logic/constants/visuals'
import PokemonDisplayCard from '@/components/pokemon/PokemonDisplayCard.vue'

import type { Pokemon } from '@/types/pokemon/pokemon'

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

const DRAG_MOVE_THRESHOLD_SQ = 16
const SCROLL_MARGIN_PX = 80
const SCROLL_BASE_SPEED_PX = 3
const SCROLL_MAX_EXTRA_SPEED_PX = 10

const emit = defineEmits<{
  select: [index: number]
  'open-detail': [index: number]
  'open-item': [index: number]
  'unequip-item': [index: number]
  'send-to-box': [index: number]
  'drag-start': [index: number]
  'drag-over': [index: number | null]
  'drop-pokemon': [index: number]
  'drag-end': []
}>()

const slotRef = ref<HTMLElement | null>(null)
const isDraggingCard = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragDeltaX = ref(0)
const dragDeltaY = ref(0)
const lastOverIndex = ref<number | null>(null)
let hasMovedBeyondThreshold = false // singleton-ok
let activePointerId: number | null = null

const scrollContainerRef = ref<HTMLElement | null>(null)
const initialScrollTop = ref(0)
const currentScrollTop = ref(0)
const currentClientY = ref(0)
let autoScrollRaf: number | null = null

const isEmpty = computed(() => !props.pokemon)
const isPvpSlot = computed(() => props.isPvp)

const cardDragStyle = computed(() => {
  if (!isDraggingCard.value) return {}
  return {
    transform: `translate3d(${dragDeltaX.value}px, ${dragDeltaY.value}px, 0) scale(1.04)`,
    zIndex: Z_LAYERS.CRITICAL,
    pointerEvents: 'none' as const,
    position: 'relative' as const,
    opacity: 0.92,
    boxShadow: '0 16px 32px rgba(0, 0, 0, 0.6)'
  }
})

const initialMaxScroll = ref(0)

// ── AUTO-SCROLL LOOP ──────────────────────────────────────────────────────────

function startAutoScrollLoop() {
  function step() {
    if (!isDraggingCard.value || !scrollContainerRef.value) return
    const container = scrollContainerRef.value
    const rect = container.getBoundingClientRect()
    const y = currentClientY.value

    const topZone = rect.top + SCROLL_MARGIN_PX
    const bottomZone = rect.bottom - SCROLL_MARGIN_PX

    if (y < topZone && container.scrollTop > 0) {
      const ratio = Math.max(0, Math.min(1, (topZone - y) / SCROLL_MARGIN_PX))
      const speed = SCROLL_BASE_SPEED_PX + Math.round(ratio * SCROLL_MAX_EXTRA_SPEED_PX)
      container.scrollTop = Math.max(0, container.scrollTop - speed)
      currentScrollTop.value = container.scrollTop
      const scrollDelta = currentScrollTop.value - initialScrollTop.value
      const rawDy = (y - dragStartY.value) + scrollDelta
      const minDyScreen = containerTop.value - initSlotTop.value
      const maxDyScreen = (containerBottom.value - initSlotHeight.value) - initSlotTop.value
      dragDeltaY.value = Math.max(minDyScreen + scrollDelta, Math.min(maxDyScreen + scrollDelta, rawDy))
    } else if (y > bottomZone && container.scrollTop < initialMaxScroll.value) {
      const ratio = Math.max(0, Math.min(1, (y - bottomZone) / SCROLL_MARGIN_PX))
      const speed = SCROLL_BASE_SPEED_PX + Math.round(ratio * SCROLL_MAX_EXTRA_SPEED_PX)
      container.scrollTop = Math.min(initialMaxScroll.value, container.scrollTop + speed)
      currentScrollTop.value = container.scrollTop
      const scrollDelta = currentScrollTop.value - initialScrollTop.value
      const rawDy = (y - dragStartY.value) + scrollDelta
      const minDyScreen = containerTop.value - initSlotTop.value
      const maxDyScreen = (containerBottom.value - initSlotHeight.value) - initSlotTop.value
      dragDeltaY.value = Math.max(minDyScreen + scrollDelta, Math.min(maxDyScreen + scrollDelta, rawDy))
    }

    autoScrollRaf = requestAnimationFrame(step)
  }
  autoScrollRaf = requestAnimationFrame(step)
}

function stopAutoScrollLoop() {
  if (autoScrollRaf !== null) {
    cancelAnimationFrame(autoScrollRaf)
    autoScrollRaf = null
  }
}

const minDeltaX = ref(-9999)
const maxDeltaX = ref(9999)
const initSlotTop = ref(0)
const initSlotHeight = ref(0)
const containerTop = ref(-9999)
const containerBottom = ref(9999)

// ── UNIFIED POINTER DRAG ENGINE ──────────────────────────────────────────────

function handlePointerDown(e: PointerEvent) {
  if (isEmpty.value) return
  const targetEl = e.target as HTMLElement | null
  if (targetEl?.closest('button, .action-btn, .tag-item, .item-slot, .pill-btn, .card-status-indicators, .interactive-btn')) {
    return
  }

  activePointerId = e.pointerId
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  currentClientY.value = e.clientY
  dragDeltaX.value = 0
  dragDeltaY.value = 0
  hasMovedBeyondThreshold = false
  isDraggingCard.value = false

  const container = slotRef.value?.closest('.modal-scrollable-content, .base-modal-body, .modal-content, .pv-base-modal__body') as HTMLElement | null
  const grid = slotRef.value?.closest('.slots-grid') as HTMLElement | null
  scrollContainerRef.value = container
  initialScrollTop.value = container?.scrollTop ?? 0
  currentScrollTop.value = initialScrollTop.value
  initialMaxScroll.value = container ? Math.max(0, container.scrollHeight - container.clientHeight) : 0
  currentScrollTop.value = initialScrollTop.value

  const slotRect = slotRef.value?.getBoundingClientRect()
  const boundsTarget = grid?.getBoundingClientRect() || container?.getBoundingClientRect()
  const viewportTarget = container?.getBoundingClientRect()

  if (slotRect && boundsTarget && viewportTarget) {
    minDeltaX.value = boundsTarget.left - slotRect.left + 4
    maxDeltaX.value = boundsTarget.right - slotRect.right - 4
    initSlotTop.value = slotRect.top
    initSlotHeight.value = slotRect.height
    containerTop.value = viewportTarget.top + 4
    containerBottom.value = viewportTarget.bottom - 4
  }

  window.addEventListener('pointermove', onWindowPointerMove, { passive: false })
  window.addEventListener('pointerup', onWindowPointerUp)
  window.addEventListener('pointercancel', onWindowPointerCancel)
}

function onWindowPointerMove(e: PointerEvent) {
  if (activePointerId !== null && e.pointerId !== activePointerId) return
  currentClientY.value = e.clientY
  const dx = e.clientX - dragStartX.value
  const dy = e.clientY - dragStartY.value

  if (!hasMovedBeyondThreshold) {
    if (dx * dx + dy * dy >= DRAG_MOVE_THRESHOLD_SQ) {
      hasMovedBeyondThreshold = true
      isDraggingCard.value = true
      startAutoScrollLoop()
      emit('drag-start', props.index)
    }
  }

  if (isDraggingCard.value) {
    if (e.cancelable) e.preventDefault()
    const scrollDelta = currentScrollTop.value - initialScrollTop.value
    const rawDx = dx
    const rawDy = dy + scrollDelta

    const clampedDx = Math.max(minDeltaX.value, Math.min(maxDeltaX.value, rawDx))
    const minDyScreen = containerTop.value - initSlotTop.value
    const maxDyScreen = (containerBottom.value - initSlotHeight.value) - initSlotTop.value
    const clampedDy = Math.max(minDyScreen + scrollDelta, Math.min(maxDyScreen + scrollDelta, rawDy))

    dragDeltaX.value = clampedDx
    dragDeltaY.value = clampedDy

    const target = document.elementFromPoint(e.clientX, e.clientY)
    const slot = target?.closest('.team-slot') as HTMLElement | null
    if (slot && slot.dataset.index !== undefined) {
      const targetIndex = parseInt(slot.dataset.index)
      lastOverIndex.value = targetIndex
      emit('drag-over', targetIndex)
    } else {
      lastOverIndex.value = null
      emit('drag-over', null)
    }
  }
}

function onWindowPointerUp(e: PointerEvent) {
  if (activePointerId !== null && e.pointerId !== activePointerId) return
  cleanUpPointerListeners()
  if (isDraggingCard.value) {
    let targetIndex: number | null = null
    const target = document.elementFromPoint(e.clientX, e.clientY)
    const slot = target?.closest('.team-slot') as HTMLElement | null
    if (slot && slot.dataset.index !== undefined) {
      targetIndex = parseInt(slot.dataset.index)
    }

    if (targetIndex === null && lastOverIndex.value !== null) {
      targetIndex = lastOverIndex.value
    }

    if (targetIndex !== null && targetIndex !== props.index) {
      emit('drop-pokemon', targetIndex)
    } else {
      emit('drag-end')
    }
  }
  resetDragState()
}

function onWindowPointerCancel() {
  cleanUpPointerListeners()
  if (isDraggingCard.value) {
    emit('drag-end')
  }
  resetDragState()
}

function cleanUpPointerListeners() {
  window.removeEventListener('pointermove', onWindowPointerMove)
  window.removeEventListener('pointerup', onWindowPointerUp)
  window.removeEventListener('pointercancel', onWindowPointerCancel)
  stopAutoScrollLoop()
  activePointerId = null
}

function resetDragState() {
  isDraggingCard.value = false
  dragDeltaX.value = 0
  dragDeltaY.value = 0
  hasMovedBeyondThreshold = false
  lastOverIndex.value = null
}

function handleSlotClick() {
  if (!hasMovedBeyondThreshold && !isDraggingCard.value) {
    emit('select', props.index)
  }
}

// ── GSAP HOVER HANDLERS ──────────────────────────────────────────────────────

function handlePlaceholderEnter(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  if (!el) return
  gsap.to(el, {
    scale: 1.02,
    borderColor: isPvpSlot.value ? 'rgba(199, 125, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)',
    backgroundColor: isPvpSlot.value ? 'rgba(199, 125, 255, 0.08)' : 'rgba(255, 255, 255, 0.05)',
    boxShadow: isPvpSlot.value ? '0 0 15px rgba(199, 125, 255, 0.2)' : '0 0 15px rgba(255, 255, 255, 0.1)',
    duration: 0.2,
    ease: 'power2.out'
  })
}

function handlePlaceholderLeave(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  if (!el) return
  gsap.to(el, {
    scale: 1,
    borderColor: isPvpSlot.value ? 'rgba(199, 125, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    boxShadow: 'none',
    duration: 0.2,
    ease: 'power2.out'
  })
}

watch(() => props.isTouchOver, (newVal) => {
  if (!slotRef.value) return
  if (newVal) {
    gsap.to(slotRef.value, {
      scale: 1.02,
      duration: 0.2,
      ease: 'power2.out'
    })
  } else {
    gsap.to(slotRef.value, {
      scale: 1,
      duration: 0.2,
      ease: 'power2.out'
    })
  }
})

onUnmounted(() => {
  cleanUpPointerListeners()
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
      'is-drag-over': isTouchOver
    }"
    :data-index="index"
    @pointerdown="handlePointerDown"
    @click="handleSlotClick"
    @contextmenu.prevent
  >
    <div
      v-if="isEmpty"
      class="empty-placeholder"
      @mouseenter="handlePlaceholderEnter"
      @mouseleave="handlePlaceholderLeave"
    >
      <span class="plus-icon">✚</span>
      <span class="label">AÑADIR</span>
    </div>
    
    <div
      v-else-if="pokemon"
      class="slot-card-wrapper"
      :style="cardDragStyle"
    >
      <PokemonDisplayCard
        :pokemon="pokemon"
        :index="index"
        :is-pvp="isPvp"
        :max-obey-lv="maxObeyLv"
        disable-card-click
        @open-detail="emit('open-detail', index)"
        @open-item="emit('open-item', index)"
        @unequip-item="emit('unequip-item', index)"
        @send-to-box="emit('send-to-box', index)"
        @select="emit('select', index)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.team-slot {
  width: 100%;
  min-height: 260px;
  display: flex;
  position: relative;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  overscroll-behavior: contain;

  @media (max-width: 580px) {
    min-height: 190px;
  }

  &.is-drag-over {
    outline: 2px solid var(--blue);
    border-radius: 20px;
    box-shadow: 0 0 20px Rgba(10, 132, 255, 0.5);

    @media (max-width: 580px) {
      border-radius: 12px;
    }
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

.slot-card-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  position: relative;
  will-change: transform;

  img {
    pointer-events: none;
    -webkit-user-drag: none;
    user-select: none;
  }

  button,
  .action-btn,
  .tag-item,
  .item-slot,
  .pill-btn,
  .card-status-indicators,
  .interactive-btn {
    pointer-events: auto;
  }
}
</style>
