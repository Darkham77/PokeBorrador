<script setup lang="ts">
import { computed } from 'vue';
import PVTooltip from '@/components/common/PVTooltip.vue';
import ShowdownStatusStatsGrid from './ShowdownStatusStatsGrid.vue';

interface Stats {
  hp?: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

interface Boosts {
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  accuracy: number;
  evasion: number;
}

interface StatusState {
  id: string;
  time: number;
}

const props = defineProps<{
  statusId: string;
  pokemonName: string;
  baseStoredStats?: Stats | null;
  storedStats?: Stats | null;
  boosts?: Boosts | null;
  statusState?: StatusState | null;
}>();

interface StatusConfig {
  name: string;
  emoji: string;
  class: string;
  description: string;
  effects: string[];
}

const STATUS_MAP: Record<string, StatusConfig> = {
  brn: {
    name: 'Quemadura',
    emoji: '🔥',
    class: 'status-brn',
    description: 'Inflige daño continuo y debilita la fuerza física del Pokémon.',
    effects: [
      '⚔️ Ataque FÍSICO: Reducido al 50%.',
      '💔 Daño por turno: Quita 1/8 (12.5%) HP máx al final de cada turno.'
    ]
  },
  psn: {
    name: 'Veneno',
    emoji: '🟢',
    class: 'status-psn',
    description: 'Envenenamiento estándar que resta salud de forma constante.',
    effects: [
      '💔 Daño por turno: Quita 1/8 (12.5%) HP máx al final de cada turno.'
    ]
  },
  tox: {
    name: 'Veneno Grave',
    emoji: '💀',
    class: 'status-tox',
    description: 'Toxina severa que drena la salud exponencialmente.',
    effects: [
      '💔 Daño progresivo por turno: Quita N * 1/16 de HP máx (donde N aumenta +1 en cada turno).'
    ]
  },
  par: {
    name: 'Parálisis',
    emoji: '⚡',
    class: 'status-par',
    description: 'Inmoviliza al Pokémon por impulsos eléctricos de alto voltaje.',
    effects: [
      '🏃 Velocidad real: Reducida al 25% (un cuarto de la original).',
      '🛑 Parálisis total: 25% de probabilidad de no poder atacar en cada turno.'
    ]
  },
  slp: {
    name: 'Sueño',
    emoji: '💤',
    class: 'status-slp',
    description: 'El Pokémon ha caído en un profundo sueño curativo o forzado.',
    effects: [
      '💤 Inactivo: No puede ejecutar movimientos (salvo Ronquido o Sonámbulo).'
    ]
  },
  frz: {
    name: 'Congelación',
    emoji: '❄️',
    class: 'status-frz',
    description: 'El Pokémon está completamente cubierto de hielo sólido.',
    effects: [
      '🧊 Inactivo: No puede moverse.',
      '🔥 Descongelación: 20% de probabilidad de derretirse por turno, o derretimiento inmediato si recibe un ataque tipo Fuego.'
    ]
  },
  fnt: {
    name: 'Debilitado',
    emoji: '🔴',
    class: 'status-fnt',
    description: 'El Pokémon ya no tiene energía para combatir.',
    effects: [
      '🛑 Retirado: No puede entrar al combate a menos que sea revivido.'
    ]
  }
};

const config = computed(() => {
  const key = props.statusId.toLowerCase();
  return STATUS_MAP[key] || {
    name: 'Estado Normal',
    emoji: '🟢',
    class: 'status-normal',
    description: 'El Pokémon está saludable y listo para la acción.',
    effects: ['Ningún penalizador ni daño recurrente activo.']
  };
});

const hasStats = computed(() => !!props.storedStats);

const sleepTurnsText = computed(() => {
  if (props.statusId === 'slp' && props.statusState) {
    const turns = props.statusState.time;
    if (turns > 0) {
      return turns === 1 ? 'Queda 1 turno de sueño' : `Quedan ${turns} turnos de sueño`;
    }
  }
  return '';
});
</script>

<template>
  <PVTooltip
    :title="`${pokemonName.toUpperCase()} - ${config.name.toUpperCase()}`"
    position="top"
  >
    <!-- Slot trigger (badge o Pokébola) -->
    <slot />

    <!-- Panel PRO Detallado -->
    <template #content>
      <div
        class="status-pro-tooltip"
        :class="config.class"
      >
        <div class="tooltip-header">
          <span class="status-emoji">{{ config.emoji }}</span>
          <div class="header-text">
            <span class="status-title">{{ config.name }}</span>
            <span
              v-if="sleepTurnsText"
              class="sleep-turns"
            >{{ sleepTurnsText }}</span>
          </div>
        </div>

        <p class="status-description">
          {{ config.description }}
        </p>

        <div class="effects-divider" />

        <div class="effects-list">
          <div class="section-title">
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

        <!-- Sección de Estadísticas Reales (PRO - Extracted subcomponent) -->
        <template v-if="hasStats && baseStoredStats && storedStats">
          <div class="effects-divider" />
          <ShowdownStatusStatsGrid
            :status-id="statusId"
            :base-stored-stats="baseStoredStats"
            :stored-stats="storedStats"
            :boosts="boosts"
          />
        </template>
      </div>
    </template>
  </PVTooltip>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.status-pro-tooltip {
  width: 250px;
  padding: 4px;
  @include pixelated;

  .tooltip-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    .status-emoji {
      font-size: 20px;
    }

    .header-text {
      display: flex;
      flex-direction: column;
    }

    .status-title {
      font-size: 10px;
      color: white;
      font-weight: bold;
    }

    .sleep-turns {
      font-size: 8px;
      color: var(--yellow, #ffd60a);
      text-transform: uppercase;
      margin-top: 2px;
      letter-spacing: 0.5px;
    }
  }

  .status-description {
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

  .effects-list {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .effect-row {
      font-size: 8px;
      line-height: 1.4;
      color: white;
    }
  }

  .section-title {
    font-size: 7px;
    color: #86868b;
    letter-spacing: 0.5px;
    font-weight: bold;
    margin-bottom: 6px;
  }

  /* Stats grid styles */
  .stats-section {
    display: flex;
    flex-direction: column;
    margin-top: 4px;
  }

  .stats-grid {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    padding: 6px;

    .grid-header {
      display: grid;
      grid-template-columns: 2.2fr 1.5fr 1.5fr 1.8fr;
      font-size: 7px;
      color: #86868b;
      font-weight: bold;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 4px;
      margin-bottom: 2px;
    }

    .grid-row {
      display: grid;
      grid-template-columns: 2.2fr 1.5fr 1.5fr 1.8fr;
      font-size: 8px;
      color: #aeaebe;
      align-items: center;
      padding: 1px 0;

      .stat-label {
        font-weight: bold;
        color: #e5e5ea;
      }

      .stat-boost {
        color: #86868b;
        font-weight: bold;

        &.boost-up {
          color: #30d158;
        }
        &.boost-down {
          color: #ff453a;
        }
      }

      .stat-real {
        font-weight: bold;
        color: white;

        &.penalized {
          color: #ff9f0a;
        }
      }

      &.stat-modified {
        background: rgba(255, 214, 10, 0.03);
        border-radius: 2px;
      }
    }
  }

  .text-right {
    text-align: right;
  }

  /* Status Colors */
  &.status-brn {
    .status-title { color: #ff9f0a; }
  }
  &.status-psn {
    .status-title { color: #30d158; }
  }
  &.status-tox {
    .status-title { color: #bf5af2; }
  }
  &.status-par {
    .status-title { color: #ffd60a; }
  }
  &.status-slp {
    .status-title { color: #64d2ff; }
  }
  &.status-frz {
    .status-title { color: #0a84ff; }
  }
  &.status-fnt {
    .status-title { color: #ff453a; }
  }
}
</style>
