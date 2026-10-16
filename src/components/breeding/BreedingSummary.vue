<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useBreedingStore } from '@/stores/breeding';
import { usePlayerClassStore } from '@/stores/player/playerClass';
import { getGeneticsForecast, type GeneticsForecast } from '@/logic/breeding/breedingInheritance';
import { COMPAT_TEXT } from '@/data/breeding/breedingConstants';
import gsap from 'gsap';
import PVTooltip from '@/components/common/PVTooltip.vue';
import { getServerTime } from '@/logic/utils/timeUtils';

const breedingStore = useBreedingStore();
const classStore = usePlayerClassStore();

const heartRef = ref<HTMLElement | null>(null);
let pulseTween: gsap.core.Tween | null = null;

const startPulse = () => {
  if (pulseTween) return;
  if (!heartRef.value) return;

  // Set initial state
  gsap.set(heartRef.value, {
    scale: 1.0,
    opacity: 1,
    filter: 'grayscale(0%) drop-shadow(0 0 0px rgba(239, 68, 68, 0))'
  });

  // Pulsing animation
  pulseTween = gsap.to(heartRef.value, {
    scale: 1.2,
    filter: 'grayscale(0%) drop-shadow(0 0 15px rgba(239, 68, 68, 0.65))',
    duration: 1.0,
    repeat: -1,
    yoyo: true,
    ease: 'power1.inOut'
  });
};

const stopPulse = () => {
  if (pulseTween) {
    pulseTween.kill();
    pulseTween = null;
  }
  if (heartRef.value) {
    gsap.set(heartRef.value, {
      scale: 1.0,
      opacity: 0.1,
      filter: 'grayscale(100%) drop-shadow(0 0 0px rgba(239, 68, 68, 0))'
    });
  }
};

const isCompatible = computed(() => {
  return (breedingStore.compatibility?.level ?? 0) > 0;
});

const hasVigor = computed(() => {
  const pA = breedingStore.slots[0]?.pokemon;
  const pB = breedingStore.slots[1]?.pokemon;
  if (!pA || !pB) return false;
  return (pA.vigor ?? 0) > 0 && (pB.vigor ?? 0) > 0;
});

const isActivelyBreeding = computed(() => {
  return breedingStore.isBreeding && isCompatible.value && hasVigor.value;
});

watch(isActivelyBreeding, (active) => {
  if (active) {
    startPulse();
  } else {
    stopPulse();
  }
});

const forecast = computed<GeneticsForecast | null>(() => {
  if (
    !breedingStore.isBreeding ||
    !breedingStore.slots[0]?.pokemon ||
    !breedingStore.slots[1]?.pokemon
  )
    return null;
  return getGeneticsForecast(
    breedingStore.slots[0].pokemon,
    breedingStore.slots[1].pokemon,
    classStore.playerClass || ''
  );
});

const compatStyle = computed(() => {
  if (!breedingStore.isBreeding) {
    return { label: 'Deposita 2 Pokémon', color: '#94a3b8' };
  }
  const level = (breedingStore.compatibility?.level ?? 0) as number;
  return (
    (COMPAT_TEXT as Record<number, { label: string; color: string }>)[level] || {
      label: 'Desconocido',
      color: 'gray'
    }
  );
});

const formatMs = (ms: number | null): string => {
  if (!ms) return '--:--';
  const left = Math.max(0, Math.floor((ms - getServerTime()) / 1000));
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// GSAP Ticker: updates timer display every frame without setInterval
const displayTime = ref(formatMs(breedingStore.nextEggTime));

const tickerFn = () => {
  displayTime.value = formatMs(breedingStore.nextEggTime);

  // Capa 3: Check in real-time if timer hit zero while active
  if (breedingStore.isBreeding && breedingStore.nextEggTime) {
    const nowMs = getServerTime();
    if (nowMs >= breedingStore.nextEggTime) {
      breedingStore.checkAndGenerateEgg();
    }
  }
};

onMounted(() => {
  if (isActivelyBreeding.value) {
    startPulse();
  } else {
    stopPulse();
  }
  gsap.ticker.add(tickerFn);
});

onUnmounted(() => {
  stopPulse();
  gsap.ticker.remove(tickerFn);
});

const getCompatEmoji = (label: string) => {
  if (!label) return '';
  const emojiRegex =
    /^([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF])/;
  const match = label.match(emojiRegex);
  return match ? match[0] : '';
};

const getCompatText = (label: string) => {
  if (!label) return '';
  const emoji = getCompatEmoji(label);
  return emoji ? label.replace(emoji, '').trim() : label;
};
</script>

<template>
  <div class="breeding-summary">
    <div class="compat-section">
      <div class="compat-indicator" :style="{ color: compatStyle.color }">
        <div class="compat-label">
          <span v-if="getCompatEmoji(compatStyle.label)" class="emoji compat-emoji">{{
            getCompatEmoji(compatStyle.label)
          }}</span>
          <span class="compat-text">{{ getCompatText(compatStyle.label) }}</span>
        </div>
        <div v-if="breedingStore.isBreeding" class="timer">
          <template v-if="!isCompatible">
            <span class="emoji timer-icon">⏳</span>
            {{ displayTime }}
          </template>
          <template v-else-if="!hasVigor">
            <span class="emoji timer-icon font-large">💤</span>
            <span
              style="
                color: var(--red-light);
                font-weight: bold;
                text-shadow: 0 0 5px rgb(239 68 68 / 40%);
              "
              >CANSADOS (SIN VIGOR)</span
            >
          </template>
          <template v-else>
            <span class="emoji timer-icon">⏳</span>
            {{ displayTime }}
          </template>
        </div>
      </div>
      <div ref="heartRef" class="heart-fx emoji">❤️</div>
    </div>

    <div v-if="breedingStore.isBreeding && forecast" class="forecast-card">
      <div class="forecast-header">
        <span class="emoji icon">🧬</span>
        <h4>Pronóstico de Herencia</h4>
      </div>

      <div class="forecast-grid">
        <PVTooltip
          tag="div"
          class="forecast-item"
          :class="{ positive: forecast.ivsInherited >= 5 }"
          title="IVs HEREDADOS"
          description="Cantidad de valores individuales (IVs) que la cría heredará de sus padres. Equipar Lazo Destino a un padre aumenta los IVs heredados de 3 a 5 de 6."
        >
          <span class="label">IVs heredados:</span>
          <span class="value">{{ forecast.ivsInherited }} de 6</span>
        </PVTooltip>

        <PVTooltip
          tag="div"
          class="forecast-item"
          :class="{ active: forecast.natureGuaranteed }"
          title="HERENCIA DE NATURALEZA"
          description="Por defecto, la naturaleza de la cría es aleatoria. Equipar una Piedra Eterna a uno de los padres garantiza transmitir su naturaleza al 100%."
        >
          <span class="label">Naturaleza:</span>
          <span class="value">{{ forecast.natureGuaranteed ? 'GARANTIZADA' : 'Aleatoria' }}</span>
        </PVTooltip>

        <PVTooltip
          tag="div"
          class="forecast-item"
          :class="{ active: forecast.masudaActive }"
          title="MÉTODO MASUDA"
          description="Se activa si los padres son de distintas nacionalidades (por ej. un Ditto extranjero). Multiplica por 6 la probabilidad de que la cría sea Shiny."
        >
          <span class="label">Método Masuda:</span>
          <span class="value">{{
            forecast.masudaActive ? `ACTIVO (x${forecast.shinyMultiplier})` : 'Inactivo'
          }}</span>
        </PVTooltip>

        <PVTooltip
          tag="div"
          class="forecast-item"
          :class="{ positive: forecast.eggMovesCount > 0 }"
          title="MOVIMIENTOS HUEVO"
          description="Movimientos especiales que el bebé puede aprender al nacer si alguno de los padres conoce un movimiento compatible en su lista de movimientos huevo."
        >
          <span class="label">Movimientos Huevo:</span>
          <span class="value"
            >{{ forecast.eggMovesCount > 0 ? 'SÍ' : 'Ninguno' }}
            <span v-if="forecast.eggMovesCount > 0" class="emoji">✨</span></span
          >
        </PVTooltip>
      </div>

      <div class="forecast-help">
        <p>
          <span class="emoji">ℹ️</span> Usa Piedra Eterna para la Naturaleza y Lazo Destino para
          heredar más IVs.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/core/_mixins' as *;

.breeding-summary {
  display: flex;
  flex-direction: column;
  gap: $spacing-2xl;
}

.compat-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-lg;
}

.compat-indicator {
  text-align: center;

  .compat-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-sm;
    font-size: var(--font-10);
    font-weight: 800;
    margin-bottom: 4px;
    text-transform: uppercase;

    .compat-emoji {
      font-size: var(--font-26);
      line-height: 1;
    }
  }

  .timer {
    @include pixelated;

    display: flex;
    justify-content: center;
    align-items: center;
    gap: $spacing-sm;
    color: $white;
    font-size: var(--font-10);
    margin-top: 8px;

    .timer-icon {
      font-size: var(--font-26);
      line-height: 1;

      &.font-large {
        font-size: var(--font-26);
      }
    }
  }
}

.heart-fx {
  font-size: var(--font-32);
  opacity: 0.1;
  will-change: transform, filter, opacity;
  filter: Grayscale(100%);
}

.forecast-card {
  width: 100%;
  padding: 12px;
  border: 1px solid Rgb(255 51 102 / 25%);
  border-radius: $radius-2xl;
  background: Rgb(30 41 59 / 85%);
  box-shadow: var(--shadow-xl);
  box-sizing: border-box;

  .forecast-header {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid Rgb(255 255 255 / 5%);

    .icon {
      font-size: var(--font-16);
    }
    h4 {
      color: $white;
      font-size: var(--font-11);
      font-weight: 800;
      line-height: 1.5;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }
}

.forecast-grid {
  display: grid;
  gap: $spacing-sm;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 12px;
}

.forecast-item {
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-start !important;
  align-items: stretch !important;
  gap: $spacing-sm-alt;
  width: 100% !important;
  padding: 8px !important;
  border: 1px solid transparent;
  border-radius: $radius-lg-alt;
  background: Rgb(0 0 0 / 20%);
  box-sizing: border-box;
  cursor: help;

  .label {
    color: $muted;
    font-size: var(--font-8);
    font-weight: 600;
    line-height: 1.4;
    text-align: left;
  }

  .value {
    color: $white;
    font-size: var(--font-10);
    font-weight: 700;
    line-height: 1.4;
    text-align: left;
  }

  &.active {
    background: Rgb(255 51 102 / 4%);
    border-color: Rgb(255 51 102 / 35%);
    .value {
      color: var(--rose);
    }
  }

  &.positive {
    background: Rgb(34 197 94 / 5%);
    border-color: Rgb(34 197 94 / 40%);
    .value {
      color: Rgb(74 222 128 / 100%);
    }
  }
}

.forecast-help {
  padding-top: 10px;
  border-top: 1px dashed Rgb(51 65 85 / 100%);
  p {
    color: Rgb(148 163 184 / 100%);
    font-size: var(--font-9);
    line-height: 1.6;
  }
}
</style>
