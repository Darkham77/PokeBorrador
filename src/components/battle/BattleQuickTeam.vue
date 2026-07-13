<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle/battle'
import { useUIStore } from '@/stores/ui'
import BoxPokemonCard from '@/components/box/BoxPokemonCard.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { isPokemonLocked } from '@/logic/pokemon/pokemonUtils'

import { ShowdownTeamResolver } from '@/logic/battle/showdownTeamResolver'

const gameStore = useGameStore()
const battleStore = useBattleStore()
const uiStore = useUIStore()

const team = computed<Pokemon[]>(() => {
  const rawTeam = gameStore.state.team || []
  return ShowdownTeamResolver.getShowdownOrder(rawTeam, battleStore.state?.playerRequest)
})
const activePokemonUid = computed(() => battleStore.state?.player?.uid)

const canSwitch = computed(() => {
  if (battleStore.currentSubState === 'SWITCH_MENU') return true // Si la FSM pide cambio, siempre permitir
  
  const p = battleStore.state?.player
  if (!p) return false
  
  if (p.hp <= 0) return true // Si el activo está debilitado, siempre se puede cambiar
  
  if (battleStore.isProcessing || battleStore.isIntroAnimating) return false
  if (p.volatileCounters?.['partiallytrapped'] || p.trapped) return false
  
  if (isPokemonLocked(p)) {
    return false
  }
  
  return true
})

const handleSwitch = (index: number) => {
  const pokemon = team.value[index]
  if (!pokemon) return

  const originalIndex = (gameStore.state.team || []).findIndex((p) => p && p.uid === pokemon.uid)
  if (originalIndex === -1) {
    console.warn('[BattleQuickTeam] Could not find original index for UID:', pokemon.uid)
    return
  }

  const isForced = uiStore.isBattleSwitchForced || battleStore.currentSubState === 'SWITCH_MENU'
  console.log(`[BattleQuickTeam] handleSwitch clicked for index: ${index} (original: ${originalIndex}), pokemon: ${pokemon.name}, hp: ${pokemon.hp}, activeUid: ${activePokemonUid.value}, canSwitch: ${canSwitch.value}, isForced: ${isForced}`);
  
  if (pokemon.hp <= 0 || pokemon.uid === activePokemonUid.value) {
    console.log(`[BattleQuickTeam] handleSwitch early return check failed`);
    return
  }
  if (!canSwitch.value) {
    console.log(`[BattleQuickTeam] handleSwitch canSwitch is false`);
    return
  }
  
  console.log(`[BattleQuickTeam] Calling battleStore.executeSwitch with originalIndex: ${originalIndex}, isForced: ${isForced}`);
  battleStore.executeSwitch(originalIndex, isForced)
}
</script>

<template>
  <div 
    class="battle-quick-team premium-frame"
  >
    <div class="quick-team-grid">
      <BoxPokemonCard
        v-for="(pokemon, index) in team"
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
          'is-fainted': pokemon.hp <= 0,
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
  background: transparent !important; 
  border: none !important;
  padding: 0 !important;
  height: auto !important;
  min-height: 100%; // Fix flex scroll collapse
  overflow-y: auto !important;
  overflow-x: hidden !important; // Evitar estrictamente scrollbars horizontales
  @include gpu-layer;
  @include smooth-scroll;
}

.quick-team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 115px); // Ancho fijo reducido para evitar deformación y asegurar que entren 6
  justify-content: center;
  gap: 6px; // Gap reducido para ahorrar espacio
  width: 100%;
  padding: 12px 4px 6px 4px;
}

/* Overrides para integrar la tarjeta de la caja en el grid compacto de combate */
:deep(.quick-card-override) {
  width: 115px !important; // Ancho fijo compacto
  height: 155px !important; // Altura suficiente para mostrar la barra de HP sin cortes
  min-height: 155px !important;
  margin: 0 !important;
  padding: 8px !important;
  background: Rgba(15, 23, 42, 0.7) !important; // Un poco más oscuro para resaltar borde
  -webkit-will-change: transform, opacity;
  will-change: transform, opacity;
  @include gpu-layer;
  border: 1px solid var(--tier-color); // MARCO DE GRADO OBLIGATORIO
  border-radius: 20px !important;

  .card-info {
    padding-left: 0 !important; // Forzar alineación y centrado perfectos
    text-align: center !important;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &.is-active {
    border-color: var(--tier-color) !important;
    background: Rgba(var(--tier-color-rgb), 0.15) !important;
    box-shadow: 
      0 0 20px Rgba(var(--tier-color-rgb), 0.4),
      inset 0 0 10px Rgba(var(--tier-color-rgb), 0.2) !important;
    transform: Scale(0.98) !important;
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
  background: Rgba(255, 255, 255, 0.01);
  border: 1px dashed Rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
</style>
