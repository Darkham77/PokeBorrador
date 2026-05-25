<script setup lang="ts">
import { computed } from 'vue';
import PVTooltip from '@/components/common/PVTooltip.vue';

const props = defineProps<{
  conditionId: string;
  duration?: number;
  layers?: number;
}>();

interface SideConditionConfig {
  name: string;
  emoji: string;
  class: string;
  description: string;
  effects: string[];
}

const CONDITION_MAP: Record<string, SideConditionConfig> = {
  reflect: {
    name: 'Reflejo',
    emoji: '🛡️',
    class: 'cond-reflect',
    description: 'Una barrera psíquica que protege al equipo del daño físico.',
    effects: [
      '💥 Daño FÍSICO recibido: Reducido al 50% (en combates individuales).',
      '⌛ Duración: Se disipa tras 5 turnos.'
    ]
  },
  lightscreen: {
    name: 'Pantalla de Luz',
    emoji: '✨',
    class: 'cond-lightscreen',
    description: 'Una barrera brillante que protege al equipo del daño especial.',
    effects: [
      '🔮 Daño ESPECIAL recibido: Reducido al 50% (en combates individuales).',
      '⌛ Duración: Se disipa tras 5 turnos.'
    ]
  },
  spikes: {
    name: 'Púas',
    emoji: '🪵',
    class: 'cond-spikes',
    description: 'Trampas de púas en el suelo que dañan a los Pokémon rivales al entrar.',
    effects: [
      '🩹 Daño al entrar (no Voladores ni Levitación):',
      '  • 1 Capa: 1/8 (12.5%) HP máx.',
      '  • 2 Capas: 1/6 (16.6%) HP máx.',
      '  • 3 Capas: 1/4 (25.0%) HP máx.',
      '🧹 Eliminación: Se quitan usando Giro Rápido.'
    ]
  },
  safeguard: {
    name: 'Salvaguardia',
    emoji: '🌸',
    class: 'cond-safeguard',
    description: 'Un velo místico que protege al equipo de cambios de estado.',
    effects: [
      '❌ Inmunidad de Estado: Impide ser paralizado, quemado, envenenado, dormido o congelado por ataques rivales.',
      '⌛ Duración: Activa durante 5 turnos.'
    ]
  },
  mist: {
    name: 'Neblina',
    emoji: '🌫️',
    class: 'cond-mist',
    description: 'Un denso banco de niebla que protege al equipo de reducciones de estadísticas.',
    effects: [
      '🛡️ Inmunidad de Stats: Impide que los oponentes bajen tus estadísticas en combate.',
      '⌛ Duración: Activa durante 5 turnos.'
    ]
  }
};

const config = computed(() => {
  const normalized = props.conditionId.toLowerCase().replace(/[^a-z0-9]/g, '');
  return CONDITION_MAP[normalized] || {
    name: props.conditionId.toUpperCase(),
    emoji: '🌀',
    class: 'cond-generic',
    description: 'Un efecto secundario de campo está activo en este bando.',
    effects: ['Efecto mecánico activo en combate.']
  };
});

const durationText = computed(() => {
  if (props.layers !== undefined && props.layers > 0) {
    return props.layers === 1 ? '1 Capa' : `${props.layers} Capas`;
  }
  if (props.duration !== undefined && props.duration > 0) {
    return props.duration === 1 ? '1 turno restante' : `${props.duration} turnos restantes`;
  }
  return 'Activo';
});
</script>

<template>
  <PVTooltip
    :title="config.name.toUpperCase()"
    position="bottom"
  >
    <slot />

    <template #content>
      <div
        class="side-condition-pro-tooltip"
        :class="config.class"
      >
        <div class="tooltip-header">
          <span class="cond-emoji">{{ config.emoji }}</span>
          <div class="header-text">
            <span class="cond-duration">{{ durationText }}</span>
          </div>
        </div>

        <p class="cond-description">
          {{ config.description }}
        </p>

        <div class="effects-divider" />

        <div class="effects-grid">
          <div class="effects-title">
            EFECTOS MECÁNICOS (GEN 3):
          </div>
          <div
            v-for="(effect, index) in config.effects"
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

.side-condition-pro-tooltip {
  width: 240px;
  padding: 4px;
  @include pixelated;

  .tooltip-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    .cond-emoji {
      font-size: 18px;
    }

    .cond-duration {
      font-size: 8px;
      color: var(--yellow, #ffd60a);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  .cond-description {
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
      white-space: pre-wrap;
    }
  }

  /* Specific condition themes */
  &.cond-reflect {
    .cond-duration { color: #a29bfe; }
  }
  &.cond-lightscreen {
    .cond-duration { color: #ffeaa7; }
  }
  &.cond-spikes {
    .cond-duration { color: #e17055; }
  }
  &.cond-safeguard {
    .cond-duration { color: #fd79a8; }
  }
  &.cond-mist {
    .cond-duration { color: #81ecec; }
  }
}
</style>
