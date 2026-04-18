<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { TYPE_CHART } from '@/data/types'

const uiStore = useUIStore()

const currentData = computed(() => uiStore.currentMoveToLearn)
const pokemon = computed(() => currentData.value?.pokemon)
const newMove = computed(() => currentData.value?.move)

const typeColors = {
  normal:'#A8A878', fire:'#F08030', water:'#6890F0', grass:'#78C850', electric:'#F8D030',
  ice:'#98D8D8', fighting:'#C03028', poison:'#A040A0', ground:'#E0C068', flying:'#A890F0',
  psychic:'#F85888', bug:'#A8B820', rock:'#B8A038', ghost:'#705898', dragon:'#7038F8',
  dark:'#705848', steel:'#B8B8D0', fairy:'#EE99AC',
}

const getMoveColor = (name) => {
  const md = pokemonDataProvider.getMoveData(name) || {}
  return typeColors[md.type] || '#6b7280'
}

const getMoveType = (name) => {
  const md = pokemonDataProvider.getMoveData(name) || {}
  return md.type ? md.type.toUpperCase() : '?'
}

const getMovePower = (name) => {
  const md = pokemonDataProvider.getMoveData(name) || {}
  return md.power || '—'
}

const handleReplace = (slotIndex) => {
  if (!pokemon.value || !newMove.value) return
  
  const oldMoveName = pokemon.value.moves[slotIndex].name
  pokemon.value.moves[slotIndex] = { ...newMove.value }
  
  uiStore.notify(`¡${pokemon.value.name} olvidó ${oldMoveName} y aprendió ${newMove.value.name}!`, '📖')
  uiStore.finishMoveLearning()
}

const handleForget = () => {
  if (!pokemon.value || !newMove.value) return
  uiStore.notify(`¡${pokemon.value.name} no aprendió ${newMove.value.name}!`, '📖')
  uiStore.finishMoveLearning()
}
</script>

<template>
  <div
    v-if="currentData"
    class="learning-overlay"
  >
    <div class="learning-card animate-pop">
      <header class="card-header">
        <div class="header-badge">
          NUEVO MOVIMIENTO
        </div>
        <h2>APRENDIENDO TÉCNICA</h2>
        <p><strong>{{ pokemon?.name }}</strong> quiere aprender <span class="highlight">{{ newMove?.name }}</span>.</p>
      </header>

      <div class="new-move-display">
        <div
          class="move-card is-new"
          :style="{ '--move-color': getMoveColor(newMove?.name) }"
        >
          <div class="move-main">
            <span class="move-name">{{ newMove?.name }}</span>
            <span class="move-type-tag">{{ getMoveType(newMove?.name) }}</span>
          </div>
          <div class="move-stats">
            <span>POT: {{ getMovePower(newMove?.name) }}</span>
            <span>PP: {{ newMove?.maxPP }}</span>
          </div>
        </div>
      </div>

      <div class="instruction">
        ¿Qué movimiento debería olvidar?
      </div>

      <div class="moves-list">
        <div 
          v-for="(m, index) in pokemon?.moves" 
          :key="index"
          class="move-card"
          :style="{ '--move-color': getMoveColor(m.name) }"
          @click="handleReplace(index)"
        >
          <div class="move-main">
            <span class="move-name">{{ m.name }}</span>
            <span class="move-type-tag">{{ getMoveType(m.name) }}</span>
          </div>
          <div class="move-stats">
            <span>POT: {{ getMovePower(m.name) }}</span>
            <span>PP: {{ m.pp }} / {{ m.maxPP }}</span>
          </div>
          <div class="replace-label">
            REEMPLAZAR
          </div>
        </div>
      </div>

      <button
        class="forget-btn"
        @click="handleForget"
      >
        ❌ CANCELAR Y NO APRENDER
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.learning-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.92);
  backdrop-filter: blur(10px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.learning-card {
  width: 100%;
  max-width: 420px;
  background: #0a0a0a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 28px;
  padding: 24px;
  box-shadow: 0 30px 60px rgba(0,0,0,0.8);
}

.card-header {
  text-align: center;
  margin-bottom: 24px;

  .header-badge {
    display: inline-block;
    padding: 4px 12px;
    background: var(--yellow);
    color: #000;
    font-family: 'Press Start 2P', cursive;
    font-size: 8px;
    border-radius: 8px;
    margin-bottom: 12px;
  }

  h2 {
    font-family: 'Press Start 2P', cursive;
    font-size: 14px;
    color: #fff;
    margin: 0 0 12px 0;
  }

  p {
    font-size: 13px;
    color: var(--gray);
    margin: 0;
    .highlight { color: var(--yellow); font-weight: 800; }
  }
}

.new-move-display {
  margin-bottom: 24px;
}

.instruction {
  font-family: 'Press Start 2P', cursive;
  font-size: 8px;
  color: var(--gray);
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.moves-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}

.move-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;

  &:hover {
    background: rgba(255,255,255,0.06);
    border-color: var(--move-color);
    transform: translateX(4px);
    
    .replace-label { opacity: 1; transform: translateX(0); }
  }

  &.is-new {
    background: rgba(255, 217, 61, 0.05);
    border: 2px solid var(--move-color);
    box-shadow: 0 0 20px rgba(255, 217, 61, 0.1);
    cursor: default;
    &:hover { transform: none; }
  }

  .move-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;

    .move-name { font-size: 15px; font-weight: 800; color: #fff; }
    .move-type-tag {
      font-size: 9px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 6px;
      background: var(--move-color);
      color: #fff;
    }
  }

  .move-stats {
    display: flex;
    gap: 15px;
    font-size: 11px;
    color: var(--gray);
    font-weight: 600;
  }

  .replace-label {
    position: absolute;
    right: 14px;
    bottom: 14px;
    font-family: 'Press Start 2P', cursive;
    font-size: 7px;
    color: #ef4444;
    opacity: 0;
    transform: translateX(10px);
    transition: all 0.2s;
  }
}

.forget-btn {
  width: 100%;
  padding: 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  color: var(--gray);
  font-family: 'Press Start 2P', cursive;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #f87171;
    border-color: #ef4444;
  }
}

.animate-pop { animation: pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes pop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>
