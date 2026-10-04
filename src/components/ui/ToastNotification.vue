<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import { gsap } from 'gsap'
import PvPChallengeToast from '@/components/social/PvPChallengeToast.vue'

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
    <PvPChallengeToast />
  </Teleport>
</template>

<style scoped lang="scss">
.toast-stack {
  @include gpu-layer;

  position: fixed;
  top: 100px; // Below HUD
  right: 20px;
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 300px;
  pointer-events: none;

  &.is-fullscreen-toast {
    top: 90px;
    z-index: var(--z-critical);
  }
}

.toast-item {
  @include gpu-layer;

  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 14px;
  background: rgb(10 12 18 / 98%);
  color: white;
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 600;
  pointer-events: all;
  -webkit-will-change: opacity;
  will-change: opacity;
  border-left: 3px solid var(--yellow, rgb(241 196 15 / 100%));
  box-shadow: 0 8px 30px rgb(0 0 0 / 60%);
  letter-spacing: 0;
  
  .toast-icon {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif !important;
    font-size: 18px;
    flex-shrink: 0;
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
@media (width <= 800px) {
  .toast-stack {
    z-index: var(--z-critical); // Ensure it's above EVERYTHING
    align-items: flex-end;
    max-width: calc(100dvw - 40px);
    inset: 90px 20px auto auto;
  }
}
</style>
