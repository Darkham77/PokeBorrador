<script setup lang="ts">
import { computed, toValue } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle/battle'
import { useUIStore } from '@/stores/ui'
import BoxPokemonCard from '@/components/box/BoxPokemonCard.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { isPokemonLocked } from '@/logic/pokemon/pokemonUtils'
import { isRevivingForceSwitchRequest } from '@/logic/battle/helpers/requestHelper.ts'

import { useLivePvPStore } from '@/stores/livePvP'

const gameStore = useGameStore()
const battleStore = useBattleStore()
const uiStore = useUIStore()
const livePvP = useLivePvPStore()

const team = computed<Pokemon[]>(() => {
  if (battleStore.isPvP && battleStore.state?.playerTeam) {
    return (battleStore.state.playerTeam || []).filter(Boolean) as Pokemon[]
  }
  const rawTeam = (gameStore.state.team || []).filter(Boolean) as Pokemon[]
  return rawTeam
})
const activePokemonUid = computed(() => battleStore.state?.player?.uid)

const hasPendingForcedSwitch = computed(() => {
  const forceSwitch = battleStore.state?.playerRequest?.forceSwitch
  return Array.isArray(forceSwitch) ? forceSwitch.some(Boolean) : forceSwitch === true
})
const isSelectingReviveTarget = computed(() => isRevivingForceSwitchRequest(battleStore.state?.playerRequest))

const canSwitch = computed(() => {
  if (toValue(battleStore.currentSubState) === 'SWITCH_MENU' || hasPendingForcedSwitch.value) return true
  
  const p = battleStore.state?.player
  if (!p) return false
  
  if (p.hp <= 0) return true // Si el activo está debilitado, siempre se puede cambiar
  
  if (battleStore.isProcessing || battleStore.isIntroAnimating) return false
  if (battleStore.isPlayerTrapped || p.volatileCounters?.['partiallytrapped'] || p.trapped) return false
  
  if (isPokemonLocked(p)) {
    return false
  }
  
  return true
})

const handleSwitch = (index: number) => {
  const pokemon = team.value[index]
  if (!pokemon) return

  const originalTeam = battleStore.isPvP ? (battleStore.state?.playerTeam || []) : (gameStore.state.team || [])
  const originalIndex = originalTeam.findIndex((p) => p && p.uid === pokemon.uid)
  if (originalIndex === -1) {
    console.warn('[BattleQuickTeam] Could not find original index for UID:', pokemon.uid)
    return
  }

  const isForced = uiStore.isBattleSwitchForced || toValue(battleStore.currentSubState) === 'SWITCH_MENU'
  console.debug(`[BattleQuickTeam] handleSwitch clicked for index: ${index} (original: ${originalIndex}), pokemon: ${pokemon.name}, hp: ${pokemon.hp}, activeUid: ${activePokemonUid.value}, canSwitch: ${canSwitch.value}, isForced: ${isForced}`)
  
  if ((pokemon.hp <= 0 && !isSelectingReviveTarget.value) || pokemon.uid === activePokemonUid.value) {
    console.debug(`[BattleQuickTeam] handleSwitch early return check failed`)
    return
  }
  if (!canSwitch.value) {
    console.debug(`[BattleQuickTeam] handleSwitch canSwitch is false`)
    return
  }
  
  if (livePvP.battleState.active) {
    livePvP._commitPick({ type: 'switch', switchIndex: originalIndex })
  } else {
    console.debug(`[BattleQuickTeam] Calling battleStore.executeSwitch with originalIndex: ${originalIndex}, isForced: ${isForced}`)
    battleStore.executeSwitch(originalIndex, isForced)
  }
}
</script>

<template>
  <div 
    class="battle-quick-team premium-frame"
  >
    <div class="quick-team-grid">
      <BoxPokemonCard
        v-for="(pokemon, index) in team"
        :id="`battle-switch-${pokemon.uid}`"
        :key="pokemon.uid"
        :pokemon="pokemon"
        :index="index"
        :is-selected="pokemon.uid === activePokemonUid"
        :hide-stats="true"
        type-pill-size="ssm"
        class="quick-card-override"
        :data-pokemon-uid="pokemon.uid"
        :class="{ 
          'is-active': pokemon.uid === activePokemonUid,
          'is-fainted': pokemon.hp <= 0 && !isSelectingReviveTarget,
          'is-revive-target': pokemon.hp <= 0 && isSelectingReviveTarget,
          'is-disabled': !canSwitch && pokemon.uid !== activePokemonUid
        }"
        @click.stop="handleSwitch(index)"
      />

      <!-- Slots Vacíos para mantener la estructura 2x3 -->
      <div 
        v-for="i in Math.max(0, 6 - team.length)" 
        :key="'empty-' + i" 
        class="empty-slot-card"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.battle-quick-team {
  @include gpu-layer;
  @include smooth-scroll;

  display: flex;
  flex-direction: column;
  height: 100% !important;
  min-height: 100%;
  padding: 0 !important; 
  border: none !important;
  background: transparent !important;
  overflow: hidden auto !important;
}

.quick-team-grid {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(auto-fill, 115px);
  width: 100%;
  min-height: 100%;
  padding: 4px 6px; // 4px arriba y 4px abajo simétricos (184 + 8 = 192px exactos)
  place-content: start center;
  grid-auto-rows: 184px;
  box-sizing: border-box;
}

/* Overrides para integrar la tarjeta de la caja en el grid compacto de combate */
:deep(.quick-card-override) {
  @include gpu-layer;

  display: flex !important;
  flex-direction: column !important;
  justify-content: space-between !important;
  align-items: center !important;
  gap: 4px !important;
  width: 115px !important; // Ancho fijo compacto
  height: 184px !important; // Altura exacta para el contenedor de 192px
  min-height: 184px !important; // Evita aplastamiento de filas al hacer wrap
  max-height: 184px !important;
  margin: 0 !important;
  padding: 6px !important;
  border: 1px solid var(--tier-color); // MARCO DE GRADO OBLIGATORIO
  border-radius: 20px !important;
  background: Rgb(15 23 42 / 70%) !important; // Un poco más oscuro para resaltar borde
  -webkit-will-change: transform, opacity;
  will-change: transform, opacity;
  box-sizing: border-box !important;

  .box-sprite-wrapper {
    position: relative !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    width: 100% !important;
    min-height: 64px !important;
    flex: 1 1 auto !important;
    overflow: visible !important;
  }

  .card-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100% !important;
    text-align: center !important;
    flex-shrink: 0 !important;
    padding-left: 0 !important; // Forzar alineación y centrado perfectos

    .hp-bar-mini {
      margin: 4px auto 0 !important;
    }
  }

  &.is-active {
    background: Rgb(var(--tier-color-rgb), 0.15) !important;
    transform: Scale(0.98);
    border-color: var(--tier-color) !important;
    box-shadow: 
      0 0 20px Rgb(var(--tier-color-rgb), 0.4),
      inset 0 0 10px Rgb(var(--tier-color-rgb), 0.2) !important;
  }

  &.is-fainted {
    opacity: 0.5;
    will-change: transform, filter, opacity;
    filter: Grayscale(1);
    pointer-events: none;
  }

  &.is-disabled {
    opacity: 0.4;
    cursor: not-allowed;
    pointer-events: none;
  }
}

.empty-slot-card {
  width: 115px !important;
  height: 184px !important;
  min-height: 184px !important;
  border: 1px dashed Rgb(255 255 255 / 5%);
  border-radius: 20px;
  background: Rgb(255 255 255 / 1%);
  box-sizing: border-box !important;
}
</style>
