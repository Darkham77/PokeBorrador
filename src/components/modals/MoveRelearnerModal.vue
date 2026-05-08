<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { POKEMON_DB } from '@/data/pokemonDB'
import { EVOLUTION_TABLE } from '@/data/evolutionData'
import BaseModal from '@/components/common/BaseModal.vue'
import type { Pokemon, Move } from '@/types/pokemon'

interface LearnsetEntry {
  lv: number
  name: string
  pp: number
  fromId?: string
}

interface Props {
  show?: boolean
  pokemon: Pokemon | null
  onLearned?: (success: boolean) => void
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  onLearned: () => {}
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()
const uiStore = useUIStore() as any

const forgottenMoves = computed(() => {
  const p = props.pokemon
  if (!p) return []
  
  const learnedMoves = p.moves.filter(m => !!m).map((m) => (m as Move).name)
  const possibleMoves: LearnsetEntry[] = []
  const processedIds = new Set<string>()
  
  let currentId: string | null = p.id
  
  // Trace back evolution chain to gather all potential moves
  while (currentId && !processedIds.has(currentId)) {
    processedIds.add(currentId)
    const dbEntry = (POKEMON_DB as Record<string, any>)[currentId]
    
    if (dbEntry && dbEntry.learnset) {
      (dbEntry.learnset as LearnsetEntry[]).forEach(m => {
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
    const prevEntry = Object.entries(EVOLUTION_TABLE).find(([_id, data]) => (data as any).to === currentIdRef)
    currentId = prevEntry ? prevEntry[0] : null
  }
  
  return possibleMoves.sort((a, b) => (a.lv || 0) - (b.lv || 0))
})

const handleRelearn = (move: LearnsetEntry) => {
  const p = props.pokemon
  if (!p) return
  
  const itemName = 'Recordador de Movimientos'
  const inventory = gameStore.state.inventory as Record<string, number>
  
  if (!inventory[itemName]) {
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
    uiStore.openLearnMoveMenu(p as any, { name: move.name, pp: move.pp, maxPP: move.pp }, (success: boolean) => {
      if (success) {
        consumeItem(itemName)
        props.onLearned(success)
        emit('close')
      }
    })
  }
}

const consumeItem = (name: string) => {
  const inventory = gameStore.state.inventory as Record<string, number>
  if (inventory[name]) inventory[name]--
  if (inventory[name] !== undefined && inventory[name] <= 0) delete inventory[name]
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
    transform: Translatex(4px);
    
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
