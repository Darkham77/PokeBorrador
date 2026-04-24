<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { usePvPStore } from '@/stores/pvp'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import PVTooltip from '@/components/common/PVTooltip.vue'

const _auth = useAuthStore()
const game = useGameStore()
const pvp = usePvPStore()
const ui = useUIStore()
const _mapStore = useMapStore()

const debugMoney = ref(10000)
const debugElo = ref(pvp.elo)
const debugLevel = ref(game.state.trainerLevel)
const debugBadges = ref(game.state.badges)
const currentForcedFaction = ref('none')

// Call console commands directly (they handle securityCheck internally)
const addMoney = () => {
  const current = game.state.money
  window.__VITE_DEBUG__.setMoney(current + debugMoney.value)
}
const setElo = () => window.__VITE_DEBUG__.setElo(debugElo.value)
const setLevel = () => window.__VITE_DEBUG__.setLevel(debugLevel.value)
const setBadges = () => window.__VITE_DEBUG__.setBadges(debugBadges.value)
const forceDominance = (f) => {
  window.__VITE_DEBUG__.setDominance(f)
  currentForcedFaction.value = f
}

function setFaction(f) {
  window.__VITE_DEBUG__.setFaction(f)
}

function setPlayerClass(c) {
  window.__VITE_DEBUG__.setPlayerClass(c)
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
          <button @click="addMoney">
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
          <button @click="setElo">
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
          <button @click="setLevel">
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
          <button @click="setBadges">
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
            @click="forceDominance('poder')"
          >
            PODER
          </button>
        </PVTooltip>
        <PVTooltip title="Forzar que todo el mapa pertenezca al bando UNIÓN.">
          <button
            class="faction-btn union"
            :class="{ active: currentForcedFaction === 'union' }"
            @click="forceDominance('union')"
          >
            UNIÓN
          </button>
        </PVTooltip>
        <PVTooltip title="Restaurar el dominio real del mapa basado en el servidor.">
          <button
            class="faction-btn neutral"
            :class="{ active: currentForcedFaction === 'none' }"
            @click="forceDominance('none')"
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
            @click="setFaction('poder')"
          >
            PODER
          </button>
        </PVTooltip>
        <PVTooltip title="Unirte al bando UNIÓN.">
          <button
            class="faction-btn union"
            :class="{ active: game.state.faction === 'union' }"
            @click="setFaction('union')"
          >
            UNIÓN
          </button>
        </PVTooltip>
        <PVTooltip title="Abandonar bando actual y quedar libre.">
          <button
            class="faction-btn neutral"
            :class="{ active: !game.state.faction }"
            @click="setFaction('none')"
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
            @click="setPlayerClass(c)"
          >
            {{ c.toUpperCase() }}
          </button>
        </PVTooltip>
        <PVTooltip title="Resetear tu clase de jugador.">
          <button
            class="small-btn"
            @click="setPlayerClass('none')"
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
