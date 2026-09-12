<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue';
import { gsap } from 'gsap';
import { useLivePvPStore } from '@/stores/livePvP';
import { PVP_TURN_TIMEOUT_SEC } from '@/types/battle/pvp';

const livePvPStore = useLivePvPStore();
const clockRef = ref<HTMLElement | null>(null);

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~125.66
const URGENT_THRESHOLD_SEC = 15;

const secondsRemaining = computed(() => livePvPStore.turnSecondsRemaining);
const afkStrikes = computed(() => livePvPStore.afkStrikes);
const isReconnecting = computed(() => livePvPStore.isReconnecting);
const reconnectSeconds = computed(() => livePvPStore.reconnectSecondsRemaining);

const displaySeconds = computed(() => {
  if (isReconnecting.value) {
    return Math.max(0, reconnectSeconds.value);
  }
  return Math.max(0, secondsRemaining.value);
});

const progress = computed(() => {
  if (isReconnecting.value) {
    return Math.min(1, Math.max(0, reconnectSeconds.value / 60));
  }
  return Math.min(1, Math.max(0, secondsRemaining.value / PVP_TURN_TIMEOUT_SEC));
});

const dashOffset = computed(() => {
  return CIRCUMFERENCE * (1 - progress.value);
});

const isUrgent = computed(() => {
  return !isReconnecting.value && secondsRemaining.value <= URGENT_THRESHOLD_SEC && secondsRemaining.value > 0;
});

let pulseTween: gsap.core.Tween | null = null;

watch(isUrgent, (urgent) => {
  if (!clockRef.value) return;
  if (urgent) {
    pulseTween = gsap.to(clockRef.value, {
      scale: 1.08,
      duration: 0.35,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut'
    });
  } else {
    if (pulseTween) {
      pulseTween.kill();
      pulseTween = null;
    }
    gsap.to(clockRef.value, {
      scale: 1,
      duration: 0.2,
      ease: 'power1.out'
    });
  }
});

onUnmounted(() => {
  if (pulseTween) {
    pulseTween.kill();
    pulseTween = null;
  }
});
</script>

<template>
  <div
    id="pvp-turn-timer-clock"
    ref="clockRef"
    class="pvp-turn-timer-clock"
    :class="{ 'is-urgent': isUrgent, 'is-reconnecting': isReconnecting }"
  >
    <div class="timer-content">
      <div class="timer-svg-wrap">
        <svg
          class="timer-ring-svg"
          viewBox="0 0 48 48"
          width="40"
          height="40"
        >
          <circle
            class="ring-bg"
            cx="24"
            cy="24"
            :r="RADIUS"
          />
          <circle
            class="ring-progress"
            cx="24"
            cy="24"
            :r="RADIUS"
            :stroke-dasharray="CIRCUMFERENCE"
            :stroke-dashoffset="dashOffset"
          />
        </svg>
        <span
          id="pvp-timer-number"
          class="timer-number text-outline"
        >{{ displaySeconds }}s</span>
      </div>

      <div class="timer-labels">
        <span
          v-if="isReconnecting"
          class="reconnect-label text-outline"
        >
          RECONECTANDO...
        </span>
        <span
          v-else
          class="timer-subtext text-outline"
        >
          TURNO PVP
        </span>

        <span
          v-if="afkStrikes > 0 && !isReconnecting"
          id="pvp-afk-strikes"
          class="strike-badge text-outline"
        >
          <span class="emoji">⚠️</span> STRIKE {{ afkStrikes }}/2
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.pvp-turn-timer-clock {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 6px auto;
  padding: 5px 14px;
  background: Rgba(15, 23, 42, 0.85);
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  box-shadow: 
    0 10px 30px Rgba(0, 0, 0, 0.5), 
    inset 0 0 10px Rgba(255, 255, 255, 0.05);
  backdrop-filter: Blur(8px);
  will-change: transform;
  user-select: none;

  &.is-urgent {
    border-color: Rgba(239, 68, 68, 0.7);
    box-shadow: 
      0 10px 30px Rgba(0, 0, 0, 0.5), 
      inset 0 0 10px Rgba(239, 68, 68, 0.2), 
      0 0 16px Rgba(239, 68, 68, 0.4);

    .ring-progress {
      stroke: #ef4444;
    }

    .timer-number {
      color: #f87171;
    }
  }

  &.is-reconnecting {
    border-color: Rgba(245, 158, 11, 0.7);
    box-shadow: 
      0 10px 30px Rgba(0, 0, 0, 0.5), 
      inset 0 0 10px Rgba(245, 158, 11, 0.2), 
      0 0 14px Rgba(245, 158, 11, 0.4);

    .ring-progress {
      stroke: #f59e0b;
    }

    .timer-number {
      color: #fbbf24;
    }
  }
}

.timer-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.timer-svg-wrap {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timer-ring-svg {
  transform: Rotate(-90deg);
  display: block;
}

.ring-bg {
  fill: none;
  stroke: Rgba(255, 255, 255, 0.12);
  stroke-width: 3.5;
}

.ring-progress {
  fill: none;
  stroke: #38bdf8;
  stroke-width: 3.5;
  stroke-linecap: round;
}

.timer-number {
  position: absolute;
  @include pixelated;
  font-size: 11px;
  font-weight: 700;
  color: #e0f2fe;
  letter-spacing: -0.5px;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
}

.timer-labels {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.timer-subtext {
  @include pixelated;
  font-size: 9px;
  color: var(--gray, #94a3b8);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
}

.reconnect-label {
  @include pixelated;
  font-size: 9px;
  color: #fbbf24;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
}

.strike-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  @include pixelated;
  font-size: 8px;
  color: #fef08a;
  background: Rgba(245, 158, 11, 0.18);
  padding: 2px 6px;
  border-radius: 6px;
  border: 1px solid Rgba(245, 158, 11, 0.45);
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
}
</style>
