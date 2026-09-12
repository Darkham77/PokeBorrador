<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useDebugStore } from '@/stores/debug'

interface ViteDebugBridge extends Record<string, unknown> { // open-record: Generic key-value data dictionary container
  setClassLevel: (val: number) => void;
  setReputation: (val: number) => void;
  setPlayerClass: (cls: string) => void;
  clearClassCooldowns: () => void;
  toggleFastRankedDelay?: () => boolean;
}

const game = useGameStore()
const debugStore = useDebugStore()

const debugClassLevel = ref(game.state.classLevel || 1)
const debugReputation = ref(game.state.classData?.reputation || 0)

const isFastRanked = computed(() => debugStore.fastRankedDelay)

const getDebugBridge = () => window.__VITE_DEBUG__ as ViteDebugBridge

const setClassLevel = () => getDebugBridge().setClassLevel(debugClassLevel.value)
const setReputation = () => getDebugBridge().setReputation(debugReputation.value)
function setPlayerClass(c: string) {
  getDebugBridge().setPlayerClass(c)
}
function clearClassCooldowns() {
  getDebugBridge().clearClassCooldowns()
}
function toggleFastRanked() {
  debugStore.fastRankedDelay = !debugStore.fastRankedDelay
}
</script>

<template>
  <div class="debug-grid">
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

    <div class="debug-card">
      <label>Cooldowns de Clases</label>
      <div class="button-row">
        <PVTooltip title="Elimina todos los cooldowns de clases (Rutas preferidas, Extorsión, Escáner IVs, etc.), Centro Pokémon y perfil">
          <button
            class="small-btn"
            style="background-color: #ef4444; color: white;"
            @click.stop="clearClassCooldowns"
          >
            <span class="emoji">⚡</span> ELIMINAR COOLDOWNS
          </button>
        </PVTooltip>
      </div>
    </div>

    <div class="debug-card">
      <label>Nivel Clase</label>
      <div class="input-group">
        <input
          v-model="debugClassLevel"
          type="number"
        >
        <PVTooltip title="Establece tu nivel de la clase activa.">
          <button @click.stop="setClassLevel">
            FIJAR
          </button>
        </PVTooltip>
      </div>
    </div>

    <div class="debug-card">
      <label>Reputación</label>
      <div class="input-group">
        <input
          v-model="debugReputation"
          type="number"
        >
        <PVTooltip title="Establece tu reputación (clase Entrenador).">
          <button @click.stop="setReputation">
            FIJAR
          </button>
        </PVTooltip>
      </div>
    </div>

    <div class="debug-card">
      <label>Demora Entrada a Ranked</label>
      <div class="button-row">
        <PVTooltip title="Alterna la demora para entrar a Ranked entre 5s (rápido para pruebas) y 60s (normal).">
          <button
            class="small-btn"
            :class="{ active: isFastRanked }"
            @click.stop="toggleFastRanked"
          >
            <span class="emoji">⏱️</span>
            {{ isFastRanked ? 'ESPERA RANKED: 5s (ACTIVO)' : 'ESPERA RANKED: 60s (NORMAL)' }}
          </button>
        </PVTooltip>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/debug";
</style>
