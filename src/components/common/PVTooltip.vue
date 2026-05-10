<script setup lang="ts">
import { ref, nextTick, inject, watch, onUnmounted, computed } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  position: { type: String, default: 'top' }, // top, bottom, left, right
  delay: { type: Number, default: 0 },
  tag: { type: String, default: 'span' },
  disabled: { type: Boolean, default: false },
  hideOnClick: { type: Boolean, default: false }
})

const isSimplified = inject('isModalPerformanceMode', ref(false))
const isVisible = ref(false)
const trigger = ref<HTMLElement | null>(null)
const tooltip = ref<HTMLElement | null>(null)
const coords = ref({ top: 0, left: 0 as number | 'auto', right: 'auto' as number | 'auto' })
const activePosition = ref(props.position)
const arrowOffset = ref({ x: 0, y: 0 })

let timeout: gsap.core.Tween | null = null

const isRightSide = ref(false)

const updatePosition = () => {
  if (!trigger.value || !tooltip.value) return
  
  const rect = trigger.value.getBoundingClientRect()
  const tipRect = tooltip.value.getBoundingClientRect()
  const scrollY = window.scrollY
  const scrollX = window.scrollX
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  let pos = props.position
  const gap = 12
  const padding = 15 // Safety margin from edges

  // Pre-detect hemisphere
  const triggerCenter = rect.left + rect.width / 2
  isRightSide.value = triggerCenter > viewportWidth / 2

  // --- 1. FLIPPING LOGIC (Vertical) ---
  if (pos === 'top' && rect.top - tipRect.height - gap < padding) {
    pos = 'bottom'
  } else if (pos === 'bottom' && rect.bottom + tipRect.height + gap > viewportHeight - padding) {
    pos = 'top'
  }
  activePosition.value = pos

  // --- 2. BASE COORDINATES ---
  let top = 0
  let left = 0
  
  if (pos === 'top' || pos === 'bottom') {
    top = pos === 'top' ? rect.top + scrollY - gap : rect.bottom + scrollY + gap
    left = triggerCenter + scrollX
  } else if (pos === 'left') {
    top = rect.top + scrollY + rect.height / 2
    left = rect.left + scrollX - gap
  } else if (pos === 'right') {
    top = rect.top + scrollY + rect.height / 2
    left = rect.right + scrollX + gap
  }

  // --- 3. NUDGING & ARROW LOGIC ---
  const anchorX = triggerCenter + scrollX
  const anchorY = top
  
  if (pos === 'top' || pos === 'bottom') {
    const halfWidth = tipRect.width / 2
    
    // Horizontal Nudge (Ensures it stays within viewport)
    if (left - halfWidth < padding + scrollX) {
      left = padding + scrollX + halfWidth
    } else if (left + halfWidth > viewportWidth + scrollX - padding) {
      left = viewportWidth + scrollX - padding - halfWidth
    }
    
    arrowOffset.value = { x: anchorX - left, y: 0 }
  } else {
    // Left/Right Vertical Nudge
    const halfHeight = tipRect.height / 2
    if (top - halfHeight < padding + scrollY) {
      top = padding + scrollY + halfHeight
    } else if (top + halfHeight > viewportHeight + scrollY - padding) {
      top = viewportHeight + scrollY - padding - halfHeight
    }
    arrowOffset.value = { x: 0, y: anchorY - top }
  }
  
  coords.value = { top, left, right: 'auto' }
}

const show = () => {
  if (isSimplified.value || props.disabled || isBlockedByClick.value) return 
  if (timeout) timeout.kill()
  
  timeout = gsap.delayedCall(props.delay / 1000, async () => {
    // Detect hemisphere BEFORE making it visible
    if (trigger.value) {
      const rect = trigger.value.getBoundingClientRect()
      isRightSide.value = (rect.left + rect.width / 2) > window.innerWidth / 2
    }
    
    isVisible.value = true
    await nextTick()
    updatePosition()
    await nextTick()
    updatePosition()
    
    // Auto-hide on scroll to prevent "floating" tooltips
    window.addEventListener('scroll', hide, { passive: true, capture: true })
    window.addEventListener('wheel', hide, { passive: true })
    window.addEventListener('touchmove', hide, { passive: true })
  })
}

const isBlockedByClick = ref(false)
let clickBlockTimeout: gsap.core.Tween | null = null

const hide = () => {
  if (timeout) timeout.kill()
  isVisible.value = false
  window.removeEventListener('scroll', hide, { capture: true })
  window.removeEventListener('wheel', hide)
  window.removeEventListener('touchmove', hide)
}

const handleTriggerClick = (event: MouseEvent) => {
  if (!props.hideOnClick) return
  
  // Intercept if we need to hide it
  event.stopPropagation()
  
  hide()
  isBlockedByClick.value = true
  
  if (clickBlockTimeout) clickBlockTimeout.kill()
  clickBlockTimeout = gsap.delayedCall(5, () => {
    isBlockedByClick.value = false
  })
}

const formattedDescription = computed(() => {
  if (!props.description) return ''
  // Wrap common symbols/emojis for alignment (including Nature triangles, seasons, and time cycles)
  return props.description.replace(/(▲|▼|↑|↓|⬆|⬇|🔼|🔽|🔺|🔻|🔴|🟢|ℹ️|⚡|✨|⚠️|⭐|🛡️|♂️|♀️|🌸|☀️|🍂|❄️|🌅|🌇|🌙|🏙️|🌉)/gu, '<span class="symbol-align">$1</span>')
})

const handleMouseEnter = () => {
  show()
}

// If it becomes disabled while showing, hide it immediately
watch(() => props.disabled, (newVal) => {
  if (newVal) hide()
})

onUnmounted(() => {
  hide()
})
</script>

<template>
  <component 
    :is="tag"
    ref="trigger" 
    class="pv-tooltip-wrapper"
    audit-ignore="[PureVue-Ignore]" 
    @mouseenter="handleMouseEnter"
    @mouseleave="hide"
    @touchstart="show"
    @touchend="hide"
    @click="handleTriggerClick"
  >
    <slot />
    
    <Teleport to="body">
      <Transition name="pv-tooltip-fade">
        <div 
          v-if="isVisible"
          ref="tooltip"
          :class="[
            'pv-tooltip-teleported', 
            `pos-${activePosition}`
          ]"
          :style="{ 
            top: coords.top + 'px', 
            left: coords.left + 'px',
            '--arrow-x': arrowOffset.x + 'px',
            '--arrow-y': arrowOffset.y + 'px'
          }"
        >
          <div class="tooltip-content">
            <span
              v-if="title"
              class="pv-tooltip-title"
            >{{ title }}</span>
            <span
              v-if="description"
              class="pv-tooltip-desc"
              v-html="formattedDescription"
            />
            <slot name="content" />
          </div>
          <div class="tooltip-arrow" />
        </div>
      </Transition>
    </Teleport>
  </component>
</template>

<style lang="scss">
@use "@/styles/core/tools" as *;

.pv-tooltip-wrapper {
  display: inline-flex;
  align-items: center;
}

.pv-tooltip-teleported {
  position: absolute;
  @include tooltip-premium;
  z-index: var(--z-critical); // Above everything
  min-width: 120px;
  max-width: 320px;
  width: max-content;
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  
  .tooltip-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .pv-tooltip-title {
    @include pixelated;
    font-size: 8px;
    color: var(--yellow);
    text-shadow: 1px 1px 0px Rgba(0, 0, 0, 0.5);
    padding-bottom: 8px;
    margin-bottom: 8px;
    line-height: 1.4;
    display: block;
    border-bottom: 1px solid Rgba(255, 255, 255, 0.08);

    &:last-child {
      margin-bottom: 0;
      border-bottom: none;
      padding-bottom: 0;
    }
  }

  .pv-tooltip-desc {
    @include pixelated;
    display: block;
    color: Rgba(241, 245, 249, 0.9);
    font-size: 9px; 
    line-height: 1.6;
    white-space: pre-wrap;

    .symbol-align {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      line-height: 1;
      margin: 0 2px;
      transform: Translatey(-1px);
      font-family: Arial, sans-serif !important;
      font-size: 11px; // Make arrows slightly larger for visibility
    }
  }


  .tooltip-arrow {
    position: absolute;
    width: 0;
    height: 0;
    border: 6px solid transparent;
    transition: left 0.1s, top 0.1s; // Smooth nudge
  }

  &.pos-top {
    transform: Translate(-50%, -100%);
    
    .tooltip-arrow {
      top: 100%;
      left: calc(50% + var(--arrow-x));
      transform: Translatex(-50%);
      border-top-color: Rgba(255, 217, 61, 0.4);
    }
  }

  &.pos-bottom {
    transform: Translate(-50%, 0);

    .tooltip-arrow {
      bottom: 100%;
      left: calc(50% + var(--arrow-x));
      transform: Translatex(-50%);
      border-bottom-color: Rgba(255, 217, 61, 0.4);
    }
  }

  &.pos-left {
    transform: Translate(-100%, -50%);
    .tooltip-arrow {
      left: 100%;
      top: calc(50% + var(--arrow-y));
      transform: Translatey(-50%);
      border-left-color: Rgba(255, 217, 61, 0.4);
    }
  }

  &.pos-right {
    transform: Translate(0, -50%);
    .tooltip-arrow {
      right: 100%;
      top: calc(50% + var(--arrow-y));
      transform: Translatey(-50%);
      border-right-color: Rgba(255, 217, 61, 0.4);
    }
  }
}

.pv-tooltip-fade-enter-active,
.pv-tooltip-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.pv-tooltip-fade-enter-from,
.pv-tooltip-fade-leave-to {
  opacity: 0;
  &.pos-top { 
    transform: Translate(-50%, -90%); 
  }
  &.pos-bottom { 
    transform: Translate(-50%, -10%); 
  }
  &.pos-left { transform: Translate(-90%, -50%); }
  &.pos-right { transform: Translate(-10%, -50%); }
}
</style>
