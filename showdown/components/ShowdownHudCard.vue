<script setup lang="ts">
import { computed } from 'vue';

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
}

const props = defineProps<{
  pokemon: SandboxPokemon | null;
  hp: number;
  maxHp: number;
  team: SandboxPokemon[];
  isPlayer: boolean;
}>();

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

// Obtiene de forma segura un miembro del equipo por su índice
const getMember = (index: number): SandboxPokemon | undefined => {
  return props.team[index];
};
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
        <span
          v-if="pokemon.status && pokemon.status !== 'fnt'"
          class="status-badge"
          :class="`badge-${pokemon.status.toLowerCase()}`"
        >
          {{ getStatusBadgeText(pokemon.status) }}
        </span>
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
    <div class="party-tracker">
      <div
        v-for="idx in 6"
        :key="`ball-${idx}`"
        class="party-ball-slot"
      >
        <!-- Slot vacío (sin Pokémon cargado en ese índice) -->
        <div
          v-if="idx - 1 >= team.length || !getMember(idx - 1)"
          class="ball-pixel ball-empty"
          title="Ranura Vacía"
        />
        <!-- Pokémon debilitado -->
        <div
          v-else-if="getMember(idx - 1)?.hp === 0 || getMember(idx - 1)?.status === 'fnt'"
          class="ball-pixel ball-fainted"
          :title="`${getMember(idx - 1)?.name || ''} (Debilitado)`"
        >
          <span class="cross-faint">×</span>
        </div>
        <!-- Pokémon con estado alterado -->
        <div
          v-else-if="getMember(idx - 1)?.status"
          class="ball-pixel ball-status"
          :class="`ball-status-${getMember(idx - 1)?.status?.toLowerCase()}`"
          :title="`${getMember(idx - 1)?.name || ''} (${getStatusBadgeText(getMember(idx - 1)?.status)})`"
        />
        <!-- Pokémon vivo y saludable -->
        <div
          v-else
          class="ball-pixel ball-healthy"
          :title="getMember(idx - 1)?.name || ''"
        />
      </div>
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
    margin-bottom: 12px;
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

    &.type-fire { background: linear-gradient(135deg, #ff453a, #ff9f0a); }
    &.type-water { background: linear-gradient(135deg, #0a84ff, #58a6ff); }
    &.type-flying { background: linear-gradient(135deg, #bf5af2, #0a84ff); }
    &.type-ground { background: linear-gradient(135deg, #e0a96d, #8b5a2b); }
    &.type-grass { background: linear-gradient(135deg, #30d158, #34c759); }
    &.type-normal { background: linear-gradient(135deg, #8e8e93, #aeaea2); }
    &.type-poison { background: linear-gradient(135deg, #af52de, #bf5af2); }
    &.type-electric { background: linear-gradient(135deg, #ffd60a, #ffcc00); }
    &.type-ice { background: linear-gradient(135deg, #5ac8fa, #64d2ff); }
    &.type-psychic { background: linear-gradient(135deg, #ff2d55, #ff375f); }
    &.type-dragon { background: linear-gradient(135deg, #5856d6, #007aff); }
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

  /* --- Party Status Tracker (Pokéballs Grid) --- */
  .party-tracker {
    display: flex;
    justify-content: flex-start;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px dashed Rgba(255, 255, 255, 0.1);
  }

  .party-ball-slot {
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ball-pixel {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1px solid Rgba(0, 0, 0, 0.8);
    position: relative;
    box-shadow: 0 1px 3px Rgba(0, 0, 0, 0.5);

    /* Pokéball clásica viva */
    &.ball-healthy {
      background: linear-gradient(180deg, #ff3b30 50%, #ffffff 50%);
      
      &::after {
        content: "";
        position: absolute;
        width: 4px;
        height: 4px;
        background: #fff;
        border: 1px solid #000;
        border-radius: 50%;
        top: 3px;
        left: 3px;
      }
    }

    /* Pokéball debilitada */
    &.ball-fainted {
      background: linear-gradient(180deg, #8e8e93 50%, #48484a 50%);
      opacity: 0.5;
      display: flex;
      align-items: center;
      justify-content: center;

      .cross-faint {
        font-size: 8px;
        color: #ff3b30;
        font-weight: bold;
        line-height: 1;
        position: relative;
        top: -1px;
      }
    }

    /* Ranura vacía (sin Pokémon asignado) */
    &.ball-empty {
      background: #1c1c1e;
      border: 1px dashed Rgba(255, 255, 255, 0.2);
      box-shadow: none;
    }

    /* Pokéballs con estado alterado */
    &.ball-status {
      &::after {
        content: "";
        position: absolute;
        width: 4px;
        height: 4px;
        background: #fff;
        border: 1px solid #000;
        border-radius: 50%;
        top: 3px;
        left: 3px;
      }

      &-psn, &-tox { background: linear-gradient(180deg, #bf5af2 50%, #ffffff 50%); }
      &-par { background: linear-gradient(180deg, #ffd60a 50%, #ffffff 50%); }
      &-brn { background: linear-gradient(180deg, #ff9f0a 50%, #ffffff 50%); }
      &-slp { background: linear-gradient(180deg, #8e8e93 50%, #ffffff 50%); }
      &-frz { background: linear-gradient(180deg, #64d2ff 50%, #ffffff 50%); }
    }
  }
}
</style>
