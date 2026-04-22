<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { usePvPStore } from '@/stores/pvp'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'

const props = defineProps({
  securityCheck: { type: Function, required: true }
})

const auth = useAuthStore()
const game = useGameStore()
const pvp = usePvPStore()
const ui = useUIStore()
const mapStore = useMapStore()

const debugMoney = ref(10000)
const debugElo = ref(pvp.elo)
const debugLevel = ref(game.state.trainerLevel)
const debugBadges = ref(game.state.badges)
const currentForcedFaction = ref('none')

function addMoney() {
  if (!props.securityCheck()) return
  game.state.money += debugMoney.value
  ui.notify(`Debug: +₽${debugMoney.value}`, '💰')
  game.saveGame(false)
}

function setElo() {
  if (!props.securityCheck()) return
  pvp.elo = debugElo.value
  ui.notify(`Debug: ELO fijado en ${debugElo.value}`, '⚔️')
  game.db.from('profiles').update({ elo_rating: pvp.elo }).eq('id', auth.user.id)
}

function setLevel() {
  if (!props.securityCheck()) return
  game.state.trainerLevel = debugLevel.value
  ui.notify(`Debug: Nivel fijado en ${debugLevel.value}`, '📈')
  game.saveGame(false)
}

function setBadges() {
  if (!props.securityCheck()) return
  game.state.badges = debugBadges.value
  ui.notify(`Debug: Medallas fijadas en ${debugBadges.value}`, '🎖️')
  game.saveGame(false)
}

function forceDominance(faction) {
  if (!props.securityCheck()) return
  const winnerMap = {}
  if (faction !== 'none') {
    mapStore.maps.forEach(m => {
      winnerMap[m.id] = { winner_faction: faction }
    })
  }
  mapStore.mapWinners = winnerMap
  currentForcedFaction.value = faction
  ui.notify(`Debug: Dominio global fijado en ${faction === 'none' ? 'NEUTRAL' : faction.toUpperCase()}`, '🚩')
}

function setFaction(f) {
  game.state.faction = f === 'none' ? null : f
  ui.notify(`Debug: Bando cambiado a ${f.toUpperCase()}`, '🚩')
  game.saveGame(false)
}

function setPlayerClass(c) {
  game.state.playerClass = c === 'none' ? null : c
  ui.notify(`Debug: Clase cambiada a ${c.toUpperCase()}`, '🎓')
  game.saveGame(false)
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
        <button @click="addMoney">
          AÑADIR
        </button>
      </div>
    </div>

    <div class="debug-card">
      <label>ELO (Arena)</label>
      <div class="input-group">
        <input
          v-model="debugElo"
          type="number"
        >
        <button @click="setElo">
          FIJAR
        </button>
      </div>
    </div>

    <div class="debug-card">
      <label>Nivel Entrenador</label>
      <div class="input-group">
        <input
          v-model="debugLevel"
          type="number"
        >
        <button @click="setLevel">
          FIJAR
        </button>
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
        <button @click="setBadges">
          FIJAR
        </button>
      </div>
    </div>

    <div class="debug-card">
      <label>Dominio Global (Mapa)</label>
      <div class="button-row">
        <button
          class="faction-btn power"
          :class="{ active: currentForcedFaction === 'poder' }"
          @click="forceDominance('poder')"
        >
          PODER
        </button>
        <button
          class="faction-btn union"
          :class="{ active: currentForcedFaction === 'union' }"
          @click="forceDominance('union')"
        >
          UNIÓN
        </button>
        <button
          class="faction-btn neutral"
          :class="{ active: currentForcedFaction === 'none' }"
          @click="forceDominance('none')"
        >
          NEUTRAL
        </button>
      </div>
    </div>

    <div class="debug-card">
      <label>Bando Jugador</label>
      <div class="button-row">
        <button
          class="faction-btn power"
          :class="{ active: game.state.faction === 'poder' }"
          @click="setFaction('poder')"
        >
          PODER
        </button>
        <button
          class="faction-btn union"
          :class="{ active: game.state.faction === 'union' }"
          @click="setFaction('union')"
        >
          UNIÓN
        </button>
        <button
          class="faction-btn neutral"
          :class="{ active: !game.state.faction }"
          @click="setFaction('none')"
        >
          LIBRE
        </button>
      </div>
    </div>

    <div class="debug-card">
      <label>Clase Jugador</label>
      <div class="button-row wrap">
        <button
          v-for="c in ['entrenador', 'criador', 'cazabichos', 'rocket']"
          :key="c"
          class="small-btn"
          :class="{ active: game.state.playerClass === c }"
          @click="setPlayerClass(c)"
        >
          {{ c.toUpperCase() }}
        </button>
        <button
          class="small-btn"
          @click="setPlayerClass('none')"
        >
          RESETEAR
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/debug";
</style>
