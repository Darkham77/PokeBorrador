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
          width="44"
          height="44"
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
          class="timer-number"
        >{{ displaySeconds }}s</span>
      </div>

      <div class="timer-labels">
        <span
          v-if="isReconnecting"
          class="reconnect-label"
        >
          RECONECTANDO...
        </span>
        <span
          v-else
          class="timer-subtext"
        >
          TURNO PVP
        </span>

        <span
          v-if="afkStrikes > 0 && !isReconnecting"
          id="pvp-afk-strikes"
          class="strike-badge"
        >
          <span class="emoji">⚠️</span> STRIKE {{ afkStrikes }}/2
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.pvp-turn-timer-clock {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 6px auto;
  padding: 4px 14px;
  background: Rgba(12, 16, 28, 0.92);
  border: 2px solid Rgba(56, 189, 248, 0.4);
  border-radius: 8px;
  box-shadow: 0 2px 10px Rgba(0, 0, 0, 0.5), inset 0 1px 0 Rgba(255, 255, 255, 0.1);
  will-change: transform;
  user-select: none;

  &.is-urgent {
    border-color: #ef4444;
    box-shadow: 0 0 14px Rgba(239, 68, 68, 0.6), inset 0 1px 0 Rgba(255, 255, 255, 0.2);

    .ring-progress {
      stroke: #ef4444;
    }

    .timer-number {
      color: #f87171;
      text-shadow: 0 0 8px Rgba(239, 68, 68, 0.8);
    }
  }

  &.is-reconnecting {
    border-color: #f59e0b;
    box-shadow: 0 0 12px Rgba(245, 158, 11, 0.5);

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
  width: 44px;
  height: 44px;
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
  stroke-width: 4;
}

.ring-progress {
  fill: none;
  stroke: #38bdf8;
  stroke-width: 4;
  stroke-linecap: round;
}

.timer-number {
  position: absolute;
  font-family: var(--font-pixel, monospace);
  font-size: 13px;
  font-weight: bold;
  color: #e0f2fe;
  letter-spacing: -0.5px;
}

.timer-labels {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.timer-subtext {
  font-family: var(--font-pixel, monospace);
  font-size: 11px;
  color: #94a3b8;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.reconnect-label {
  font-family: var(--font-pixel, monospace);
  font-size: 11px;
  color: #fbbf24;
  font-weight: bold;
  letter-spacing: 0.5px;
}

.strike-badge {
  display: inline-block;
  font-family: var(--font-pixel, monospace);
  font-size: 10px;
  color: #fef08a;
  background: Rgba(180, 83, 9, 0.4);
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid Rgba(245, 158, 11, 0.5);
}
</style>
