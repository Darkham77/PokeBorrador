<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle'
import BoxPokemonCard from '@/components/box/BoxPokemonCard.vue'

const gameStore = useGameStore()
const battleStore = useBattleStore()

const team = computed(() => gameStore.state.team || [])
const activePokemonUid = computed(() => battleStore.state?.player?.uid)

const handleSwitch = (index) => {
  const pokemon = team.value[index]
  if (!pokemon || pokemon.hp <= 0 || pokemon.uid === activePokemonUid.value) return
  if (battleStore.isProcessing) return
  
  battleStore.executeSwitch(index)
}
</script>

<template>
  <div class="battle-quick-team premium-frame">
    <div class="quick-team-grid">
      <BoxPokemonCard
        v-for="(pokemon, index) in team"
        :key="pokemon.uid"
        :pokemon="pokemon"
        :index="index"
        :is-selected="pokemon.uid === activePokemonUid"
        :hide-stats="true"
        is-performance-mode
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
}

.quick-team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
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
  background: Rgba(15, 23, 42, 0.6) !important; // Fondo Premium Unificado
  -webkit-backdrop-filter: Blur(12px);
  backdrop-filter: Blur(12px);
  @include gpu-layer;
  border: 1px solid Rgba(255, 255, 255, 0.1) !important;
  border-radius: 20px !important;
  transition: all 0.2s ease !important;
  
  // Hover unificado: Aclarar fondo
  &:hover {
    background: Rgba(255, 255, 255, 0.1) !important;
    border-color: Rgba(255, 255, 255, 0.4) !important;
    box-shadow: inset 0 0 10px Rgba(255, 255, 255, 0.1) !important;
    transform: none !important;
  }

  &.is-active {
    border-color: var(--blue) !important;
    background: Rgba(59, 130, 246, 0.1) !important;
    box-shadow: inset 0 0 10px Rgba(59, 130, 246, 0.2) !important;
  }

  &.is-fainted {
    opacity: 0.5;
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