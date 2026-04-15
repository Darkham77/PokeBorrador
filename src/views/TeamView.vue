<script setup>
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()
</script>

<template>
  <div class="team-view">
    <div class="header">
      <h2>Mi Equipo</h2>
      <p>{{ gameStore.state.team.length }} / 6 Pokémon</p>
    </div>

    <div v-if="gameStore.state.team.length === 0" class="empty-state">
      <span class="empty-icon">🎒</span>
      <p>No tenés Pokémon en tu equipo todavía.</p>
    </div>

    <div v-else class="team-grid">
      <div v-for="(p, i) in gameStore.state.team" :key="i" class="pokemon-card">
        <!-- Contenido de la carta -->
        <p>{{ p.name }}</p>
      </div>
    </div>
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
