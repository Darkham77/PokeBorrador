<script setup lang="ts">
import { computed } from 'vue';
import PVTooltip from '@/components/common/PVTooltip.vue';

const props = defineProps<{
  weatherId: string;
  duration: number;
}>();

interface WeatherConfig {
  name: string;
  emoji: string;
  class: string;
  description: string;
  effects: string[];
}

const WEATHER_MAP: Record<string, WeatherConfig> = {
  sunnyday: {
    name: 'Día Soleado',
    emoji: '☀️',
    class: 'weather-sunny',
    description: 'El campo se ilumina bajo una intensa luz solar.',
    effects: [
      '🔥 Movimientos tipo FUEGO: +50% daño.',
      '💧 Movimientos tipo AGUA: -50% daño.',
      '⚡ Rayo Solar: Se ejecuta en 1 solo turno.',
      '🌧️ Trueno: Precisión reducida al 50%.',
      '❄️ Inmunidad: Los Pokémon no pueden congelarse.'
    ]
  },
  raindance: {
    name: 'Danza Lluvia',
    emoji: '🌧️',
    class: 'weather-rain',
    description: 'Una lluvia torrencial cae sobre el campo de batalla.',
    effects: [
      '💧 Movimientos tipo AGUA: +50% daño.',
      '🔥 Movimientos tipo FUEGO: -50% daño.',
      '⚡ Trueno: Precisión perfecta (100%).',
      '☀️ Rayo Solar: Daño reducido a la mitad (60 Potencia).'
    ]
  },
  sandstorm: {
    name: 'Tormenta de Arena',
    emoji: '🏜️',
    class: 'weather-sand',
    description: 'Una fuerte tormenta de arena barre el campo.',
    effects: [
      '🪨 Daño de Arena: Quita 1/16 HP máx por turno a tipos no Roca, Tierra o Acero.',
      '☀️ Rayo Solar: Daño reducido a la mitad (60 Potencia).'
    ]
  },
  hail: {
    name: 'Granizo',
    emoji: '❄️',
    class: 'weather-hail',
    description: 'Una tormenta de granizo golpea a los combatientes.',
    effects: [
      '🧊 Daño de Granizo: Quita 1/16 HP máx por turno a Pokémon que no sean de tipo Hielo.',
      '☀️ Rayo Solar: Daño reducido a la mitad (60 Potencia).',
      '🎯 Ventisca: Precisión perfecta (100%).'
    ]
  }
};

const weatherConfig = computed(() => {
  const normalized = props.weatherId.toLowerCase().replace(/[^a-z0-9]/g, '');
  return WEATHER_MAP[normalized] || {
    name: 'Clima Normal',
    emoji: '🍃',
    class: 'weather-normal',
    description: 'El clima se encuentra en condiciones estándar.',
    effects: ['No hay efectos activos sobre los tipos o habilidades.']
  };
});

const durationText = computed(() => {
  if (props.duration <= 0) {
    return 'Habilidad Permanente';
  }
  return props.duration === 1 ? '1 turno restante' : `${props.duration} turnos restantes`;
});
</script>

<template>
  <PVTooltip
    :title="weatherConfig.name.toUpperCase()"
    position="bottom"
  >
    <!-- Slot por defecto: lo que activa el hover (Insignia de Clima) -->
    <slot />

    <!-- Slot content: El panel premium detallado -->
    <template #content>
      <div
        class="weather-pro-tooltip"
        :class="weatherConfig.class"
      >
        <div class="tooltip-header">
          <span class="weather-emoji">{{ weatherConfig.emoji }}</span>
          <div class="header-text">
            <span class="weather-duration">{{ durationText }}</span>
          </div>
        </div>

        <p class="weather-description">
          {{ weatherConfig.description }}
        </p>

        <div class="effects-divider" />

        <div class="effects-grid">
          <div class="effects-title">
            EFECTOS MECÁNICOS (GEN 3):
          </div>
          <div
            v-for="(effect, index) in weatherConfig.effects"
            :key="index"
            class="effect-row"
          >
            {{ effect }}
          </div>
        </div>
      </div>
    </template>
  </PVTooltip>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.weather-pro-tooltip {
  width: 250px;
  padding: 4px;
  @include pixelated;

  .tooltip-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    .weather-emoji {
      font-size: 20px;
    }

    .header-text {
      display: flex;
      flex-direction: column;
    }

    .weather-duration {
      font-size: 8px;
      color: var(--yellow, #ffd60a);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  .weather-description {
    font-size: 8px;
    color: #aeaebe;
    margin: 0 0 8px 0;
    line-height: 1.4;
  }

  .effects-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
    margin: 8px 0;
  }

  .effects-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .effects-title {
      font-size: 7px;
      color: #86868b;
      letter-spacing: 0.5px;
      font-weight: bold;
      margin-bottom: 2px;
    }

    .effect-row {
      font-size: 8px;
      line-height: 1.4;
      color: white;
    }
  }

  /* Clima colors custom highlighting */
  &.weather-sunny {
    .weather-duration {
      color: #ff9f0a;
    }
  }
  &.weather-rain {
    .weather-duration {
      color: #0a84ff;
    }
  }
  &.weather-sand {
    .weather-duration {
      color: #bf5af2;
    }
  }
  &.weather-hail {
    .weather-duration {
      color: #64d2ff;
    }
  }
}
</style>
