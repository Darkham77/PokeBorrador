<script setup>
import { computed, ref, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { POKEMON_DB } from '@/data/pokemonDB'
import { EVOLUTION_TABLE } from '@/data/evolutionData'

const props = defineProps({
  pokemon: { type: Object, required: true },
  onClose: { type: Function, required: true },
  onLearned: { type: Function, required: true }
})

const gameStore = useGameStore()
const uiStore = useUIStore()

const forgottenMoves = computed(() => {
  const p = props.pokemon
  const learnedMoves = p.moves.map(m => m.name)
  const possibleMoves = []
  const processedIds = new Set()
  
  let currentId = p.id
  
  // Trace back evolution chain to gather all potential moves
  while (currentId && !processedIds.has(currentId)) {
    processedIds.add(currentId)
    const dbEntry = POKEMON_DB[currentId]
    
    if (dbEntry && dbEntry.learnset) {
      dbEntry.learnset.forEach(m => {
        // Only moves at or below current level
        if (m.lv <= p.level && !learnedMoves.includes(m.name)) {
          // Avoid duplicates if multiple stages learn the same move
          if (!possibleMoves.find(pm => pm.name === m.name)) {
            possibleMoves.push({ ...m, fromId: currentId })
          }
        }
      })
    }
    
    // Find previous stage
    const prevEntry = Object.entries(EVOLUTION_TABLE).find(([id, data]) => data.to === currentId)
    currentId = prevEntry ? prevEntry[0] : null
  }
  
  return possibleMoves.sort((a, b) => (a.lv || 0) - (b.lv || 0))
})

const handleRelearn = (move) => {
  const p = props.pokemon
  const itemName = 'Recordador de Movimientos'
  
  if (!gameStore.state.inventory[itemName]) {
    uiStore.notify('No tienes Recordadores de Movimientos.', '⚠️')
    return
  }

  // If moves < 4, just add it
  if (p.moves.length < 4) {
    p.moves.push({ name: move.name, pp: move.pp, maxPP: move.pp })
    consumeItem(itemName)
    uiStore.notify(`¡${p.name} recordó ${move.name.toUpperCase()}!`, '🧠')
    props.onLearned(true)
    props.onClose()
  } else {
    // If moves == 4, we need to forget one
    // We bridge to the existing LearnMoveMenu if available, or handle it here
    uiStore.openLearnMoveMenu(p, { name: move.name, pp: move.pp, maxPP: move.pp }, (success) => {
      if (success) {
        consumeItem(itemName)
        props.onLearned(true)
        props.onClose()
      }
    })
  }
}

const consumeItem = (name) => {
  gameStore.state.inventory[name]--
  if (gameStore.state.inventory[name] <= 0) delete gameStore.state.inventory[name]
  gameStore.save()
}
</script>

<template>
  <div
    class="relearner-overlay"
    @click.self="onClose"
  >
    <div class="relearner-card">
      <div class="header">
        <div class="brain-icon">
          🧠
        </div>
        <h3>RECORDADOR DE MOVIMIENTOS</h3>
        <p>¿Qué movimiento debe recordar {{ pokemon.name }}?</p>
      </div>

      <div class="moves-list custom-scroll">
        <div
          v-if="forgottenMoves.length === 0"
          class="empty-msg"
        >
          No hay movimientos olvidados para este nivel.
        </div>

        <button 
          v-for="mv in forgottenMoves" 
          :key="mv.name"
          class="move-row"
          @click="handleRelearn(mv)"
        >
          <div class="move-info">
            <span class="move-name">{{ mv.name }}</span>
            <span class="move-lv">Nv. {{ mv.lv || '—' }}</span>
          </div>
          <div class="move-pp">
            PP {{ mv.pp }}/{{ mv.pp }}
          </div>
        </button>
      </div>

      <button
        class="cancel-btn"
        @click="onClose"
      >
        CANCELAR
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.relearner-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.relearner-card {
  background: var(--card);
  border: 2px solid var(--purple);
  border-radius: 24px;
  width: 100%;
  max-width: 400px;
  padding: 28px;
  box-shadow: 0 0 40px rgba(155, 77, 255, 0.3);
  animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.header {
  text-align: center;
  margin-bottom: 24px;

  .brain-icon { font-size: 32px; margin-bottom: 12px; }
  h3 { 
    font-family: 'Press Start 2P', monospace; 
    font-size: 10px; 
    color: var(--purple);
    margin: 0 0 10px 0;
  }
  p { color: white; font-size: 14px; font-weight: 700; margin: 0; }
}

.moves-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 320px;
  overflow-y: auto;
  margin-bottom: 24px;
  padding-right: 6px;
}

.move-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(155, 77, 255, 0.1);
  border: 1px solid rgba(155, 77, 255, 0.2);
  border-radius: 14px;
  padding: 14px 18px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;

  &:hover {
    background: rgba(155, 77, 255, 0.2);
    transform: translateX(5px);
    border-color: var(--purple);
  }

  .move-info {
    display: flex;
    flex-direction: column;
    .move-name { font-weight: 800; font-size: 14px; }
    .move-lv { font-size: 10px; color: var(--gray); margin-top: 2px; }
  }

  .move-pp {
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    color: var(--purple);
  }
}

.cancel-btn {
  width: 100%;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  border-radius: 14px;
  color: var(--gray);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover { background: rgba(255, 255, 255, 0.1); color: white; }
}

@keyframes scaleIn {
  from { transform: Scale(0.9); opacity: 0; }
  to { transform: Scale(1.0); opacity: 1; }
}
</style>
