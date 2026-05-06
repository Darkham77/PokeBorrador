<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { usePvPStore } from '@/stores/pvp'
const game = useGameStore() as any
const pvp = usePvPStore() as any

const debugMoney = ref(10000)
const debugElo = ref(pvp.elo)
const debugLevel = ref(game.state.trainerLevel)
const debugBadges = ref(game.state.badges)
const currentForcedFaction = ref('none')

// Call console commands directly (they handle securityCheck internally)
const addMoney = () => {
  const current = game.state.money;
  (window as any).__VITE_DEBUG__.setMoney(current + debugMoney.value)
}
const setElo = () => (window as any).__VITE_DEBUG__.setElo(debugElo.value)
const setLevel = () => (window as any).__VITE_DEBUG__.setLevel(debugLevel.value)
const setBadges = () => (window as any).__VITE_DEBUG__.setBadges(debugBadges.value)
const forceDominance = (f: string) => {
  (window as any).__VITE_DEBUG__.setDominance(f);
  currentForcedFaction.value = f
}

function setFaction(f: string) {
  (window as any).__VITE_DEBUG__.setFaction(f)
}

function setPlayerClass(c: string) {
  (window as any).__VITE_DEBUG__.setPlayerClass(c)
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
      <label>Medallas</label>
      <div class="input-group">
        <input
          v-model="debugBadges"
          type="number"
          min="0"
          max="8"
        >
        <PVTooltip title="Actualiza el contador de medallas de gimnasio.">
          <button @click.stop="setBadges">
            FIJAR
          </button>
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

    <div class="debug-card">
      <label>Clase Jugador</label>
      <div class="button-row wrap">
        <PVTooltip
          v-for="c in ['entrenador', 'criador', 'cazabichos', 'rocket']"
          :key="c"
          :title="`Cambiar tu clase a ${c.toUpperCase()}.`"
        >
          <button
            class="small-btn"
            :class="{ active: game.state.playerClass === c }"
            @click.stop="setPlayerClass(c)"
          >
            {{ c.toUpperCase() }}
          </button>
        </PVTooltip>
        <PVTooltip title="Resetear tu clase de jugador.">
          <button
            class="small-btn"
            @click.stop="setPlayerClass('none')"
          >
            RESETEAR
          </button>
        </PVTooltip>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/debug";
</style>
