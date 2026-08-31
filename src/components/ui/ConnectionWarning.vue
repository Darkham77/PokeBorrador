<script setup lang="ts">
import { onUnmounted } from 'vue';
import { gsap } from 'gsap';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
let pulseTween: gsap.core.Tween | null = null;

const onEnter = (el: Element, done: () => void) => {
  gsap.fromTo(
    el,
    { y: -20, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.25,
      ease: 'power2.out',
      onComplete: () => {
        const icon = el.querySelector('.banner-icon');
        if (icon) {
          pulseTween = gsap.to(icon, {
            opacity: 0.4,
            duration: 0.75,
            yoyo: true,
            repeat: -1,
            ease: 'power1.inOut'
          });
        }
        done();
      }
    }
  );
};

const onLeave = (el: Element, done: () => void) => {
  if (pulseTween) {
    pulseTween.kill();
    pulseTween = null;
  }
  gsap.to(el, {
    y: -20,
    opacity: 0,
    duration: 0.25,
    ease: 'power2.in',
    onComplete: done
  });
};

onUnmounted(() => {
  if (pulseTween) {
    pulseTween.kill();
    pulseTween = null;
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition
      :css="false"
      @enter="onEnter"
      @leave="onLeave"
    >
      <div
        v-if="authStore.connectionLost"
        id="connection-lost-warning-pill"
        class="connection-lost-banner pixelated"
      >
        <span class="banner-icon">📶</span>
        <span class="banner-text">CONEXIÓN PERDIDA · Reconectando automáticamente...</span>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.connection-lost-banner {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: Translatex(-50%);
  z-index: calc(var(--z-overlay) - 1);
  background: Rgba(239, 68, 68, 0.92);
  border: 2px solid #fca5a5;
  box-shadow: 0 4px 12px Rgba(0, 0, 0, 0.4);
  color: #ffffff;
  padding: 6px 14px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  letter-spacing: 0.5px;
  pointer-events: none;
}

.banner-icon {
  font-size: 14px;
}
</style>
