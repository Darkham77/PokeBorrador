<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { gsap } from 'gsap'
import { Z_LAYERS } from '@/logic/constants/visuals'

const _LOADING_OVERLAY_THEMES = ['default', 'error', 'warning', 'purple'] as const;
type LoadingOverlayTheme = (typeof _LOADING_OVERLAY_THEMES)[number];

interface Props {
  title?: string
  message?: string
  statusText?: string
  icon?: string
  showSpinner?: boolean
  theme?: LoadingOverlayTheme
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
const cardRef = ref<HTMLElement | null>(null)
const iconRef = ref<HTMLElement | null>(null)

let spinnerTween: gsap.core.Tween | null = null
let glowTween: gsap.core.Tween | null = null
let pulseTween: gsap.core.Tween | null = null

const FULL_SPINNER_ROTATION_DEG = 360;
const OVERLAY_PULSE_SCALE_BOOST = 1.08;
const OVERLAY_PULSE_OPACITY_MIN = 0.75;

const startRotation = () => {
  if (spinnerTween) spinnerTween.kill()
  if (spinnerRef.value) {
    spinnerTween = gsap.to(spinnerRef.value, {
      rotation: FULL_SPINNER_ROTATION_DEG,
      duration: 1.2,
      repeat: -1,
      ease: 'none'
    })
  }
}

const startGlow = () => {
  if (glowTween) glowTween.kill()
  if (!cardRef.value) return

  let borderColorFrom = ''
  let borderColorTo = ''
  let boxShadowFrom = ''
  let boxShadowTo = ''

  if (props.theme === 'default') {
    borderColorFrom = 'Rgba(59, 130, 246, 0.4)'
    borderColorTo = 'Rgba(59, 130, 246, 0.8)'
    boxShadowFrom = '0 0 40px Rgba(59, 130, 246, 0.15), inset 0 0 20px Rgba(59, 130, 246, 0.05)'
    boxShadowTo = '0 0 60px Rgba(59, 130, 246, 0.3), inset 0 0 20px Rgba(59, 130, 246, 0.05)'
  } else if (props.theme === 'error') {
    borderColorFrom = 'Rgba(239, 68, 68, 0.4)'
    borderColorTo = 'Rgba(239, 68, 68, 0.8)'
    boxShadowFrom = '0 0 40px Rgba(239, 68, 68, 0.15), inset 0 0 20px Rgba(239, 68, 68, 0.1)'
    boxShadowTo = '0 0 60px Rgba(239, 68, 68, 0.3), inset 0 0 20px Rgba(239, 68, 68, 0.1)'
  } else if (props.theme === 'warning') {
    borderColorFrom = 'Rgba(245, 158, 11, 0.4)'
    borderColorTo = 'Rgba(245, 158, 11, 0.8)'
    boxShadowFrom = '0 0 40px Rgba(245, 158, 11, 0.15), inset 0 0 20px Rgba(245, 158, 11, 0.05)'
    boxShadowTo = '0 0 60px Rgba(245, 158, 11, 0.3), inset 0 0 20px Rgba(245, 158, 11, 0.05)'
  } else if (props.theme === 'purple') {
    borderColorFrom = 'Rgba(168, 85, 247, 0.4)'
    borderColorTo = 'Rgba(168, 85, 247, 0.8)'
    boxShadowFrom = '0 0 40px Rgba(168, 85, 247, 0.15), inset 0 0 20px Rgba(168, 85, 247, 0.05)'
    boxShadowTo = '0 0 60px Rgba(168, 85, 247, 0.3), inset 0 0 20px Rgba(168, 85, 247, 0.05)'
  }

  glowTween = gsap.fromTo(cardRef.value,
    { borderColor: borderColorFrom, boxShadow: boxShadowFrom },
    {
      borderColor: borderColorTo,
      boxShadow: boxShadowTo,
      duration: 1.5,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    }
  )
}

const startPulse = () => {
  if (pulseTween) pulseTween.kill()
  if (iconRef.value) {
    pulseTween = gsap.fromTo(iconRef.value,
      { scale: 1, opacity: 1 },
      {
        scale: OVERLAY_PULSE_SCALE_BOOST,
        opacity: OVERLAY_PULSE_OPACITY_MIN,
        duration: 1,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      }
    )
  }
}

onMounted(() => {
  nextTick(() => {
    if (props.showSpinner) {
      startRotation()
    }
    startGlow()
    if (props.icon) {
      startPulse()
    }
  })
})

onUnmounted(() => {
  if (spinnerTween) spinnerTween.kill()
  if (glowTween) glowTween.kill()
  if (pulseTween) pulseTween.kill()
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

watch(() => props.theme, () => {
  nextTick(() => {
    startGlow()
  })
})

watch(() => props.icon, (newIcon) => {
  if (newIcon) {
    nextTick(() => {
      startPulse()
    })
  } else if (pulseTween) {
    pulseTween.kill()
    pulseTween = null
  }
})
</script>

<template>
  <div
    id="pv-loading-overlay"
    :class="[
      absolute ? 'loading-overlay-absolute' : 'loading-overlay-fixed',
      { 'is-critical': critical }
    ]"
  >
    <div
      ref="cardRef"
      :class="['pv-loading-card', theme, cardClass]"
    >
      <div
        v-if="icon"
        class="icon-header"
      >
        <span
          ref="iconRef"
          class="emoji wifi-icon"
        >{{ icon }}</span>
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
  z-index: v-bind('Z_LAYERS.MAP_SPAWNS');
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

    .loading-title { color: var(--yellow); }
    .spinner { border-top-color: var(--yellow); }
    .status-text { color: var(--yellow); }
    .wifi-icon { filter: Drop-Shadow(0 0 15px Rgba(59, 130, 246, 0.5)); }
  }

  &.error {
    border: 2px solid Rgba(239, 68, 68, 0.4);
    box-shadow: 0 0 50px Rgba(239, 68, 68, 0.2),
                inset 0 0 20px Rgba(239, 68, 68, 0.1);

    .loading-title { color: Rgba(239, 68, 68, 1); }
    .spinner { border-top-color: Rgba(239, 68, 68, 1); }
    .status-text { color: Rgba(239, 68, 68, 1); }
    .wifi-icon { filter: Drop-Shadow(0 0 15px Rgba(239, 68, 68, 0.5)); }
  }

  &.warning {
    border: 2px solid Rgba(245, 158, 11, 0.4);
    box-shadow: 0 0 50px Rgba(245, 158, 11, 0.15),
                inset 0 0 20px Rgba(245, 158, 11, 0.05);

    .loading-title { color: Rgb(245, 158, 11); }
    .spinner { border-top-color: Rgb(245, 158, 11); }
    .status-text { color: Rgb(245, 158, 11); }
    .wifi-icon { filter: Drop-Shadow(0 0 15px Rgba(245, 158, 11, 0.5)); }
  }

  &.purple {
    border: 2px solid Rgba(168, 85, 247, 0.4);
    box-shadow: 0 0 50px Rgba(168, 85, 247, 0.15),
                inset 0 0 20px Rgba(168, 85, 247, 0.05);

    .loading-title { color: Rgb(168, 85, 247); }
    .spinner { border-top-color: Rgb(168, 85, 247); }
    .status-text { color: Rgb(168, 85, 247); }
    .wifi-icon { filter: Drop-Shadow(0 0 15px Rgba(168, 85, 247, 0.5)); }
  }
}

.icon-header {
  margin-bottom: 24px;
  .wifi-icon {
    display: inline-block;
    font-size: 48px;
    will-change: transform, filter, opacity;
  }
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
  @include pixelated;
}

.card-body-content {
  margin-bottom: 24px;
  color: Rgba(255, 255, 255, 0.9);
  font-size: 13px;
  @include pixelated;
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
  font-size: 10px;
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
