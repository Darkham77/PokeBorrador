<script lang="ts">
// Shared global state across all PVTooltip instances to prevent overlapping tooltips
let activeTooltipHide: ((immediate?: boolean) => void) | null = null
</script>

<script setup lang="ts">
import { ref, nextTick, inject, watch, onUnmounted, computed } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  position: { type: String, default: 'top' }, // top, bottom, left, right
  delay: { type: Number, default: 250 },
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
let touchTimeout: gsap.core.Tween | null = null
let isImmediateLeave = false

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
    
    // Horizontal Nudge
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
  
  coords.value = { 
    top: Math.round(top), 
    left: Math.round(left), 
    right: 'auto' 
  }
}

const show = () => {
  if (isSimplified.value || props.disabled || isBlockedByClick.value) return 
  if (timeout) timeout.kill()
  
  timeout = gsap.delayedCall(props.delay / 1000, async () => {
    // Hide previous tooltip immediately before showing this one
    if (activeTooltipHide && activeTooltipHide !== hideInstance) {
      activeTooltipHide(true)
    }
    activeTooltipHide = hideInstance

    if (trigger.value) {
      const rect = trigger.value.getBoundingClientRect()
      isRightSide.value = (rect.left + rect.width / 2) > window.innerWidth / 2
    }
    
    isVisible.value = true
    await nextTick()
    updatePosition()
    await nextTick()
    updatePosition()
    
    // Auto-hide on scroll/wheel to prevent floating artifacts
    window.addEventListener('scroll', hideScroll, { passive: true, capture: true })
    window.addEventListener('wheel', hideScroll, { passive: true })
    window.addEventListener('touchmove', hideScroll, { passive: true })
  })
}

const isBlockedByClick = ref(false)
let clickBlockTimeout: gsap.core.Tween | null = null

const hide = (immediate = false) => {
  if (timeout) timeout.kill()
  if (touchTimeout) {
    touchTimeout.kill()
    touchTimeout = null
  }
  
  if (activeTooltipHide === hideInstance) {
    activeTooltipHide = null
  }
  
  if (immediate) {
    isImmediateLeave = true
  }
  
  isVisible.value = false
  window.removeEventListener('scroll', hideScroll, { capture: true })
  window.removeEventListener('wheel', hideScroll)
  window.removeEventListener('touchmove', hideScroll)
}

const hideInstance = (immediate = false) => {
  hide(immediate)
}

const hideScroll = () => {
  hide(false)
}

const handleTouchStart = () => {
  if (touchTimeout) {
    touchTimeout.kill()
    touchTimeout = null
  }
  touchTimeout = gsap.delayedCall(0.5, () => {
    show()
    touchTimeout = null
  })
}

const handleTouchEnd = () => {
  if (touchTimeout) {
    touchTimeout.kill()
    touchTimeout = null
  }
  hide()
}

const handleTouchMove = () => {
  if (touchTimeout) {
    touchTimeout.kill()
    touchTimeout = null
  }
  hide()
}

const handleTriggerClick = (event: MouseEvent) => {
  if (!props.hideOnClick) return
  event.stopPropagation()
  hide(false)
  isBlockedByClick.value = true
  
  if (clickBlockTimeout) clickBlockTimeout.kill()
  clickBlockTimeout = gsap.delayedCall(5, () => {
    isBlockedByClick.value = false
  })
}

const descriptionSegments = computed(() => {
  if (!props.description) return []
  const symbolsRegex = /(▲|▼|↑|↓|⬆|⬇|🔼|🔽|🔺|🔻|🔴|🟢|ℹ️|⚡|✨|⚠️|⭐|🛡️|♂️|♀️|🌸|☀️|🍂|❄️|🌅|🌇|🌙|🏙️|🌉|🌧️|🌫️|🌨️|🏜️|🔥|💨|🍃)/gu
  const parts = props.description.split(symbolsRegex)
  
  return parts.filter(p => p !== undefined && p !== '').map(p => {
    const isSymbol = symbolsRegex.test(p)
    return {
      text: p,
      isSymbol
    }
  })
})

const handleMouseEnter = () => {
  show()
}

const handleContextMenu = (event: Event) => {
  event.preventDefault()
}

watch(() => props.disabled, (newVal) => {
  if (newVal) hide(true)
})

// GSAP Hooks for custom animation on .tooltip-animate-wrapper
const beforeEnter = (el: Element) => {
  const wrapper = el.querySelector('.tooltip-animate-wrapper') as HTMLElement
  if (!wrapper) return

  const activePos = activePosition.value
  let startY = 6
  if (activePos === 'bottom') startY = -6
  let startX = 0
  if (activePos === 'left') startX = 6
  else if (activePos === 'right') startX = -6

  gsap.set(wrapper, {
    opacity: 0,
    y: startY,
    x: startX
  })
}

const enter = (el: Element, done: () => void) => {
  const wrapper = el.querySelector('.tooltip-animate-wrapper') as HTMLElement
  if (!wrapper) {
    done()
    return
  }

  gsap.to(wrapper, {
    opacity: 1,
    y: 0,
    x: 0,
    duration: 0.15,
    ease: 'power2.out',
    onComplete: done
  })
}

const leave = (el: Element, done: () => void) => {
  if (isImmediateLeave) {
    done()
    isImmediateLeave = false
    return
  }

  const wrapper = el.querySelector('.tooltip-animate-wrapper') as HTMLElement
  if (!wrapper) {
    done()
    return
  }

  const activePos = activePosition.value
  let endY = 4
  if (activePos === 'bottom') endY = -4
  let endX = 0
  if (activePos === 'left') endX = 4
  else if (activePos === 'right') endX = -4

  gsap.to(wrapper, {
    opacity: 0,
    y: endY,
    x: endX,
    duration: 0.08,
    ease: 'power2.in',
    onComplete: done
  })
}

onUnmounted(() => {
  hide(true)
  if (clickBlockTimeout) clickBlockTimeout.kill()
})
</script>

<template>
  <component 
    :is="tag"
    ref="trigger" 
    class="pv-tooltip-wrapper"
    audit-ignore="[PureVue-Ignore]" 
    @mouseenter="handleMouseEnter"
    @mouseleave="() => hide(false)"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
    @touchmove="handleTouchMove"
    @touchcancel="handleTouchEnd"
    @click="handleTriggerClick"
    @contextmenu="handleContextMenu"
  >
    <slot />
    
    <Teleport to="body">
      <Transition
        :css="false"
        @before-enter="beforeEnter"
        @enter="enter"
        @leave="leave"
      >
        <div 
          v-if="isVisible"
          ref="tooltip"
          :class="[
            'pv-tooltip-teleported', 
            `pos-${activePosition}`
          ]"
          :style="{ 
            top: coords.top + 'px', 
            left: coords.left + 'px'
          }"
        >
          <div 
            class="tooltip-animate-wrapper"
            :style="{
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
              >
                <template
                  v-for="(seg, idx) in descriptionSegments"
                  :key="idx"
                >
                  <span
                    v-if="seg.isSymbol"
                    class="symbol-align"
                    :class="{ 
                      'is-boost': seg.text === '▲' || seg.text === '↑' || seg.text === '⬆' || seg.text === '🔼' || seg.text === '🔺',
                      'is-debuff': seg.text === '▼' || seg.text === '↓' || seg.text === '⬇' || seg.text === '🔽' || seg.text === '🔻'
                    }"
                  >{{ seg.text }}</span>
                  <template v-else>{{ seg.text }}</template>
                </template>
              </span>
              <slot name="content" />
            </div>
            <div class="tooltip-arrow" />
          </div>
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
  -webkit-touch-callout: none !important;
  -webkit-user-select: none !important;
  user-select: none !important;
}

.pv-tooltip-teleported {
  position: absolute;
  z-index: var(--z-critical); // Above everything
  pointer-events: none !important;
  min-width: 120px;
  max-width: 320px;
  width: max-content;
  
  &.pos-top {
    transform: Translate(-50%, -100%);
  }
  &.pos-bottom {
    transform: Translate(-50%, 0);
  }
  &.pos-left {
    transform: Translate(-100%, -50%);
  }
  &.pos-right {
    transform: Translate(0, -50%);
  }
}

.tooltip-animate-wrapper {
  @include tooltip-premium;
  position: relative;
  will-change: transform, opacity;
  
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
    border-bottom: 1px solid Rgba(255, 255, 255, 0.2);

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
      line-height: 0;
      margin: 0 2px;
      transform: Translatey(-1px);
      font-size: 1.2em; 

      &.is-boost {
        color: #4ade80; // Green
        filter: Drop-Shadow(0 0 2px Rgba(74, 222, 128, 0.4));
        will-change: filter;
      }
      &.is-debuff {
        color: #f87171; // Red
        filter: Drop-Shadow(0 0 2px Rgba(248, 113, 113, 0.4));
        will-change: filter;
      }
    }
  }

  .tooltip-arrow {
    position: absolute;
    width: 0;
    height: 0;
    border: 6px solid transparent;
    z-index: 10;
  }

  .pos-top & {
    .tooltip-arrow {
      top: 100%;
      left: calc(50% + var(--arrow-x, 0px));
      transform: Translatex(-50%);
      border-top-color: var(--yellow);
    }
  }

  .pos-bottom & {
    .tooltip-arrow {
      bottom: 100%;
      left: calc(50% + var(--arrow-x, 0px));
      transform: Translatex(-50%);
      border-bottom-color: var(--yellow);
    }
  }

  .pos-left & {
    .tooltip-arrow {
      left: 100%;
      top: calc(50% + var(--arrow-y, 0px));
      transform: Translatey(-50%);
      border-left-color: var(--yellow);
    }
  }

  .pos-right & {
    .tooltip-arrow {
      right: 100%;
      top: calc(50% + var(--arrow-y, 0px));
      transform: Translatey(-50%);
      border-right-color: var(--yellow);
    }
  }
}
</style>
