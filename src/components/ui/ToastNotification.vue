<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import { gsap } from 'gsap'

const uiStore = useUIStore()

const TOAST_ENTER_X_OFFSET = 50;
const TOAST_LEAVE_X_OFFSET = 30;
const TOAST_LEAVE_SCALE = 0.9;
const TOAST_EASE_OVERSHOOT = 1.72;

function onEnter(el: Element, done: () => void) {
  gsap.fromTo(el,
    { opacity: 0, x: TOAST_ENTER_X_OFFSET },
    { opacity: 1, x: 0, duration: 0.3, ease: `back.out(${TOAST_EASE_OVERSHOOT})`, onComplete: done }
  )
}

function onLeave(el: Element, done: () => void) {
  gsap.to(el, {
    opacity: 0,
    x: TOAST_LEAVE_X_OFFSET,
    scale: TOAST_LEAVE_SCALE,
    duration: 0.3,
    onComplete: done
  })
}
</script>

<template>
  <Teleport to="body">
    <div
      id="notification-stack"
      class="toast-stack"
      :class="{ 'is-fullscreen-toast': uiStore.isAnyFullscreenModalOpen }"
    >
      <TransitionGroup
        :css="false"
        @enter="onEnter"
        @leave="onLeave"
      >
        <div 
          v-for="n in uiStore.notifications" 
          :id="'toast-item-' + n.id" 
          :key="n.id"
          class="toast-item"
        >
          <img 
            v-if="n.icon && (n.icon.includes('/') || n.icon.includes('.') || n.icon.startsWith('http'))"
            :src="n.icon"
            alt=""
            class="toast-icon-img"
          >
          <span
            v-else
            class="emoji toast-icon"
          >{{ n.icon }}</span>
          <span class="toast-msg">{{ n.msg }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.toast-stack {
  position: fixed;
  top: 100px; // Below HUD
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: var(--z-toast);
  pointer-events: none;
  max-width: 300px;
  @include gpu-layer;

  &.is-fullscreen-toast {
    top: 90px;
    z-index: var(--z-critical);
  }
}

.toast-item {
  pointer-events: all;
  background: Rgba(10, 12, 18, 0.98);
  -webkit-will-change: opacity;
  will-change: opacity;
  @include gpu-layer;
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-left: 3px solid var(--yellow, Rgba(241, 196, 15, 1));
  padding: 10px 14px;
  border-radius: 14px;
  box-shadow: 0 8px 30px Rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-ui);
  color: white;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0px;
  
  .toast-icon {
    font-size: 18px;
    flex-shrink: 0;
    font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .toast-icon-img {
    width: 24px;
    height: 24px;
    object-fit: contain;
    image-rendering: pixelated;
    flex-shrink: 0;
  }
  
  .toast-msg {
    line-height: 1.3;
  }
}

/* Responsive */
@media (max-width: 800px) {
  .toast-stack {
    top: 90px;
    bottom: auto;
    left: auto;
    right: 20px;
    max-width: calc(100dvw - 40px);
    align-items: flex-end;
    z-index: var(--z-critical); // Ensure it's above EVERYTHING
  }
}
</style>
