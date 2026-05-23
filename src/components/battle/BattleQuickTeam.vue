<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle'
import BoxPokemonCard from '@/components/box/BoxPokemonCard.vue'
import type { Pokemon } from '@/types/pokemon'

const gameStore = useGameStore()
const battleStore = useBattleStore()

const team = computed<Pokemon[]>(() => gameStore.state.team || [])
const activePokemonUid = computed(() => battleStore.state?.player?.uid)

const handleSwitch = (index: number) => {
  const pokemon = team.value[index]
  if (!pokemon || pokemon.hp <= 0 || pokemon.uid === activePokemonUid.value) return
  if (battleStore.isProcessing || battleStore.isIntroAnimating) return
  
  battleStore.executeSwitch(index)
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
        :class="{ 
          'is-active': pokemon.uid === activePokemonUid,
          'is-fainted': pokemon.hp <= 0
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
  height: 100% !important;
  min-height: 0; // Fix flex scroll collapse
  overflow-y: auto !important;
  @include gpu-layer;
  @include smooth-scroll;
  @include smooth-scroll;
}

.quick-team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 160px));
  justify-content: center;
  gap: 8px; // Gap consistente
  width: 100%;
  padding: 4px;
}

/* Overrides para integrar la tarjeta de la caja en el grid compacto de combate */
:deep(.quick-card-override) {
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 8px !important;
  background: Rgba(15, 23, 42, 0.7) !important; // Un poco más oscuro para resaltar borde
  -webkit-will-change: transform, opacity;
  will-change: transform, opacity;
  @include gpu-layer;
  border: 1px solid var(--tier-color) !important; // MARCO DE GRADO OBLIGATORIO
  border-radius: 20px !important;
  transition: all 0.2s ease !important;
  
  // Hover unificado premium (usa el color de grado)
  &:hover {
    z-index: var(--z-map-spawns);
    box-shadow: 0 0 15px Rgba(var(--tier-color-rgb), 0.3) !important;
  }

  &.is-active {
    border-color: var(--tier-color) !important;
    background: Rgba(var(--tier-color-rgb), 0.15) !important;
    box-shadow: 
      0 0 20px Rgba(var(--tier-color-rgb), 0.4),
      inset 0 0 10px Rgba(var(--tier-color-rgb), 0.2) !important;
    transform: Scale(0.98);
  }

  &.is-fainted {
    opacity: 0.5;
    will-change: transform, filter, opacity;
    filter: Grayscale(1);
    pointer-events: none;
  }
}

.empty-slot-card {
  background: Rgba(255, 255, 255, 0.01);
  border: 1px dashed Rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
</style>
