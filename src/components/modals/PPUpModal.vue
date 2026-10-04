<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import BaseModal from '@/components/common/BaseModal.vue'
import BattleMoveSlot from '@/components/battle/BattleMoveSlot.vue'
import type { Move } from '@/types/pokemon/pokemon'

const uiStore = useUIStore()
const gameStore = useGameStore()
const inventoryStore = useInventoryStore()

const isPPMax = computed(() => uiStore.activeItemForPPUp === 'ppmax')

/** Resolve the actual Pokémon from gameStore by index — avoids cross-store ref issues. */
const ppPokemon = computed(() => {
  const target = uiStore.activePokemonForPPUp
  if (!target) return null
  const list = target.context === 'team' ? gameStore.state.team : gameStore.state.box
  return list[target.index] ?? null
})

/** Returns whether a move is already at its maximum possible maxPP. */
const isMaxed = (move: Move | null): boolean => {
  if (!move) return true
  if (!move.id) throw new Error(`[PPUpModal] El movimiento no tiene un ID válido.`)
  const moveData = pokemonDataProvider.getMoveData(move.id)
  if (!moveData) throw new Error(`[PPUpModal] No se encontró información para el movimiento: ${move.id}`)
  const basePP = moveData.pp
  return move.maxPP >= Math.floor(basePP * 1.6)
}

const handleApplyPPUp = (moveIndex: number) => {
  const pokemon = ppPokemon.value
  if (!pokemon) return
  const itemId = uiStore.activeItemForPPUp
  if (!itemId) return
  const move = pokemon.moves[moveIndex]
  if (!move) return

  if (!move.id) throw new Error(`[PPUpModal] El movimiento no tiene un ID válido.`)
  const moveData = pokemonDataProvider.getMoveData(move.id)
  if (!moveData) throw new Error(`[PPUpModal] No se encontró información para el movimiento: ${move.id}`)
  
  const basePP = moveData.pp
  const maxPossible = Math.floor(basePP * 1.6)

  if (move.maxPP >= maxPossible) {
    uiStore.notify('PP al máximo para este movimiento.', '⚠️')
    return
  }

  if (isPPMax.value) {
    // pp_max: raises maxPP to 160% ceiling permanently — does NOT restore current PP
    move.maxPP = maxPossible
    uiStore.notify(`¡El límite máximo de PP de ${move.name} se alcanzó!`, '📈')
  } else {
    // pp_up: raises maxPP by +20% permanently — does NOT restore current PP
    const increase = Math.floor(basePP * 0.2)
    move.maxPP = Math.min(maxPossible, move.maxPP + increase)
    uiStore.notify(`¡El límite de PP de ${move.name} aumentó!`, '📈')
  }

  // Consume item only after a move is successfully chosen
  inventoryStore.removeItem(itemId, 1)

  close()
  gameStore.save()
}

interface Props {
  id?: string
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  id: 'pp-up-modal',
  show: true
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const close = () => {
  emit('close')
  uiStore.isPPUpOpen = false
  uiStore.activeItemForPPUp = null
  uiStore.activePokemonForPPUp = null
}
</script>

<template>
  <BaseModal
    :id="id"
    :show="show"
    :title="isPPMax ? 'MÁXIMO PP' : 'SUBIDA DE PP'"
    title-color="rgba(96, 165, 250, 1)"
    header-background="rgba(26, 26, 46, 1)"
    max-width="520px"
    variant="retro"
    @close="close"
  >
    <div class="ppup-modal-inner">
      <p class="target-info">
        ¿Qué movimiento de <strong>{{ ppPokemon?.name }}</strong> quieres mejorar?
      </p>

      <div class="move-list">
        <div
          v-for="(m, i) in ppPokemon?.moves"
          :key="i"
          class="move-slot-row"
          :class="{ maxed: isMaxed(m) }"
        >
          <BattleMoveSlot
            v-if="m"
            :move="m"
            :index="i"
            :player-info="ppPokemon"
            :can-reorder="false"
            @use-move="handleApplyPPUp"
          />
          <span
            v-if="isMaxed(m)"
            class="maxed-label"
          >PP MÁXIMO</span>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        id="pp-up-cancel-btn"
        class="btn-vicio-secondary btn-vicio-full"
        @click.stop="close"
      >
        CANCELAR
      </button>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.ppup-modal-inner {
  padding: 8px 0;
}

.target-info {
  color: rgb(255 255 255 / 60%);
  font-size: 13px;
  line-height: 1.4;
  text-align: center;
  margin-bottom: 16px;
}

.move-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 6px 12px;
}

.move-slot-row {
  position: relative;
  width: 100%;

  &.maxed {
    opacity: 0.5;
    pointer-events: none;
  }
}

.maxed-label {
  @include pixelated;

  position: absolute;
  top: 50%;
  left: 50%;
  z-index: calc(var(--z-map-floor) + 1);
  padding: 6px 14px;
  border: 1px solid rgb(255 214 10 / 40%);
  border-radius: 8px;
  background: rgb(0 0 0 / 85%);
  color: var(--yellow);
  font-size: 11px;
  font-weight: bold;
  transform: translate(-50%, -50%);
  pointer-events: none;
  box-shadow: 0 4px 10px rgb(0 0 0 / 50%);
  letter-spacing: 0.5px;
}
</style>
