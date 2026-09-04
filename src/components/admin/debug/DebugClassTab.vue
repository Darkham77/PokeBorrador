<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '@/stores/game'

interface ViteDebugBridge extends Record<string, unknown> { // open-record: Generic key-value data dictionary container
  setClassLevel: (val: number) => void;
  setReputation: (val: number) => void;
  setPlayerClass: (cls: string) => void;
  clearClassCooldowns: () => void;
}

const game = useGameStore()

const debugClassLevel = ref(game.state.classLevel || 1)
const debugReputation = ref(game.state.classData?.reputation || 0)

const getDebugBridge = () => window.__VITE_DEBUG__ as ViteDebugBridge

const setClassLevel = () => getDebugBridge().setClassLevel(debugClassLevel.value)
const setReputation = () => getDebugBridge().setReputation(debugReputation.value)
function setPlayerClass(c: string) {
  getDebugBridge().setPlayerClass(c)
}
function clearClassCooldowns() {
  getDebugBridge().clearClassCooldowns()
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
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/debug";
</style>
