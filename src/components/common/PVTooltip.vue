<script lang="ts">
// Shared global state across all PVTooltip instances to prevent overlapping tooltips
let activeTooltipHide: ((immediate?: boolean) => void) | null = null; // singleton-ok
</script>

<script setup lang="ts">
import { ref, nextTick, inject, watch, onUnmounted, computed } from 'vue'
import { gsap } from 'gsap'
import { useTooltipPosition } from '@/composables/ui/useTooltipPosition'

const DEFAULT_TOOLTIP_DELAY_MS = 500
const TOUCH_DRAG_THRESHOLD_PX = 15
const BLOCK_CLICK_DURATION_SEC = 5
const TOUCH_HOVER_COOLDOWN_MS = 1000
const SECS_PER_MS_FACTOR = 1000

const props = defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  position: { type: String, default: 'top' }, // top, bottom, left, right
  delay: { type: Number, default: 500 },
  tag: { type: String, default: 'span' },
  disabled: { type: Boolean, default: false },
  hideOnClick: { type: Boolean, default: false },
  touchInstant: { type: Boolean, default: false }
})

const isSimplified = inject('isModalPerformanceMode', ref(false))
const isVisible = ref(false)
const trigger = ref<HTMLElement | null>(null)
const tooltip = ref<HTMLElement | null>(null)

const {
  coords,
  activePosition,
  arrowOffset,
  isRightSide,
  maxHeight,
  updatePosition
} = useTooltipPosition(trigger, tooltip, props.position)

const tooltipState = {
  timeout: null as gsap.core.Tween | null,
  touchTimeout: null as gsap.core.Tween | null,
  isImmediateLeave: false,
  lastTouchTime: 0,
  touchStartX: 0,
  touchStartY: 0,
  clickBlockTimeout: null as gsap.core.Tween | null,
}

const show = (immediate = false) => {
  if (isSimplified.value || props.disabled || isBlockedByClick.value) return 
  if (tooltipState.timeout) tooltipState.timeout.kill()
  
  const actualDelay = (immediate || props.touchInstant) ? 0 : Math.max(DEFAULT_TOOLTIP_DELAY_MS, props.delay)
  
  tooltipState.timeout = gsap.delayedCall(actualDelay / SECS_PER_MS_FACTOR, async () => {
    // Hide previous tooltip immediately before showing this one
    if (activeTooltipHide && activeTooltipHide !== hideInstanceLogic) {
      activeTooltipHide(true)
    }
    activeTooltipHide = hideInstanceLogic

    if (trigger.value) {
      const rect = trigger.value.getBoundingClientRect()
      isRightSide.value = (rect.left + rect.width / 2) > window.innerWidth / 2
    }
    
    isVisible.value = true
    await nextTick()
    updatePosition()
    await nextTick()
    updatePosition()
    
    // Auto-hide on scroll/wheel/click-outside to prevent floating artifacts
    window.addEventListener('scroll', hideScroll, { passive: true, capture: true })
    window.addEventListener('wheel', hideScroll, { passive: true })
    window.addEventListener('click', hideClickOutside, { capture: true })
    window.addEventListener('touchstart', hideClickOutside, { capture: true })
  })
}

const isBlockedByClick = ref(false)

const hide = (immediate = false) => {
  if (tooltipState.timeout) tooltipState.timeout.kill()
  if (tooltipState.touchTimeout) {
    tooltipState.touchTimeout.kill()
    tooltipState.touchTimeout = null
  }
  
  if (activeTooltipHide === hideInstanceLogic) {
    activeTooltipHide = null
  }
  
  if (immediate) {
    tooltipState.isImmediateLeave = true
  }
  
  isVisible.value = false
  window.removeEventListener('scroll', hideScroll, { capture: true })
  window.removeEventListener('wheel', hideScroll)
  window.removeEventListener('click', hideClickOutside, { capture: true })
  window.removeEventListener('touchstart', hideClickOutside, { capture: true })
}

const hideInstanceLogic = (immediate = false) => {
  hide(immediate)
}

const hideScroll = () => {
  hide(false)
}

const hideClickOutside = (event: Event) => {
  const target = event.target as Node
  if (
    tooltip.value && !tooltip.value.contains(target) &&
    trigger.value && !trigger.value.contains(target)
  ) {
    hide(true)
  }
}

const updateTouchTime = () => {
  tooltipState.lastTouchTime = Temporal.Now.instant().epochMilliseconds
}

const handleTouchStart = (e: TouchEvent) => {
  updateTouchTime()
  const touch = e.touches?.[0]
  if (touch) {
    tooltipState.touchStartX = touch.clientX
    tooltipState.touchStartY = touch.clientY
  }
  if (tooltipState.touchTimeout) {
    tooltipState.touchTimeout.kill()
    tooltipState.touchTimeout = null
  }
  
  if (props.touchInstant) {
    show(true)
  } else {
    tooltipState.touchTimeout = gsap.delayedCall(0.5, () => {
      show(true)
      tooltipState.touchTimeout = null
    })
  }
}

const handleTouchEnd = () => {
  updateTouchTime()
  if (tooltipState.touchTimeout) {
    tooltipState.touchTimeout.kill()
    tooltipState.touchTimeout = null
  }
  if (props.touchInstant) {
    return // Let touchInstant tooltips stay open until a click outside
  }
  if (!isVisible.value) {
    hide()
  }
}

const handleTouchMove = (e: TouchEvent) => {
  updateTouchTime()
  const touch = e.touches?.[0]
  if (!touch) return
  
  const deltaX = Math.abs(touch.clientX - tooltipState.touchStartX)
  const deltaY = Math.abs(touch.clientY - tooltipState.touchStartY)
  
  if (deltaX > TOUCH_DRAG_THRESHOLD_PX || deltaY > TOUCH_DRAG_THRESHOLD_PX) {
    if (tooltipState.touchTimeout) {
      tooltipState.touchTimeout.kill()
      tooltipState.touchTimeout = null
    }
    if (isVisible.value) {
      hide()
    }
  }
}

const handleTriggerClick = (event: MouseEvent) => {
  hide(true)
  
  if (!props.hideOnClick) return
  event.stopPropagation()
  isBlockedByClick.value = true
  
  if (tooltipState.clickBlockTimeout) tooltipState.clickBlockTimeout.kill()
  tooltipState.clickBlockTimeout = gsap.delayedCall(BLOCK_CLICK_DURATION_SEC, () => {
    isBlockedByClick.value = false
  })
}

const descriptionLines = computed(() => {
  if (!props.description) return []
  return props.description.split('\n').map(line => {
    const trimmed = line.trim()
    if (trimmed.startsWith('---')) {
      return {
        hasBullet: false,
        text: '',
        bullet: '',
        isBoost: false,
        isDebuff: false,
        isNeutral: false,
        isDivider: true
      }
    }
    const match = trimmed.match(/^([▲▼⚡🚫•])\s*(.*)$/u)
    if (match) {
      return {
        hasBullet: true,
        bullet: match[1],
        text: match[2],
        isBoost: match[1] === '▲',
        isDebuff: match[1] === '▼',
        isNeutral: match[1] === '•' || match[1] === '⚡' || match[1] === '🚫',
        isDivider: false
      }
    }
    return {
      hasBullet: false,
      text: line,
      bullet: '',
      isBoost: false,
      isDebuff: false,
      isNeutral: false,
      isDivider: false
    }
  })
})

const handleMouseEnter = () => {
  if (Temporal.Now.instant().epochMilliseconds - tooltipState.lastTouchTime < TOUCH_HOVER_COOLDOWN_MS) return
  if (window.matchMedia('(hover: hover)').matches) {
    show(false)
  }
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

const GSAP_TOOLTIP_ENTER_DURATION_SEC = 0.15
const GSAP_TOOLTIP_LEAVE_DURATION_SEC = 0.08

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
    duration: GSAP_TOOLTIP_ENTER_DURATION_SEC,
    ease: 'power2.out',
    onComplete: done
  })
}

const leave = (el: Element, done: () => void) => {
  if (tooltipState.isImmediateLeave) {
    done()
    tooltipState.isImmediateLeave = false
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
    duration: GSAP_TOOLTIP_LEAVE_DURATION_SEC,
    ease: 'power2.in',
    onComplete: done
  })
}

onUnmounted(() => {
  hide(true)
  if (tooltipState.clickBlockTimeout) tooltipState.clickBlockTimeout.kill()
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
            <div 
              class="tooltip-content"
              :style="maxHeight ? { maxHeight: maxHeight + 'px', overflow: 'hidden' } : {}"
            >
              <span
                v-if="title"
                class="pv-tooltip-title"
              >{{ title }}</span>
              <span
                v-if="description"
                class="pv-tooltip-desc"
              >
                <div
                  v-for="(line, idx) in descriptionLines"
                  :key="idx"
                  :class="[
                    line.isDivider ? 'tooltip-divider-line' : 'tooltip-line',
                    { 
                      'has-bullet': line.hasBullet,
                      'is-boost': line.isBoost,
                      'is-debuff': line.isDebuff,
                      'is-neutral': line.isNeutral
                    }
                  ]"
                >
                  <hr
                    v-if="line.isDivider"
                    class="tooltip-divider"
                  >
                  <template v-else>
                    <span
                      v-if="line.hasBullet"
                      class="bullet-icon"
                    >{{ line.bullet }}</span>
                    <span class="line-text">{{ line.text }}</span>
                  </template>
                </div>
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

<style lang="scss" src="@/styles/components/_pv-tooltip.scss"></style>
