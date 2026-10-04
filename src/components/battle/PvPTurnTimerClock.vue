<script setup lang="ts">
import { computed, watch, onWatcherCleanup, useTemplateRef } from 'vue';
import { gsap } from 'gsap';
import { useLivePvPStore } from '@/stores/livePvP';
import { PVP_TURN_TIMEOUT_SEC } from '@/types/battle/pvp';

const livePvPStore = useLivePvPStore();
const clockRef = useTemplateRef<HTMLElement>('clockRef');

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

watch(isUrgent, (urgent) => {
  if (!clockRef.value) return;
  if (urgent) {
    const pulseTween = gsap.to(clockRef.value, {
      scale: 1.08,
      duration: 0.35,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut'
    });
    onWatcherCleanup(() => {
      pulseTween.kill();
      if (clockRef.value) {
        gsap.to(clockRef.value, {
          scale: 1,
          duration: 0.2,
          ease: 'power1.out'
        });
      }
    });
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
  justify-content: center;
  align-items: center;
  margin: 0 auto 6px;
  padding: 5px 14px;
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 14px;
  background: rgb(15 23 42 / 85%);
  box-shadow: 
    0 10px 30px rgb(0 0 0 / 50%), 
    inset 0 0 10px rgb(255 255 255 / 5%);
  backdrop-filter: blur(8px);
  will-change: transform;
  user-select: none;

  &.is-urgent {
    border-color: rgb(239 68 68 / 70%);
    box-shadow: 
      0 10px 30px rgb(0 0 0 / 50%), 
      inset 0 0 10px rgb(239 68 68 / 20%), 
      0 0 16px rgb(239 68 68 / 40%);

    .ring-progress {
      stroke: #ef4444;
    }

    .timer-number {
      color: #f87171;
    }
  }

  &.is-reconnecting {
    border-color: rgb(245 158 11 / 70%);
    box-shadow: 
      0 10px 30px rgb(0 0 0 / 50%), 
      inset 0 0 10px rgb(245 158 11 / 20%), 
      0 0 14px rgb(245 158 11 / 40%);

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
  display: flex;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
}

.timer-ring-svg {
  display: block;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: rgb(255 255 255 / 12%);
  stroke-width: 3.5;
}

.ring-progress {
  fill: none;
  stroke: #38bdf8;
  stroke-width: 3.5;
  stroke-linecap: round;
}

.timer-number {
  @include pixelated;

  position: absolute;
  color: #e0f2fe;
  font-size: 11px;
  font-weight: 700;
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

  color: var(--gray, #94a3b8);
  font-size: 9px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
}

.reconnect-label {
  @include pixelated;

  color: #fbbf24;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
}

.strike-badge {
  @include pixelated;

  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border: 1px solid rgb(245 158 11 / 45%);
  border-radius: 6px;
  background: rgb(245 158 11 / 18%);
  color: #fef08a;
  font-size: 8px;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
}
</style>
