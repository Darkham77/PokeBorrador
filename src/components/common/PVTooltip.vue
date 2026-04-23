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

let timeout = null

const updatePosition = () => {
  if (!trigger.value) return
  
  const rect = trigger.value.getBoundingClientRect()
  const scrollY = window.scrollY
  const scrollX = window.scrollX
  
  let top = 0
  let left = 0
  
  const gap = 12
  
  if (props.position === 'top') {
    top = rect.top + scrollY - gap
    left = rect.left + scrollX + rect.width / 2
  } else if (props.position === 'bottom') {
    top = rect.bottom + scrollY + gap
    left = rect.left + scrollX + rect.width / 2
  } else if (props.position === 'left') {
    top = rect.top + scrollY + rect.height / 2
    left = rect.left + scrollX - gap
  } else if (props.position === 'right') {
    top = rect.top + scrollY + rect.height / 2
    left = rect.right + scrollX + gap
  }
  
  coords.value = { top, left }
}

const show = () => {
  if (timeout) clearTimeout(timeout)
  timeout = setTimeout(async () => {
    isVisible.value = true
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
  <div 
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
          :class="['pv-tooltip-teleported', `pos-${position}`]"
          :style="{ 
            top: coords.top + 'px', 
            left: coords.left + 'px' 
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
  </div>
</template>

<style lang="scss">
@use "@/styles/core/tools" as *;

.pv-tooltip-wrapper {
  // Transparent wrapper to allow absolute positioning from parent classes
}

.pv-tooltip-teleported {
  position: absolute;
  z-index: 20000; // Above everything (Modals are ~10000)
  pointer-events: none;
  background: rgba(10, 10, 20, 0.98);
  border: 1px solid $yellow;
  border-radius: 12px;
  padding: 10px 14px;
  min-width: 120px;
  max-width: 300px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
  -webkit-backdrop-filter: Blur(10px);
  backdrop-filter: Blur(10px);
  
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
    text-transform: uppercase;
    text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.5);
    margin-bottom: 4px;
  }

  .pv-tooltip-desc {
    color: #ccc;
    font-size: 11px;
    line-height: 1.4;
  }

  .tooltip-arrow {
    position: absolute;
    width: 0;
    height: 0;
    border: 6px solid transparent;
  }

  &.pos-top {
    transform: Translate(-50%, -100%);
    .tooltip-arrow {
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-top-color: $yellow;
    }
  }

  &.pos-bottom {
    transform: Translate(-50%, 0);
    .tooltip-arrow {
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-bottom-color: $yellow;
    }
  }

  &.pos-left {
    transform: Translate(-100%, -50%);
    .tooltip-arrow {
      left: 100%;
      top: 50%;
      transform: translateY(-50%);
      border-left-color: $yellow;
    }
  }

  &.pos-right {
    transform: Translate(0, -50%);
    .tooltip-arrow {
      right: 100%;
      top: 50%;
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
