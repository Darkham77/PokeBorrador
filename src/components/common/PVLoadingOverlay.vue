<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { gsap } from 'gsap'
import { Z_LAYERS } from '@/logic/constants/visuals'

interface Props {
  title?: string
  message?: string
  statusText?: string
  icon?: string
  showSpinner?: boolean
  theme?: 'default' | 'error' | 'warning' | 'purple'
  absolute?: boolean
  critical?: boolean
  cardClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  message: '',
  statusText: '',
  icon: '📶',
  showSpinner: true,
  theme: 'default',
  absolute: false,
  critical: false,
  cardClass: ''
})

const spinnerRef = ref<HTMLElement | null>(null)
let spinnerTween: gsap.core.Tween | null = null

const startRotation = () => {
  if (spinnerTween) spinnerTween.kill()
  if (spinnerRef.value) {
    spinnerTween = gsap.to(spinnerRef.value, {
      rotation: 360,
      duration: 1.2,
      repeat: -1,
      ease: 'none'
    })
  }
}

onMounted(() => {
  nextTick(() => {
    if (props.showSpinner) {
      startRotation()
    }
  })
})

onUnmounted(() => {
  if (spinnerTween) {
    spinnerTween.kill()
  }
})

watch(() => props.showSpinner, (show) => {
  if (show) {
    nextTick(() => {
      startRotation()
    })
  } else if (spinnerTween) {
    spinnerTween.kill()
    spinnerTween = null
  }
})
</script>

<template>
  <div
    :class="[
      absolute ? 'loading-overlay-absolute' : 'loading-overlay-fixed',
      { 'is-critical': critical }
    ]"
  >
    <div :class="['pv-loading-card', theme, cardClass]">
      <div
        v-if="icon"
        class="icon-header"
      >
        <span class="wifi-icon pulse">{{ icon }}</span>
      </div>

      <h2
        v-if="title"
        class="press-start loading-title"
      >
        {{ title.toUpperCase() }}
      </h2>

      <p
        v-if="message"
        class="msg"
      >
        {{ message }}
      </p>

      <div class="card-body-content">
        <slot />
      </div>

      <div
        v-if="showSpinner"
        class="status-indicator"
      >
        <div
          ref="spinnerRef"
          class="spinner"
        />
        <span
          v-if="statusText"
          class="status-text press-start"
        >{{ statusText.toUpperCase() }}</span>
      </div>

      <div
        v-if="$slots.actions"
        class="actions"
      >
        <slot name="actions" />
      </div>

      <p
        v-if="$slots.footer"
        class="footer"
      >
        <slot name="footer" />
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.loading-overlay-fixed {
  position: fixed;
  inset: 0;
  width: 100dvw;
  height: 100dvh;
  background: Rgba(7, 8, 14, 0.85);
  backdrop-filter: Blur(15px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: v-bind('Z_LAYERS.MAX');
  box-sizing: border-box;
  @include gpu-layer;

  &.is-critical {
    z-index: v-bind('Z_LAYERS.CRITICAL');
  }
}

.loading-overlay-absolute {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: Rgba(7, 8, 14, 0.9);
  backdrop-filter: Blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 15px;
  z-index: 10;
  box-sizing: border-box;
  border-radius: inherit;
}

.pv-loading-card {
  background: Rgba(15, 18, 32, 0.95);
  border-radius: 24px;
  width: 100%;
  max-width: 420px;
  padding: 40px;
  text-align: center;
  box-sizing: border-box;
  @include gpu-layer;

  &.default {
    border: 2px solid Rgba(59, 130, 246, 0.4);
    box-shadow: 0 0 50px Rgba(59, 130, 246, 0.15),
                inset 0 0 20px Rgba(59, 130, 246, 0.05);
    animation: glow-default 3s infinite ease-in-out;

    .loading-title { color: var(--yellow); }
    .spinner { border-top-color: var(--yellow); }
    .status-text { color: var(--yellow); }
    .wifi-icon { filter: Drop-Shadow(0 0 15px Rgba(59, 130, 246, 0.5)); }
  }

  &.error {
    border: 2px solid Rgba(239, 68, 68, 0.4);
    box-shadow: 0 0 50px Rgba(239, 68, 68, 0.2),
                inset 0 0 20px Rgba(239, 68, 68, 0.1);
    animation: glow-error 3s infinite ease-in-out;

    .loading-title { color: Rgba(239, 68, 68, 1); }
    .spinner { border-top-color: Rgba(239, 68, 68, 1); }
    .status-text { color: Rgba(239, 68, 68, 1); }
    .wifi-icon { filter: Drop-Shadow(0 0 15px Rgba(239, 68, 68, 0.5)); }
  }

  &.warning {
    border: 2px solid Rgba(245, 158, 11, 0.4);
    box-shadow: 0 0 50px Rgba(245, 158, 11, 0.15),
                inset 0 0 20px Rgba(245, 158, 11, 0.05);
    animation: glow-warning 3s infinite ease-in-out;

    .loading-title { color: Rgb(245, 158, 11); }
    .spinner { border-top-color: Rgb(245, 158, 11); }
    .status-text { color: Rgb(245, 158, 11); }
    .wifi-icon { filter: Drop-Shadow(0 0 15px Rgba(245, 158, 11, 0.5)); }
  }

  &.purple {
    border: 2px solid Rgba(168, 85, 247, 0.4);
    box-shadow: 0 0 50px Rgba(168, 85, 247, 0.15),
                inset 0 0 20px Rgba(168, 85, 247, 0.05);
    animation: glow-purple 3s infinite ease-in-out;

    .loading-title { color: Rgb(168, 85, 247); }
    .spinner { border-top-color: Rgb(168, 85, 247); }
    .status-text { color: Rgb(168, 85, 247); }
    .wifi-icon { filter: Drop-Shadow(0 0 15px Rgba(168, 85, 247, 0.5)); }
  }
}

@keyframes glow-default {
  0%, 100% { border-color: Rgba(59, 130, 246, 0.4); box-shadow: 0 0 40px Rgba(59, 130, 246, 0.15); }
  50% { border-color: Rgba(59, 130, 246, 0.8); box-shadow: 0 0 60px Rgba(59, 130, 246, 0.3); }
}

@keyframes glow-error {
  0%, 100% { border-color: Rgba(239, 68, 68, 0.4); box-shadow: 0 0 40px Rgba(239, 68, 68, 0.15); }
  50% { border-color: Rgba(239, 68, 68, 0.8); box-shadow: 0 0 60px Rgba(239, 68, 68, 0.3); }
}

@keyframes glow-warning {
  0%, 100% { border-color: Rgba(245, 158, 11, 0.4); box-shadow: 0 0 40px Rgba(245, 158, 11, 0.15); }
  50% { border-color: Rgba(245, 158, 11, 0.8); box-shadow: 0 0 60px Rgba(245, 158, 11, 0.3); }
}

@keyframes glow-purple {
  0%, 100% { border-color: Rgba(168, 85, 247, 0.4); box-shadow: 0 0 40px Rgba(168, 85, 247, 0.15); }
  50% { border-color: Rgba(168, 85, 247, 0.8); box-shadow: 0 0 60px Rgba(168, 85, 247, 0.3); }
}

.icon-header {
  margin-bottom: 24px;
  .wifi-icon {
    display: inline-block;
    font-size: 48px;
    will-change: transform, filter, opacity;
  }
}

.pulse {
  animation: pulse-icon 2s infinite ease-in-out;
}

@keyframes pulse-icon {
  0%, 100% { transform: Scale(1); opacity: 1; }
  50% { transform: Scale(1.08); opacity: 0.75; }
}

.loading-title {
  font-size: 15px;
  margin-top: 0;
  margin-bottom: 20px;
  @include pixelated;
  letter-spacing: 1px;
}

.msg {
  color: Rgba(255, 255, 255, 0.7);
  font-size: 13px;
  line-height: 1.6;
  margin-top: 0;
  margin-bottom: 32px;
}

.card-body-content {
  margin-bottom: 24px;
  color: Rgba(255, 255, 255, 0.9);
}

.status-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid Rgba(255, 255, 255, 0.05);
  border-radius: 50%;
  will-change: transform;
}

.status-text {
  font-size: 8px;
  @include pixelated;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
  margin-bottom: 12px;
  width: 100%;
}

.footer {
  font-size: 8px;
  color: Rgba(255, 255, 255, 0.2);
  margin-top: 20px;
  margin-bottom: 0;
  @include pixelated;
}
</style>
