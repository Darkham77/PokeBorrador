<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import TeamHeader from '@/components/team/TeamHeader.vue'
import TeamGrid from '@/components/team/TeamGrid.vue'

const gameStore = useGameStore()
const team = computed(() => gameStore.state.team)
</script>

<template>
  <div class="team-page">
    <TeamHeader />
    
    <div
      v-if="team.length === 0"
      class="empty-state"
    >
      <span class="empty-icon">🦗</span>
      <p>Tu equipo está vacío. ¡Captura algunos Pokémon!</p>
    </div>
    
    <TeamGrid
      v-else
      :team="team"
    />
  </div>
</template>

<style scoped>
.header h2 {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  margin-bottom: 8px;
}

.empty-state {
  margin-top: 40px;
  text-align: center;
  color: var(--gray);
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.empty-state p {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
}
</style>
