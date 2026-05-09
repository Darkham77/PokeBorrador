<script setup>
import { onMounted, reactive } from 'vue'
import { useGymsStore } from '@/stores/gyms'
import { useGameStore } from '@/stores/game'
import GymCard from '@/components/gyms/GymCard.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

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
  <div class="gyms-view-legacy">
    <div class="gyms-header-legacy">
      <div class="header-left">
        <h1 class="view-title">
          🏆 LÍDERES DE GIMNASIO
        </h1>
        <p class="view-desc">
          Derrota a los 8 líderes de Kanto para acceder a la Liga Pokémon. Cada líder otorga una medalla única y una MT especial.
        </p>
      </div>
      
      <div class="badge-summary-legacy">
        <div class="badge-title">
          TUS MEDALLAS
        </div>
        <div class="badge-list">
          <PVTooltip 
            v-for="gym in gymsStore.gyms" 
            :key="gym.id"
            :title="gym.badgeName"
          >
            <button 
              class="badge-item-retro"
              :class="{ active: gymsStore.isGymDefeated(gym.id) }"
              @click.stop
            >
              {{ gymsStore.isGymDefeated(gym.id) ? gym.badge : '?' }}
            </button>
          </PVTooltip>
        </div>
      </div>
    </div>

    <div class="gyms-grid-legacy">
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
@use "@/styles/core/tools" as *;

.gyms-view-legacy {
  padding: 0 0 40px;
  background: Var(--bg-dark);
}

.gyms-header-legacy {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 40px;
  gap: 30px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.05);
  padding-bottom: 20px;
  
  @media (max-width: 1024px) {
    flex-direction: column;
  }
}

.view-title {
  @include pixelated;
  font-size: 14px;
  color: Var(--yellow);
  margin: 0 0 10px 0;
  text-shadow: 0 2px 0 Var(--black);
}

.view-desc {
  font-size: 10px;
  color: Var(--gray);
  line-height: 1.6;
  max-width: 500px;
}

.badge-summary-legacy {
  background: Rgba(0, 0, 0, 0.3);
  border: 2px solid Rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 20px;
  min-width: 300px;
}

.badge-title {
  @include pixelated;
  font-size: 8px;
  color: Var(--yellow);
  margin-bottom: 20px;
  text-align: center;
}

.badge-list {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.badge-item-retro {
  width: 35px;
  height: 35px;
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: all 0.3s;
  cursor: default;

  &.active {
    opacity: 1;
    background: Rgba(255, 215, 0, 0.1);
    border-color: Var(--yellow);
    box-shadow: 0 0 15px Rgba(255, 215, 0, 0.3);
    transform: Scale(1.1);
  }
}

.gyms-grid-legacy {
  display: grid;
  grid-template-columns: Repeat(auto-fill, Minmax(320px, 1fr));
  gap: 25px;
  padding-bottom: 60px;
}
</style>
