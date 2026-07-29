<script setup lang="ts">
import { computed } from 'vue'
import { useBattleStore } from '@/stores/battle/battle'
import BattleMoveSlot from './BattleMoveSlot.vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { isPokemonLocked } from '@/logic/pokemon/pokemonUtils'
import { toPokemonType } from '@/data/battle/types'
import type { Move } from '@/types/pokemon/pokemon'

const battleStore = useBattleStore()
const player = computed(() => battleStore.player)

/** True cuando todos los PP son 0 y el Pokémon no está en un ciclo forzado. */
const isStruggleMode = computed(() => {
  const p = player.value
  if (!p || !p.moves) return false
  const isLocked = isPokemonLocked(p)
  if (isLocked) return false
  return p.moves.every(m => !m || m.pp <= 0)
})

/** Objeto Move de Struggle construido con datos reales de Showdown. */
const struggleMoveData = computed<Move>(() => {
  const raw = pokemonDataProvider.getMoveData('struggle') as { type?: string; power?: number; acc?: number; cat?: string } | null
  const cat = raw?.cat
  if (cat !== undefined && cat !== 'physical' && cat !== 'special' && cat !== 'status') {
    throw new Error(`Invalid Struggle move category: ${cat}`)
  }
  return {
    id: 'struggle',
    name: 'Forcejeo',
    type: toPokemonType(raw?.type ?? 'normal'),
    power: raw?.power ?? 50,
    acc: undefined, // Struggle never misses
    cat: cat ?? 'physical',
    pp: 1,
    maxPP: 1,
    recoil: 0.25,
    desc: 'Sin PP disponibles. Ataque sin tipo que hace rebotar al usuario.',
  }
})
</script>

<template>
  <div
    v-if="isStruggleMode && !battleStore.isProcessing"
    class="struggle-overlay"
  >
    <BattleMoveSlot
      :move="struggleMoveData"
      :index="0"
      :is-processing="battleStore.isProcessing"
      :player-info="player"
      @use-move="battleStore.executeStruggle()"
    />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

// Forcejeo: se superpone al grid sin alterar el tamaño del HUD
.struggle-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: Rgba(10, 10, 20, 0.82);
  backdrop-filter: Blur(2px);
  z-index: calc(var(--z-base) + 10);
  pointer-events: all;

  :deep(.move-slot-wrapper) {
    width: calc(50% - var(--move-panel-gap, 12px) / 2);
    max-width: var(--move-card-max-width, 200px);
    flex: none;
  }
}
</style>
