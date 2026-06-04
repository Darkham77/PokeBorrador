<script lang="ts">
// Shared global state across all PVTooltip instances to prevent overlapping tooltips
let activeTooltipHide: ((immediate?: boolean) => void) | null = null
</script>

<script setup lang="ts">
import { ref, nextTick, inject, watch, onUnmounted, computed } from 'vue'
import { gsap } from 'gsap'
import { useTooltipPosition } from '@/composables/useTooltipPosition'

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
  updatePosition
} = useTooltipPosition(trigger, tooltip, props.position)

let timeout: gsap.core.Tween | null = null
let touchTimeout: gsap.core.Tween | null = null
let isImmediateLeave = false
let lastTouchTime = 0
let touchStartX = 0
let touchStartY = 0

const show = (immediate = false) => {
  if (isSimplified.value || props.disabled || isBlockedByClick.value) return 
  if (timeout) timeout.kill()
  
  const actualDelay = (immediate || props.touchInstant) ? 0 : Math.max(500, props.delay)
  
  timeout = gsap.delayedCall(actualDelay / 1000, async () => {
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
let clickBlockTimeout: gsap.core.Tween | null = null

const hide = (immediate = false) => {
  if (timeout) timeout.kill()
  if (touchTimeout) {
    touchTimeout.kill()
    touchTimeout = null
  }
  
  if (activeTooltipHide === hideInstanceLogic) {
    activeTooltipHide = null
  }
  
  if (immediate) {
    isImmediateLeave = true
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
  lastTouchTime = Date.now()
}

const handleTouchStart = (e: TouchEvent) => {
  updateTouchTime()
  const touch = e.touches?.[0]
  if (touch) {
    touchStartX = touch.clientX
    touchStartY = touch.clientY
  }
  if (touchTimeout) {
    touchTimeout.kill()
    touchTimeout = null
  }
  
  if (props.touchInstant) {
    show(true)
  } else {
    touchTimeout = gsap.delayedCall(0.5, () => {
      show(true)
      touchTimeout = null
    })
  }
}

const handleTouchEnd = () => {
  updateTouchTime()
  if (touchTimeout) {
    touchTimeout.kill()
    touchTimeout = null
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
  
  const deltaX = Math.abs(touch.clientX - touchStartX)
  const deltaY = Math.abs(touch.clientY - touchStartY)
  
  if (deltaX > 15 || deltaY > 15) {
    if (touchTimeout) {
      touchTimeout.kill()
      touchTimeout = null
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
  
  if (clickBlockTimeout) clickBlockTimeout.kill()
  clickBlockTimeout = gsap.delayedCall(5, () => {
    isBlockedByClick.value = false
  })
}

const descriptionLines = computed(() => {
  if (!props.description) return []
  return props.description.split('\n').map(line => {
    const trimmed = line.trim()
    const match = trimmed.match(/^([▲▼⚡🚫•])\s*(.*)$/u)
    if (match) {
      return {
        hasBullet: true,
        bullet: match[1],
        text: match[2],
        isBoost: match[1] === '▲',
        isDebuff: match[1] === '▼',
        isNeutral: match[1] === '•' || match[1] === '⚡' || match[1] === '🚫'
      }
    }
    return {
      hasBullet: false,
      text: line,
      bullet: '',
      isBoost: false,
      isDebuff: false,
      isNeutral: false
    }
  })
})

const handleMouseEnter = () => {
  if (Date.now() - lastTouchTime < 1000) return
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
                <div
                  v-for="(line, idx) in descriptionLines"
                  :key="idx"
                  class="tooltip-line"
                  :class="{ 
                    'has-bullet': line.hasBullet,
                    'is-boost': line.isBoost,
                    'is-debuff': line.isDebuff,
                    'is-neutral': line.isNeutral
                  }"
                >
                  <span
                    v-if="line.hasBullet"
                    class="bullet-icon"
                  >{{ line.bullet }}</span>
                  <span class="line-text">{{ line.text }}</span>
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
