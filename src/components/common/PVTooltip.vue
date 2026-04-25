<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  position: { type: String, default: 'top' }, // top, bottom, left, right
  delay: { type: Number, default: 0 }
})

const isVisible = ref(false)
const trigger = ref(null)
const tooltip = ref(null)
const coords = ref({ top: 0, left: 0 })
const activePosition = ref(props.position)
const arrowOffset = ref({ x: 0, y: 0 })

let timeout = null

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
  const padding = 10 // Safety margin from edges

  // --- 1. FLIPPING LOGIC ---
  if (pos === 'top' && rect.top - tipRect.height - gap < padding) {
    pos = 'bottom'
  } else if (pos === 'bottom' && rect.bottom + tipRect.height + gap > viewportHeight - padding) {
    pos = 'top'
  } else if (pos === 'left' && rect.left - tipRect.width - gap < padding) {
    pos = 'right'
  } else if (pos === 'right' && rect.right + tipRect.width + gap > viewportWidth - padding) {
    pos = 'left'
  }
  activePosition.value = pos

  // --- 2. BASE COORDINATES ---
  let top = 0
  let left = 0
  
  if (pos === 'top') {
    top = rect.top + scrollY - gap
    left = rect.left + scrollX + rect.width / 2
  } else if (pos === 'bottom') {
    top = rect.bottom + scrollY + gap
    left = rect.left + scrollX + rect.width / 2
  } else if (pos === 'left') {
    top = rect.top + scrollY + rect.height / 2
    left = rect.left + scrollX - gap
  } else if (pos === 'right') {
    top = rect.top + scrollY + rect.height / 2
    left = rect.right + scrollX + gap
  }

  // --- 3. NUDGING LOGIC (Boundary Protection) ---
  const anchorX = left
  const anchorY = top
  
  const halfWidth = tipRect.width / 2
  const halfHeight = tipRect.height / 2

  if (pos === 'top' || pos === 'bottom') {
    // Horizontal nudge
    if (left - halfWidth < padding + scrollX) {
      left = padding + scrollX + halfWidth
    } else if (left + halfWidth > viewportWidth + scrollX - padding) {
      left = viewportWidth + scrollX - padding - halfWidth
    }
    
    // Vertical nudge (safety)
    if (pos === 'top' && top - tipRect.height < padding + scrollY) {
      top = padding + scrollY + tipRect.height
    } else if (pos === 'bottom' && top + tipRect.height > viewportHeight + scrollY - padding) {
      top = viewportHeight + scrollY - padding - tipRect.height
    }
    
    // Arrow offset: difference between original anchor and new box center
    arrowOffset.value = { x: anchorX - left, y: 0 }
  } else {
    // Left/Right nudge
    // Vertical
    if (top - halfHeight < padding + scrollY) {
      top = padding + scrollY + halfHeight
    } else if (top + halfHeight > viewportHeight + scrollY - padding) {
      top = viewportHeight + scrollY - padding - halfHeight
    }

    // Horizontal (safety)
    if (pos === 'left' && left - tipRect.width < padding + scrollX) {
      left = padding + scrollX + tipRect.width
    } else if (pos === 'right' && left + tipRect.width > viewportWidth + scrollX - padding) {
      left = viewportWidth + scrollX - padding - tipRect.width
    }
    
    arrowOffset.value = { x: 0, y: anchorY - top }
  }
  
  coords.value = { top, left }
}

const show = () => {
  if (timeout) clearTimeout(timeout)
  timeout = setTimeout(async () => {
    isVisible.value = true
    await nextTick()
    // Initial calculate to get tipRect
    updatePosition()
    // Second calculate in case flipping changed dimensions or layout
    await nextTick()
    updatePosition()
  }, props.delay)
}

const hide = () => {
  if (timeout) clearTimeout(timeout)
  isVisible.value = false
}
</script>

<template>
  <span 
    ref="trigger" 
    class="pv-tooltip-wrapper"
    @mouseenter="show" 
    @mouseleave="hide"
    @touchstart="show"
    @touchend="hide"
  >
    <slot />
    
    <Teleport to="body">
      <Transition name="pv-tooltip-fade">
        <div 
          v-if="isVisible"
          ref="tooltip"
          :class="['pv-tooltip-teleported', `pos-${activePosition}`]"
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
            >{{ description }}</span>
            <slot name="content" />
          </div>
          <div class="tooltip-arrow" />
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<style lang="scss">
@use "@/styles/core/tools" as *;

.pv-tooltip-wrapper {
  display: inline-flex;
  align-items: center;
  cursor: help;
}

.pv-tooltip-teleported {
  position: absolute;
  z-index: var(--z-critical); // Above everything (even Debug Panel at 100,000)
  pointer-events: none;
  background: Rgba(10, 10, 20, 0.98);
  border: 1px solid $yellow;
  border-radius: 12px;
  padding: 10px 14px;
  min-width: 120px;
  max-width: 300px;
  box-shadow: 0 10px 30px Rgba(0, 0, 0, 0.8);
  -webkit-backdrop-filter: Blur(10px);
  backdrop-filter: Blur(10px);
  @include gpu-layer;
  
  .tooltip-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .pv-tooltip-title {
    @include pixelated;
    font-family: $font-pixel;
    font-size: 8px;
    color: $yellow;
    text-shadow: 1px 1px 0px Rgba(0, 0, 0, 0.5);
    margin-bottom: 6px;
    line-height: 1.4;
    display: block;
  }

  .pv-tooltip-desc {
    color: Rgba(255, 255, 255, 0.9);
    font-size: 11px;
    line-height: 1.5;
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
      transform: translateX(-50%);
      border-top-color: $yellow;
    }
  }

  &.pos-bottom {
    transform: Translate(-50%, 0);
    .tooltip-arrow {
      bottom: 100%;
      left: calc(50% + var(--arrow-x));
      transform: translateX(-50%);
      border-bottom-color: $yellow;
    }
  }

  &.pos-left {
    transform: Translate(-100%, -50%);
    .tooltip-arrow {
      left: 100%;
      top: calc(50% + var(--arrow-y));
      transform: translateY(-50%);
      border-left-color: $yellow;
    }
  }

  &.pos-right {
    transform: Translate(0, -50%);
    .tooltip-arrow {
      right: 100%;
      top: calc(50% + var(--arrow-y));
      transform: translateY(-50%);
      border-right-color: $yellow;
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
  &.pos-top { transform: Translate(-50%, -90%); }
  &.pos-bottom { transform: Translate(-50%, -10%); }
  &.pos-left { transform: Translate(-90%, -50%); }
  &.pos-right { transform: Translate(-10%, -50%); }
}
</style>
