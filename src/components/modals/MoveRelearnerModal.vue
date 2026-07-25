<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { POKEMON_DB } from '@/data/pokemon/pokemonDB'
import { EVOLUTION_TABLE } from '@/data/pokemon/evolutionData'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import BaseModal from '@/components/common/BaseModal.vue'
import BattleMoveSlot from '@/components/battle/BattleMoveSlot.vue'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'

interface LearnsetEntry {
  lv: number
  name: string
  pp: number
  id?: string
  fromId?: string
}

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

const forgottenMoves = computed(() => {
  const p = pokemon.value
  if (!p) return []
  
  const learnedMoves = p.moves.filter(m => !!m).map((m) => (m as Move).name)
  const possibleMoves: LearnsetEntry[] = []
  const processedIds = new Set<string>()
  
  let currentId: string | null = p.id
  
  // Trace back evolution chain to gather all potential moves
  while (currentId && !processedIds.has(currentId)) {
    processedIds.add(currentId)
    const dbEntry = (POKEMON_DB as Record<string, { learnset?: LearnsetEntry[] }>)[currentId]
    
    if (dbEntry && dbEntry.learnset) {
      dbEntry.learnset.forEach(m => {
        // Only moves at or below current level
        if (m.lv <= p.level && !learnedMoves.includes(m.name)) {
          // Avoid duplicates if multiple stages learn the same move
          if (!possibleMoves.find(pm => pm.name === m.name)) {
            possibleMoves.push({ ...m, fromId: currentId as string })
          }
        }
      })
    }
    
    // Find previous stage
    const currentIdRef = currentId as string
    const prevEntry = Object.entries(EVOLUTION_TABLE).find(([, data]) => (data as { to: string }).to === currentIdRef)
    currentId = prevEntry ? prevEntry[0] : null
  }
  
  return possibleMoves.sort((a, b) => (a.lv || 0) - (b.lv || 0))
})

const getMoveFullData = (mv: LearnsetEntry): Move => {
  const base = mv.id ? pokemonDataProvider.getMoveData(mv.id) : null
  const fullMove: Move = {
    name: mv.name,
    pp: base?.pp ?? mv.pp,
    maxPP: base?.pp ?? mv.pp,
    type: base?.type ?? 'normal',
    cat: (base?.cat as 'physical' | 'special' | 'status') ?? 'physical',
    power: base?.power ?? 0,
    acc: base?.acc ?? 100,
    effect: base?.effect
  }
  return fullMove
}

const handleRelearn = (move: LearnsetEntry) => {
  const p = pokemon.value
  if (!p) return
  
  const itemId = 'move_relearner'
  const inventory = gameStore.state.inventory as Record<string, number>
  
  if (!inventory[itemId]) {
    uiStore.notify('No tienes Recordadores de Movimientos.', '⚠️')
    return
  }

  const moveData = getMoveFullData(move)

  // If moves < 4, just add it
  if (p.moves.length < 4) {
    p.moves.push({ name: moveData.name, pp: moveData.pp, maxPP: moveData.pp })
    consumeItem(itemId)
    uiStore.notify(`¡${p.name} recordó ${moveData.name.toUpperCase()}!`, '🧠')
    props.onLearned(true)
    handleClose()
  } else {
    // If moves == 4, we need to forget one. Consume only on completion!
    const moveEntry: Move = { name: moveData.name, pp: moveData.pp, maxPP: moveData.pp }
    uiStore.addToLearnQueue({ 
      pokemon: p, 
      move: moveEntry,
      onComplete: () => {
        consumeItem(itemId)
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

const consumeItem = (id: string) => {
  const inventory = gameStore.state.inventory as Record<string, number>
  if (inventory[id]) inventory[id]--
  if (inventory[id] !== undefined && inventory[id] <= 0) delete inventory[id]
  gameStore.save()
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
