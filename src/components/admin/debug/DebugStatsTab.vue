<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { usePvPStore } from '@/stores/pvp'
import { useGymsStore } from '@/stores/gyms'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { GymId } from '@/data/world/gyms'

interface ViteDebugBridge extends Record<string, unknown> { // open-record: Generic key-value data dictionary container
  setMoney: (val: number) => void;
  setElo: (val: number) => void;
  setLevel: (val: number) => void;
  setBadges: (val: number) => void;
  winGym: (gymId: GymId, difficulty?: string) => void;
  resetBadges: () => void;
  setDominance: (faction: string) => void;
  setFaction: (faction: string) => void;
  setBattleCoins: (val: number) => void;
  setWarCoins: (val: number) => void;
}

const game = useGameStore()
const pvp = usePvPStore()
const gymsStore = useGymsStore()

const DEFAULT_DEBUG_MONEY_INPUT = 10000 as const
const debugMoney = ref(DEFAULT_DEBUG_MONEY_INPUT)
const debugElo = ref(pvp.elo)
const debugLevel = ref(game.state.trainerLevel)
const debugBattleCoins = ref(game.state.battleCoins || 0)
const debugWarCoins = ref(game.state.warCoins || 0)
const currentForcedFaction = ref('none')
const simDifficulty = ref('easy')

const isDefeated = (gymId: GymId) => {
  return (game.state.defeatedGyms || []).includes(gymId)
}

const simulateWin = (gymId: GymId) => {
  getDebugBridge().winGym(gymId, simDifficulty.value)
}

const resetAllBadges = () => {
  getDebugBridge().resetBadges()
}


const getDebugBridge = () => window.__VITE_DEBUG__ as ViteDebugBridge

// Call console commands directly (they handle securityCheck internally)
const addMoney = () => {
  const current = game.state.money;
  getDebugBridge().setMoney(current + debugMoney.value)
}
const setElo = () => getDebugBridge().setElo(debugElo.value)
const setLevel = () => getDebugBridge().setLevel(debugLevel.value)
const setBattleCoins = () => getDebugBridge().setBattleCoins(debugBattleCoins.value)
const setWarCoins = () => getDebugBridge().setWarCoins(debugWarCoins.value)
const forceDominance = (f: string) => {
  getDebugBridge().setDominance(f);
  currentForcedFaction.value = f
}

function setFaction(f: string) {
  getDebugBridge().setFaction(f)
}
</script>

<template>
  <div class="debug-grid">
    <div class="debug-card">
      <label>Dinero</label>
      <div class="input-group">
        <input
          v-model="debugMoney"
          type="number"
        >
        <PVTooltip title="Añade la cantidad de dinero especificada a tu cuenta.">
          <button @click.stop="addMoney">
            AÑADIR
          </button>
        </PVTooltip>
      </div>
    </div>

    <div class="debug-card">
      <label>ELO (Arena)</label>
      <div class="input-group">
        <input
          v-model="debugElo"
          type="number"
        >
        <PVTooltip title="Establece tu puntuación ELO de la Arena al valor indicado.">
          <button @click.stop="setElo">
            FIJAR
          </button>
        </PVTooltip>
      </div>
    </div>

    <div class="debug-card">
      <label>Nivel Entrenador</label>
      <div class="input-group">
        <input
          v-model="debugLevel"
          type="number"
        >
        <PVTooltip title="Establece tu nivel de entrenador.">
          <button @click.stop="setLevel">
            FIJAR
          </button>
        </PVTooltip>
      </div>
    </div>

    <div class="debug-card">
      <label>Battle Coins (BC)</label>
      <div class="input-group">
        <input
          v-model="debugBattleCoins"
          type="number"
        >
        <PVTooltip title="Establece tus Battle Coins (BC).">
          <button @click.stop="setBattleCoins">
            FIJAR
          </button>
        </PVTooltip>
      </div>
    </div>

    <div class="debug-card">
      <label>Monedas de Guerra</label>
      <div class="input-group">
        <input
          v-model="debugWarCoins"
          type="number"
        >
        <PVTooltip title="Establece tus Monedas de Guerra.">
          <button @click.stop="setWarCoins">
            FIJAR
          </button>
        </PVTooltip>
      </div>
    </div>



    <div class="debug-card badges-debug-card">
      <div class="card-header-flex">
        <label>Medallas ({{ game.state.badges }}/8)</label>
        <div class="header-actions">
          <div class="sim-diff-selector">
            <span>DIFICULTAD:</span>
            <button 
              v-for="d in ['easy', 'normal', 'hard']" 
              :key="d"
              class="sim-diff-btn"
              :class="{ active: simDifficulty === d, [d]: true }"
              @click.stop="simDifficulty = d"
            >
              {{ d.charAt(0).toUpperCase() }}
            </button>
          </div>
          <button
            class="reset-btn-debug"
            @click.stop="resetAllBadges"
          >
            RESETEAR
          </button>
        </div>
      </div>
      <div class="badges-debug-grid">
        <PVTooltip
          v-for="g in gymsStore.gyms"
          :key="g.id"
          :title="`Simular Victoria: ${g.badgeName} (${g.leader})`"
        >
          <div
            class="badge-debug-item"
            :class="{ active: isDefeated(g.id) }"
            @click.stop="simulateWin(g.id)"
          >
            <img
              :src="getAssetUrl(ASSET_TYPES.BADGE, g.id)"
              :alt="g.badgeName"
              class="badge-sprite"
              @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
            >
            <span class="badge-lbl">{{ g.leader }}</span>
          </div>
        </PVTooltip>
      </div>
    </div>

    <div class="debug-card">
      <label>Dominio Global (Mapa)</label>
      <div class="button-row">
        <PVTooltip title="Forzar que todo el mapa pertenezca al bando PODER.">
          <button
            class="faction-btn power"
            :class="{ active: currentForcedFaction === 'poder' }"
            @click.stop="forceDominance('poder')"
          >
            PODER
          </button>
        </PVTooltip>
        <PVTooltip title="Forzar que todo el mapa pertenezca al bando UNIÓN.">
          <button
            class="faction-btn union"
            :class="{ active: currentForcedFaction === 'union' }"
            @click.stop="forceDominance('union')"
          >
            UNIÓN
          </button>
        </PVTooltip>
        <PVTooltip title="Restaurar el dominio real del mapa basado en el servidor.">
          <button
            class="faction-btn neutral"
            :class="{ active: currentForcedFaction === 'none' }"
            @click.stop="forceDominance('none')"
          >
            NEUTRAL
          </button>
        </PVTooltip>
      </div>
    </div>

    <div class="debug-card">
      <label>Bando Jugador</label>
      <div class="button-row">
        <PVTooltip title="Unirte al bando PODER.">
          <button
            class="faction-btn power"
            :class="{ active: game.state.faction === 'poder' }"
            @click.stop="setFaction('poder')"
          >
            PODER
          </button>
        </PVTooltip>
        <PVTooltip title="Unirte al bando UNIÓN.">
          <button
            class="faction-btn union"
            :class="{ active: game.state.faction === 'union' }"
            @click.stop="setFaction('union')"
          >
            UNIÓN
          </button>
        </PVTooltip>
        <PVTooltip title="Abandonar bando actual y quedar libre.">
          <button
            class="faction-btn neutral"
            :class="{ active: !game.state.faction }"
            @click.stop="setFaction('none')"
          >
            LIBRE
          </button>
        </PVTooltip>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/debug";

.badges-debug-card {
  grid-column: span 2;

  @media (width <= 768px) {
    grid-column: span 1;
  }

  .card-header-flex {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;

    label { margin-bottom: 0; }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .sim-diff-selector {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 4px;
    border: 1px solid Rgb(255 255 255 / 5%);
    border-radius: 6px;
    background: Rgb(0 0 0 / 30%);

    span {
      @include pixelated;

      font-size: 5px;
      opacity: 0.5;
      margin-right: 2px;
    }
  }

  .sim-diff-btn {
    @include pixelated;
    
    display: flex;
    justify-content: center;
    align-items: center;
    width: 18px;
    height: 18px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: var(--gray);
    font-size: 6px;
    cursor: pointer;

    &.active {
      background: Rgb(255 255 255 / 5%);
      color: var(--white);
      &.easy { color: #22c55e; border-color: Rgb(34 197 94 / 50%); }
      &.normal { color: #ffd700; border-color: Rgb(255 215 0 / 50%); }
      &.hard { color: #ef4444; border-color: Rgb(239 68 68 / 50%); }
    }
  }

  .reset-btn-debug {
    @include pixelated;

    padding: 4px 10px;
    border: 1px solid Rgb(239 68 68 / 30%);
    border-radius: 6px;
    background: Rgb(239 68 68 / 15%);
    color: #ff6b6b;
    font-size: 6px;
    cursor: pointer;
    

    &:hover {
      background: Rgb(239 68 68 / 30%);
      transform: Translatey(-1px);
      border-color: #ff6b6b;
    }
    
    &:active {
      transform: Translatey(0);
    }
  }
}

.badges-debug-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  margin-top: 8px;
}

.badge-debug-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-width: 65px;
  max-width: 95px;
  padding: 8px 4px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: 8px;
  background: Rgb(255 255 255 / 3%);
  opacity: 0.45;
  flex: 1 1 calc(12.5% - 8px);
  cursor: pointer;
  user-select: none;
  filter: Grayscale(100%);
  will-change: filter;
  box-sizing: border-box;

  &:hover {
    background: Rgb(255 255 255 / 8%);
    opacity: 0.75;
    transform: Translatey(-2px);
    border-color: Rgb(255 255 255 / 20%);
    filter: none;
  }

  &.active {
    background: Rgb(255 215 0 / 8%);
    opacity: 1;
    filter: none;
    border-color: Rgb(255 215 0 / 45%);
    box-shadow: 0 0 10px Rgb(255 215 0 / 15%), inset 0 0 4px Rgb(255 215 0 / 10%);

    .badge-lbl {
      color: #ffd700;
      text-shadow: 0 0 6px Rgb(255 215 0 / 30%);
    }
  }

  .badge-sprite {
    width: 24px;
    height: 24px;
    object-fit: contain;
    margin-bottom: 4px;
  }

  .badge-lbl {
    color: Rgb(255 255 255 / 50%);
    font-family: var(--font-pixel, monospace);
    font-size: 8px;
    text-align: center;
    text-transform: uppercase;
    white-space: nowrap;
    margin-top: 2px;
  }
}
</style>
