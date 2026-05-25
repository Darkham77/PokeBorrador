<script setup lang="ts">
import { computed, ref } from 'vue';
import ShowdownStatusTooltip from './ShowdownStatusTooltip.vue';
import ShowdownSideConditionTooltip from './ShowdownSideConditionTooltip.vue';
import ShowdownPartyTracker from './ShowdownPartyTracker.vue';
import ShowdownAbilityTooltip from './ShowdownAbilityTooltip.vue';
import ShowdownNatureTooltip from './ShowdownNatureTooltip.vue';

export interface SandboxPokemon {
  id: string;
  name: string;
  types: string[];
  spriteUrl: string;
  isAnimated: boolean;
  moves: string[];
  hp?: number;
  maxHp?: number;
  status?: string; // psn, par, brn, slp, frz, fnt
  baseStoredStats?: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  } | null;
  storedStats?: {
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  } | null;
  boosts?: {
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
    accuracy: number;
    evasion: number;
  } | null;
  statusState?: {
    id: string;
    time: number;
  } | null;
  moveSlots?: Array<{
    id: string;
    pp: number;
    maxpp: number;
    disabled?: boolean | string;
  }> | null;
  ability?: string;
  nature?: string;
}

export interface SideCondition {
  id: string;
  duration?: number;
  layers?: number;
}

const props = defineProps<{
  pokemon: SandboxPokemon | null;
  hp: number;
  maxHp: number;
  team: SandboxPokemon[];
  isPlayer: boolean;
  sideConditions?: SideCondition[];
}>();

const getSideConditionEmoji = (id: string) => {
  const map: Record<string, string> = {
    reflect: '🛡️',
    lightscreen: '✨',
    spikes: '🪵',
    safeguard: '🌸',
    mist: '🌫️'
  };
  return map[id.toLowerCase()] || '🌀';
};

const getSideConditionName = (id: string) => {
  const map: Record<string, string> = {
    reflect: 'REFLEJO',
    lightscreen: 'P. LUZ',
    spikes: 'PÚAS',
    safeguard: 'SALVAGUARDIA',
    mist: 'NEBLINA'
  };
  return map[id.toLowerCase()] || id.toUpperCase();
};

// Calcula el porcentaje de salud actual
const hpPercent = computed(() => {
  if (props.maxHp <= 0) return 0;
  return Math.round((props.hp / props.maxHp) * 100);
});

// Determina el color de la barra de salud (verde, amarillo, rojo)
const hpBarColorClass = computed(() => {
  const pct = hpPercent.value;
  if (pct > 50) return 'hp-green';
  if (pct > 20) return 'hp-yellow';
  return 'hp-red';
});

// Convierte códigos de estado de Showdown a nombres en español legibles
const getStatusBadgeText = (status?: string) => {
  if (!status) return '';
  const map: Record<string, string> = {
    psn: 'TÓX',
    tox: 'TÓX',
    par: 'PAR',
    brn: 'QUE',
    slp: 'SUE',
    frz: 'CON',
  };
  return map[status.toLowerCase()] || status.toUpperCase();
};

const showAbilityTooltip = ref(false);
const showNatureTooltip = ref(false);
</script>

<template>
  <div
    v-if="pokemon"
    class="hud-card"
    :class="[isPlayer ? 'player-hud' : 'enemy-hud']"
  >
    <!-- Header: Name, level and Status badge -->
    <div class="hud-header">
      <div class="name-status">
        <span class="poke-name">{{ pokemon.name.toUpperCase() }}</span>
        <ShowdownStatusTooltip
          v-if="pokemon.status && pokemon.status !== 'fnt'"
          :status-id="pokemon.status"
          :pokemon-name="pokemon.name"
          :base-stored-stats="pokemon.baseStoredStats"
          :stored-stats="pokemon.storedStats"
          :boosts="pokemon.boosts"
          :status-state="pokemon.statusState"
        >
          <span
            class="status-badge"
            :class="`badge-${pokemon.status.toLowerCase()}`"
          >
            {{ getStatusBadgeText(pokemon.status) }}
          </span>
        </ShowdownStatusTooltip>
      </div>
      <span class="poke-level">Nv50</span>
    </div>

    <!-- Types Row -->
    <div class="hud-types">
      <span 
        v-for="t in pokemon.types" 
        :key="t" 
        class="type-tag" 
        :class="`type-${t.toLowerCase()}`"
      >
        {{ t }}
      </span>
    </div>

    <!-- Metadata Row: Ability & Nature -->
    <div class="hud-metadata-row">
      <div 
        class="metadata-badge ability-badge"
        @mouseenter="showAbilityTooltip = true"
        @mouseleave="showAbilityTooltip = false"
      >
        <span class="badge-label">HAB</span>
        <span class="badge-value">{{ pokemon.ability || 'Ninguna' }}</span>
        
        <ShowdownAbilityTooltip
          :ability-name="pokemon.ability || ''"
          :pokemon-name="pokemon.name"
          :visible="showAbilityTooltip"
        />
      </div>

      <div 
        class="metadata-badge nature-badge"
        @mouseenter="showNatureTooltip = true"
        @mouseleave="showNatureTooltip = false"
      >
        <span class="badge-label">NAT</span>
        <span class="badge-value">{{ pokemon.nature || 'Neutra' }}</span>

        <ShowdownNatureTooltip
          :nature-name="pokemon.nature || ''"
          :pokemon-name="pokemon.name"
          :visible="showNatureTooltip"
        />
      </div>
    </div>

    <!-- HP Bar section -->
    <div class="hp-section">
      <div class="hp-label-row">
        <span class="hp-label">PS</span>
        <span class="hp-percent">
          <template v-if="isPlayer">
            {{ hp }} / {{ maxHp }}
          </template>
          <template v-else>
            {{ hpPercent }}%
          </template>
        </span>
      </div>
      <div class="hp-bar-outer">
        <div 
          :id="isPlayer ? 'player-hp' : 'enemy-hp'" 
          class="hp-bar-inner" 
          :class="hpBarColorClass"
          :style="{ width: `${hpPercent}%` }"
        />
      </div>
    </div>

    <!-- Party Status Tracker: 6 pixelated Pokéballs -->
    <ShowdownPartyTracker :team="team" />

    <!-- Active Side Conditions: Small translucent pills below the party tracker -->
    <div
      v-if="sideConditions && sideConditions.length > 0"
      class="side-conditions-row"
    >
      <ShowdownSideConditionTooltip
        v-for="cond in sideConditions"
        :key="cond.id"
        :condition-id="cond.id"
        :duration="cond.duration"
        :layers="cond.layers"
      >
        <span
          class="side-condition-pill"
          :class="`pill-${cond.id.toLowerCase()}`"
        >
          {{ getSideConditionEmoji(cond.id) }} {{ getSideConditionName(cond.id) }}
          <span
            v-if="cond.layers && cond.layers > 1"
            class="cond-count"
          >x{{ cond.layers }}</span>
          <span
            v-else-if="cond.duration"
            class="cond-count"
          >({{ cond.duration }})</span>
        </span>
      </ShowdownSideConditionTooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
.hud-card {
  position: absolute;
  width: 285px;
  background: Rgba(15, 18, 32, 0.75);
  backdrop-filter: Blur(12px);
  border: 1px solid Rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 
    0 15px 35px Rgba(0, 0, 0, 0.6),
    inset 0 1px 1px Rgba(255, 255, 255, 0.05);
  pointer-events: auto;
  z-index: 50;

  &.enemy-hud {
    top: 12%;
    left: 10%;
    border-left: 4px solid var(--red, #ff453a);
    box-shadow: 
      0 10px 30px Rgba(0, 0, 0, 0.5),
      0 0 15px Rgba(255, 69, 58, 0.15);
  }

  &.player-hud {
    bottom: 25%;
    right: 10%;
    border-right: 4px solid var(--blue, #0a84ff);
    box-shadow: 
      0 10px 30px Rgba(0, 0, 0, 0.5),
      0 0 15px Rgba(10, 132, 255, 0.15);
  }

  .hud-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .name-status {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .poke-name {
    font-family: var(--font-pixel);
    font-size: 11px;
    font-weight: bold;
    color: #f5f5f7;
    letter-spacing: 0.5px;
  }

  .poke-level {
    font-family: var(--font-pixel);
    font-size: 9px;
    color: var(--gray, #86868b);
  }

  .status-badge {
    font-family: var(--font-pixel);
    font-size: 6px;
    font-weight: bold;
    color: #fff;
    padding: 2px 4px;
    border-radius: 4px;
    text-shadow: 1px 1px 0 Rgba(0,0,0,0.5);
    box-shadow: 0 1px 3px Rgba(0,0,0,0.3);

    &.badge-psn, &.badge-tox { background-color: #bf5af2; } // Morado veneno
    &.badge-par { background-color: #ffd60a; color: #000; text-shadow: none; } // Amarillo parálisis
    &.badge-brn { background-color: #ff453a; } // Rojo quemado
    &.badge-slp { background-color: #8e8e93; } // Gris sueño
    &.badge-frz { background-color: #64d2ff; color: #000; text-shadow: none; } // Celeste hielo
  }

  .hud-types {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
  }

  .hud-metadata-row {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .metadata-badge {
    position: relative;
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-pixel);
    font-size: 6px;
    padding: 3px 6px;
    border-radius: 4px;
    background: Rgba(255, 255, 255, 0.05);
    border: 1px solid Rgba(255, 255, 255, 0.12);
    color: #e5e5ea;
    cursor: pointer;
    box-shadow: 0 2px 4px Rgba(0, 0, 0, 0.3);
    will-change: filter, transform;
    transition: background 0.2s, border-color 0.2s, transform 0.2s;
    flex: 1;
    justify-content: center;

    &:hover {
      background: Rgba(255, 255, 255, 0.1);
      transform: Translatey(-1px);
    }

    .badge-label {
      font-weight: bold;
      color: #86868b;
    }

    .badge-value {
      font-weight: bold;
      color: #f5f5f7;
    }

    &.ability-badge:hover {
      border-color: Rgba(96, 165, 250, 0.5);
      box-shadow: 0 0 8px Rgba(96, 165, 250, 0.2);
      .badge-label {
        color: #60a5fa;
      }
    }

    &.nature-badge:hover {
      border-color: Rgba(251, 191, 36, 0.5);
      box-shadow: 0 0 8px Rgba(251, 191, 36, 0.2);
      .badge-label {
        color: #fbbf24;
      }
    }
  }

  .type-tag {
    font-family: var(--font-pixel);
    font-size: 6px;
    padding: 3px 6px;
    border-radius: 4px;
    color: white;
    text-transform: uppercase;
    text-shadow: 1px 1px 0 #000;
    box-shadow: 0 2px 4px Rgba(0,0,0,0.3);
    border: 1px solid Rgba(0, 0, 0, 0.2);

    &.type-normal { background: linear-gradient(135deg, #A8A878, #8A8A5C); }
    &.type-fuego, &.type-fire { background: linear-gradient(135deg, #F08030, #C4611B); }
    &.type-agua, &.type-water { background: linear-gradient(135deg, #6890F0, #3E69C9); }
    &.type-planta, &.type-grass { background: linear-gradient(135deg, #78C850, #4E9A2D); }
    &.type-eléctrico, &.type-electrico, &.type-electric { background: linear-gradient(135deg, #F8D030, #C9A318); }
    &.type-hielo, &.type-ice { background: linear-gradient(135deg, #98D8D8, #60A5A5); }
    &.type-lucha, &.type-fighting { background: linear-gradient(135deg, #C03028, #8C1C17); }
    &.type-veneno, &.type-poison { background: linear-gradient(135deg, #A040A0, #732873); }
    &.type-tierra, &.type-ground { background: linear-gradient(135deg, #E0C068, #B09443); }
    &.type-volador, &.type-flying { background: linear-gradient(135deg, #A890F0, #7A5EC9); }
    &.type-psíquico, &.type-psiquico, &.type-psychic { background: linear-gradient(135deg, #F85888, #C4305D); }
    &.type-bicho, &.type-bug { background: linear-gradient(135deg, #A8B820, #7A8512); }
    &.type-roca, &.type-rock { background: linear-gradient(135deg, #B8A038, #8A7520); }
    &.type-fantasma, &.type-ghost { background: linear-gradient(135deg, #705898, #4D396B); }
    &.type-dragón, &.type-dragon { background: linear-gradient(135deg, #7038F8, #4719C2); }
    &.type-siniestro, &.type-dark { background: linear-gradient(135deg, #705848, #4D3A2F); }
    &.type-acero, &.type-steel { background: linear-gradient(135deg, #B8B8D0, #8A8AA3); }
    &.type-hada, &.type-fairy { background: linear-gradient(135deg, #EE99AC, #C26377); }
  }

  .hp-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 10px;
  }

  .hp-label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .hp-label {
    font-family: var(--font-pixel);
    font-size: 9px;
    color: var(--yellow, #ffd60a);
    font-weight: 900;
  }

  .hp-percent {
    font-family: var(--font-pixel);
    font-size: 7px;
    color: #f5f5f7;
  }

  .hp-bar-outer {
    height: 10px;
    width: 100%;
    background: #1a1a2e;
    border-radius: 5px;
    overflow: hidden;
    border: 1px solid Rgba(255, 255, 255, 0.1);
    box-shadow: inset 0 2px 4px Rgba(0,0,0,0.5);
  }

  .hp-bar-inner {
    height: 100%;
    border-radius: 5px;
    transition: width 0.1s linear;

    &.hp-green {
      background: linear-gradient(90deg, #32d74b 0%, #30d158 100%);
      box-shadow: 0 0 8px Rgba(50, 215, 75, 0.6);
    }

    &.hp-yellow {
      background: linear-gradient(90deg, #ffd60a 0%, #ffcc00 100%);
      box-shadow: 0 0 8px Rgba(255, 214, 10, 0.6);
    }

    &.hp-red {
      background: linear-gradient(90deg, #ff453a 0%, #ff3b30 100%);
      box-shadow: 0 0 8px Rgba(255, 69, 58, 0.6);
    }
  }



  .side-conditions-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed Rgba(255, 255, 255, 0.1);
  }

  .side-condition-pill {
    font-family: var(--font-pixel);
    font-size: 6px;
    padding: 3px 6px;
    border-radius: 4px;
    background: Rgba(255, 255, 255, 0.08);
    border: 1px solid Rgba(255, 255, 255, 0.15);
    color: #e5e5ea;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    cursor: pointer;
    box-shadow: 0 1px 3px Rgba(0, 0, 0, 0.3);
    will-change: filter, transform;
    transition: background 0.2s, transform 0.2s;

    &:hover {
      background: Rgba(255, 255, 255, 0.15);
      transform: Translatey(-1px);
    }

    .cond-count {
      color: var(--yellow, #ffd60a);
      font-weight: bold;
      margin-left: 2px;
    }

    &.pill-reflect {
      border-color: Rgba(162, 155, 254, 0.4);
      background: Rgba(162, 155, 254, 0.12);
    }
    &.pill-lightscreen {
      border-color: Rgba(255, 234, 167, 0.4);
      background: Rgba(255, 234, 167, 0.12);
    }
    &.pill-spikes {
      border-color: Rgba(225, 112, 85, 0.4);
      background: Rgba(225, 112, 85, 0.12);
    }
    &.pill-safeguard {
      border-color: Rgba(253, 121, 168, 0.4);
      background: Rgba(253, 121, 168, 0.12);
    }
    &.pill-mist {
      border-color: Rgba(129, 236, 236, 0.4);
      background: Rgba(129, 236, 236, 0.12);
    }
  }
}
</style>
