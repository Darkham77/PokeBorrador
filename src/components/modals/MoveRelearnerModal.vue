<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { POKEMON_DB } from '@/data/pokemon/pokemonDB'
import type { LearnsetMove } from '@/types/system/database'
import { getPreEvolution } from '@/data/pokemon/evolutionData'
import { isPokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { PokemonMoveId } from '@/data/battle/moves'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { toPokemonType } from '@/data/battle/types'
import BaseModal from '@/components/common/BaseModal.vue'
import BattleMoveSlot from '@/components/battle/BattleMoveSlot.vue'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'

type RelearnMoveEntry = LearnsetMove & { fromId?: PokemonSpeciesId }

interface Props {
  show?: boolean
  pokemon?: Pokemon | null
  onLearned?: (success: boolean) => void
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  pokemon: null,
  onLearned: () => {}
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()
const uiStore = useUIStore()

const pokemon = computed(() => props.pokemon || uiStore.activePokemonForRelearner)

const forgottenMoves = computed<RelearnMoveEntry[]>(() => {
  if (!pokemon.value) return []
  const p = pokemon.value
  const learnedMoveIdsSet = new Set(
    p.moves
      .filter((m): m is NonNullable<typeof m> => !!m && !!m.id)
      .map(m => m.id!)
  )
  const possibleMoves: RelearnMoveEntry[] = []
  const addedMoveIds = new Set<PokemonMoveId>()
  const processedSpecies = new Set<PokemonSpeciesId>()
  let currentSpecies: PokemonSpeciesId | null = isPokemonSpeciesId(p.id) ? p.id : null
  
  // Trace back evolution chain to gather all potential moves in O(1) per step
  while (currentSpecies && !processedSpecies.has(currentSpecies)) {
    processedSpecies.add(currentSpecies)
    const dbEntry = POKEMON_DB[currentSpecies]
    
    if (dbEntry && dbEntry.learnset) {
      for (const m of dbEntry.learnset) {
        // Only moves at or below current level and not currently known
        if (m.lv <= p.level && !learnedMoveIdsSet.has(m.id) && !addedMoveIds.has(m.id)) {
          addedMoveIds.add(m.id)
          possibleMoves.push({ ...m, fromId: currentSpecies })
        }
      }
    }
    
    // Find previous stage in O(1)
    const prevSpecies = getPreEvolution(currentSpecies)
    currentSpecies = prevSpecies
  }
  
  return possibleMoves.sort((a, b) => (a.lv || 0) - (b.lv || 0))
})

const getMoveFullData = (mv: RelearnMoveEntry): Move => {
  const base = pokemonDataProvider.getMoveData(mv.id)
  const cat = base?.cat
  if (cat !== undefined && cat !== 'physical' && cat !== 'special' && cat !== 'status') {
    throw new Error(`Invalid relearn move category for ${mv.name}: ${cat}`)
  }
  const fullMove: Move = {
    id: mv.id,
    name: mv.name,
    pp: base?.pp ?? mv.pp,
    maxPP: base?.pp ?? mv.pp,
    type: toPokemonType(base?.type ?? 'normal'),
    cat: cat ?? 'physical',
    power: base?.power ?? 0,
    acc: base?.acc ?? 100,
    effect: base?.effect
  }
  return fullMove
}

const handleRelearn = (move: RelearnMoveEntry) => {
  const p = pokemon.value
  if (!p) return
  
  const inventory = gameStore.state.inventory as Record<string, number> // open-record: Generic key-value data dictionary container
  const hasItem = (inventory['moverelearner'] && inventory['moverelearner'] > 0) || (inventory['move_relearner'] && inventory['move_relearner'] > 0)
  
  if (!hasItem) {
    uiStore.notify('No tienes Recordadores de Movimientos.', '⚠️')
    return
  }

  const moveData = getMoveFullData(move)

  // If moves < 4, just add it
  if (p.moves.length < 4) {
    p.moves.push({ id: moveData.id, name: moveData.name, pp: moveData.pp, maxPP: moveData.pp })
    consumeItem()
    uiStore.notify(`¡${p.name} recordó ${moveData.name.toUpperCase()}!`, '🧠')
    props.onLearned(true)
    handleClose()
  } else {
    // If moves == 4, we need to forget one. Consume only on completion!
    const moveEntry: Move = { id: moveData.id, name: moveData.name, pp: moveData.pp, maxPP: moveData.pp }
    uiStore.addToLearnQueue({ 
      pokemon: p, 
      move: moveEntry,
      onComplete: () => {
        consumeItem()
      }
    })
    props.onLearned(true)
    handleClose()
  }
}

const handleClose = () => {
  uiStore.activePokemonForRelearner = null
  emit('close')
}

const consumeItem = () => {
  const inventoryStore = useInventoryStore()
  const inventory = gameStore.state.inventory as Record<string, number> // open-record: Generic key-value data dictionary container
  if (inventory['moverelearner'] && inventory['moverelearner'] > 0) {
    inventoryStore.removeItem('moverelearner', 1)
  } else if (inventory['move_relearner'] && inventory['move_relearner'] > 0) {
    inventory['move_relearner']--
    if (inventory['move_relearner'] <= 0) delete inventory['move_relearner']
    gameStore.save(false)
  }
}
</script>

<template>
  <BaseModal
    :show="show && !!pokemon"
    title="RECORDADOR DE MOVIMIENTOS"
    max-width="480px"
    variant="retro"
    @close="handleClose"
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

        <div 
          v-for="(mv, idx) in forgottenMoves" 
          :key="mv.name"
          class="move-slot-row-relearner"
        >
          <BattleMoveSlot
            :move="getMoveFullData(mv)"
            :index="idx"
            :player-info="pokemon"
            :can-reorder="false"
            @use-move="handleRelearn(mv)"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <button
        id="move-relearner-cancel-btn"
        class="btn-vicio-secondary btn-vicio-full"
        @click.stop="handleClose"
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
  margin-bottom: 16px;
  line-height: 1.4;
}

.moves-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 380px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 12px;
  @include smooth-scroll;
}

.move-slot-row-relearner {
  width: 100%;
  box-sizing: border-box;
  padding: 4px 6px;
}

.empty-msg {
  text-align: center;
  padding: 40px 20px;
  color: Rgba(255, 255, 255, 0.3);
  font-size: 11px;
}
</style>
