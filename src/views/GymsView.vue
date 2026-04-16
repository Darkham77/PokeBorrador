<script setup>
import { onMounted, reactive } from 'vue'
import { useGymsStore } from '@/stores/gyms'
import { useGameStore } from '@/stores/game'
import GymCard from '@/components/gyms/GymCard.vue'

const gymsStore = useGymsStore()
const gameStore = useGameStore()

// Local state for difficulties to keep them reactive per card
const cardDifficulties = reactive({})

onMounted(async () => {
  await gymsStore.loadGymProgress()
  gymsStore.gyms.forEach(gym => {
    cardDifficulties[gym.id] = 'easy'
  })
})
</script>

<template>
  <div class="gyms-view">
    <div class="gyms-header">
      <div class="header-left">
        <div class="view-title">
          🏆 LÍDERES DE GIMNASIO
        </div>
        <div class="view-desc">
          Derrota a los 8 líderes de Kanto para acceder a la Liga Pokémon. Cada líder otorga una medalla única y una MT especial.
        </div>
      </div>
      
      <div class="badge-summary">
        <div class="badge-title">
          TUS MEDALLAS
        </div>
        <div class="badge-list">
          <div
            v-for="gym in gymsStore.gyms"
            :key="gym.id"
            class="badge-item"
            :class="{ active: gymsStore.isGymDefeated(gym.id) }"
            :title="gym.badgeName"
          >
            {{ gymsStore.isGymDefeated(gym.id) ? gym.badge : '❓' }}
          </div>
        </div>
      </div>
    </div>

    <div class="gyms-grid">
      <GymCard
        v-for="gym in gymsStore.gyms"
        :key="gym.id"
        v-model:difficulty="cardDifficulties[gym.id]"
        :gym="gym"
        :is-defeated="gymsStore.isGymDefeated(gym.id)"
        :is-locked="gameStore.state.badges < gym.badgesRequired"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.gyms-view {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  animation: fadeIn 0.5s ease;
}

.gyms-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  gap: 40px;
  
  @media (max-width: 1024px) {
    flex-direction: column;
    gap: 20px;
  }
}

.header-left {
  flex: 1;
}

.view-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 18px;
  color: #fff;
  margin-bottom: 12px;
  text-shadow: 0 0 15px rgba(234, 179, 8, 0.3);
}

.view-desc {
  font-size: 14px;
  color: var(--gray);
  line-height: 1.6;
  max-width: 600px;
}

.badge-summary {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px;
  border-radius: 16px;
  min-width: 320px;
}

.badge-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--yellow);
  margin-bottom: 16px;
  text-align: center;
}

.badge-list {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.badge-item {
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.3s;
  filter: #{'grayscale(1)'};
  opacity: 0.3;

  &.active {
    filter: #{'grayscale(0)'};
    opacity: 1;
    background: rgba(234, 179, 8, 0.1);
    border-color: var(--yellow);
    box-shadow: 0 0 15px rgba(234, 179, 8, 0.2);
    transform: #{'scale(1.1)'};
  }
}

.gyms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
  padding-bottom: 40px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
