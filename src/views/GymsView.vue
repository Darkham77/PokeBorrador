<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { gsap } from 'gsap'
import { useGymsStore } from '@/stores/gyms'
import { useGameStore } from '@/stores/game'
import GymCard from '@/components/gyms/GymCard.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import type { Gym } from '@/types/gym'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

const gymsStore = useGymsStore()
const gameStore = useGameStore()

// Local state for difficulties to keep them reactive per card
const cardDifficulties = reactive<Record<string, string>>({})

onMounted(async () => {
  await gymsStore.loadGymProgress()
  gymsStore.gyms.forEach((gym: Gym) => {
    cardDifficulties[gym.id] = 'easy'
  })
})

const handleBadgeEnter = (e: MouseEvent) => {
  gsap.to(e.currentTarget, {
    scale: 1.1,
    y: -2,
    duration: 0.4,
    ease: 'back.out(1.7)',
    filter: 'none',
    opacity: 1
  })
}

const handleBadgeLeave = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  const isActive = el.classList.contains('active')
  gsap.to(el, {
    scale: isActive ? 1.1 : 1,
    y: isActive ? -2 : 0,
    duration: 0.4,
    ease: 'power2.out',
    filter: isActive ? 'none' : 'Grayscale(1) Opacity(0.3)',
    opacity: isActive ? 1 : 0.3
  })
}
</script>

<template>
  <div class="pv-gyms-view">
    <div class="pv-gyms-header">
      <div class="header-left">
        <h1 class="view-title">
          🏆 LÍDERES DE GIMNASIO
        </h1>
        <p class="view-desc">
          Derrota a los 8 líderes de Kanto para acceder a la Liga Pokémon. Cada líder otorga una medalla única y una MT especial.
        </p>
      </div>
      
      <div class="badge-summary">
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
              class="badge-item"
              :class="{ active: gymsStore.isGymDefeated(gym.id) }"
              @mouseenter="handleBadgeEnter"
              @mouseleave="handleBadgeLeave"
              @click.stop
            >
              <img 
                :src="getAssetUrl(ASSET_TYPES.BADGE, gym.id)" 
                :alt="gym.badgeName"
                class="badge-img"
              >
            </button>
          </PVTooltip>
        </div>
      </div>
    </div>

    <div class="pv-gyms-grid">
      <GymCard
        v-for="gym in gymsStore.gyms"
        :key="gym.id"
        v-model:difficulty="cardDifficulties[gym.id]"
        :gym="gym"
        :is-defeated="gymsStore.isDifficultyDefeated(gym.id, cardDifficulties[gym.id] || 'easy')"
        :is-locked="gameStore.state.badges < gym.badgesRequired"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.pv-gyms-view {
  padding: 0 0 40px;
  background: var(--bg-dark);
}

.pv-gyms-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  gap: 30px;
  padding: 30px;
  @include shell;
  border-radius: 24px;
  
  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: flex-start;
  }
}

.view-title {
  @include pixelated;
  font-size: 16px;
  color: var(--yellow);
  margin: 0 0 12px 0;
  text-shadow: 0 2px 0 var(--black);
}

.view-desc {
  font-size: 11px;
  color: var(--gray);
  line-height: 1.6;
  max-width: 600px;
}

.badge-summary {
  background: Rgba(0, 0, 0, 0.3);
  padding: 20px;
  border-radius: 20px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  min-width: 320px;
  position: relative;
}

.badge-title {
  @include pixelated;
  font-size: 9px;
  color: var(--yellow);
  margin-bottom: 24px;
  text-align: center;
  letter-spacing: 1px;
}

.badge-list {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.badge-item {
  width: 40px;
  height: 40px;
  flex: none;
  background: Rgba(255, 255, 255, 0.05);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  filter: Grayscale(1) Opacity(0.3);
  will-change: filter, transform;

  .badge-img {
    width: 26px;
    height: 26px;
    object-fit: contain;
    image-rendering: pixelated;
  }

  &.active {
    filter: none;
    opacity: 1;
    background: Linear-Gradient(135deg, Rgba(255, 215, 0, 0.2) 0%, Rgba(255, 215, 0, 0.05) 100%);
    border-color: var(--yellow);
    box-shadow: 
      0 0 20px Rgba(255, 215, 0, 0.2),
      inset 0 0 10px Rgba(255, 215, 0, 0.1);
    transform: Scale(1.1) Translatey(-2px);
  }
}

.pv-gyms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 340px);
  justify-content: center;
  gap: 40px;
  padding: 0 30px 80px;
}
</style>
