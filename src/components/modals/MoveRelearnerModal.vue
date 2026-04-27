<script setup>
/**
 * MoveRelearnerModal
 * Standardized modal for relearning forgotten moves.
 */
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { POKEMON_DB } from '@/data/pokemonDB'
import { EVOLUTION_TABLE } from '@/data/evolutionData'
import BaseModal from '@/components/common/BaseModal.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  pokemon: { type: Object, required: true },
  onLearned: { type: Function, default: () => {} }
})

const emit = defineEmits(['close'])

const gameStore = useGameStore()
const uiStore = useUIStore()

const forgottenMoves = computed(() => {
  const p = props.pokemon
  if (!p) return []
  
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
    const prevEntry = Object.entries(EVOLUTION_TABLE).find(([_id, data]) => data.to === currentId)
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
    emit('close')
  } else {
    // If moves == 4, we need to forget one
    uiStore.openLearnMoveMenu(p, { name: move.name, pp: move.pp, maxPP: move.pp }, (success) => {
      if (success) {
        consumeItem(itemName)
        props.onLearned(true)
        emit('close')
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
  <BaseModal
    :show="show && !!pokemon"
    title="RECORDADOR DE MOVIMIENTOS"
    max-width="400px"
    variant="retro"
    @close="emit('close')"
  >
    <div class="relearner-content">
      <p class="relearner-help">
        ¿Qué movimiento debe recordar {{ pokemon?.name }}?
      </p>

      <div class="moves-list custom-scrollbar-vicio">
        <div
          v-if="forgottenMoves.length === 0"
          class="empty-msg"
        >
          No hay movimientos olvidados para este nivel.
        </div>

        <button 
          v-for="mv in forgottenMoves" 
          :key="mv.name"
          class="move-row-vicio"
          @click.stop="handleRelearn(mv)"
        >
          <div class="move-info">
            <span class="move-name">{{ mv.name }}</span>
            <span class="move-lv m-badge-level">Nv. {{ mv.lv || '—' }}</span>
          </div>
          <div class="move-pp">
            PP {{ mv.pp }}/{{ mv.pp }}
          </div>
        </button>
      </div>
    </div>

    <template #footer>
      <button
        class="btn-vicio-secondary btn-vicio-full"
        @click.stop="emit('close')"
      >
        CANCELAR
      </button>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.relearner-content {
  padding: 8px 0;
}

.relearner-help {
  font-size: 13px;
  color: Rgba(255, 255, 255, 0.6);
  text-align: center;
  margin-bottom: 24px;
  line-height: 1.4;
}

.moves-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 350px;
  @include smooth-scroll;
}

.move-row-vicio {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: Rgba(155, 77, 255, 0.05);
  border: 1px solid Rgba(155, 77, 255, 0.1);
  border-radius: 12px;
  padding: 14px 18px;
  color: var(--white);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;

  &:hover {
    background: Rgba(155, 77, 255, 0.15);
    border-color: var(--purple-light);
    transform: translateX(4px);
    
    .move-name { color: var(--purple-light); }
  }

  .move-info {
    display: flex;
    flex-direction: column;
    .move-name { 
      @include pixelated;
      font-size: 9px;
      margin-bottom: 4px;
      @include gpu-layer;
    }
    .move-lv { 
      font-size: 10px; 
      color: Rgba(255, 255, 255, 0.4);
    }
  }

  .move-pp {
    @include pixelated;
    font-size: 8px;
    color: var(--purple-light);
    @include pixelated;
  }
}

.empty-msg {
  text-align: center;
  padding: 40px 20px;
  color: Rgba(255, 255, 255, 0.3);
  font-size: 11px;
}
</style>
