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

const isPPMax = computed(() => uiStore.activeItemForPPUp === 'pp_max')

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
  const moveData = pokemonDataProvider.getMoveData(move.name)
  const basePP = moveData?.pp || 35
  return move.maxPP >= Math.floor(basePP * 1.6)
}

const handleApplyPPUp = (moveIndex: number) => {
  const pokemon = ppPokemon.value
  if (!pokemon) return
  const itemId = uiStore.activeItemForPPUp
  if (!itemId) return
  const move = pokemon.moves[moveIndex]
  if (!move) return

  const moveData = pokemonDataProvider.getMoveData(move.name) || { pp: 35 }
  const basePP = moveData.pp || 35
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

  uiStore.isPPUpOpen = false
  uiStore.activePokemonForPPUp = null
  uiStore.activeItemForPPUp = null
  gameStore.save()
}

const close = () => {
  uiStore.isPPUpOpen = false
  uiStore.activeItemForPPUp = null
  uiStore.activePokemonForPPUp = null
}
</script>

<template>
  <BaseModal
    :show="true"
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
          >PP MAX</span>
        </div>
      </div>
    </div>

    <template #footer>
      <button
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
  font-size: 13px;
  color: Rgba(255, 255, 255, 0.6);
  text-align: center;
  margin-bottom: 16px;
  line-height: 1.4;
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
    opacity: 0.4;
    pointer-events: none;
  }
}

.maxed-label {
  @include pixelated;
  position: absolute;
  top: 50%;
  right: 12px;
  transform: Translatey(-50%);
  font-size: 8px;
  color: var(--yellow);
  pointer-events: none;
}
</style>
