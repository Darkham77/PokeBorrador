<script setup lang="ts">
import { computed } from 'vue'
import { GYMS } from '@/data/world/gyms'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVTooltip from '@/components/common/PVTooltip.vue'

const gameStore = useGameStore()
const uiStore = useUIStore()

const defeatedGyms = computed<string[]>(() => gameStore.state.defeatedGyms || [])
const defeatedCount = computed(() => defeatedGyms.value.length)

const isGymDefeated = (gymId: string) => {
  return defeatedGyms.value.includes(gymId)
}

const openGyms = () => {
  uiStore.activeTab = 'gyms'
}
</script>

<template>
  <div class="home-gyms-progress home-section-card">
    <div class="card-header-bar">
      <div class="title-wrap">
        <span class="card-icon title-icon">🏆</span>
        <div class="title-text-group">
          <h3 class="card-title">
            GIMNASIOS DE KANTO
          </h3>
          <span class="gyms-sub">{{ defeatedCount }}/8 Medallas Conquistadas</span>
        </div>
      </div>

      <div class="header-actions">
        <button
          id="home-gyms-open-btn"
          v-gsap-hover
          class="card-action-btn"
          @click.stop="openGyms"
        >
          <span class="btn-icon">⚡</span>
          DESAFIAR
        </button>
      </div>
    </div>

    <div class="medals-row">
      <PVTooltip
        v-for="gym in GYMS"
        :key="gym.id"
        :title="gym.badgeName"
        :description="`${gym.leader} (${gym.city}) - ${isGymDefeated(gym.id) ? 'Conquistada' : 'Pendiente'}`"
      >
        <div
          v-gsap-hover="{ scale: 1.05, y: -2 }"
          class="medal-slot"
          :class="{ 'is-conquered': isGymDefeated(gym.id) }"
          @click.stop="openGyms"
        >
          <div class="medal-icon-wrap">
            <img
              :src="getAssetUrl(ASSET_TYPES.BADGE, gym.id)"
              :alt="gym.badgeName"
              class="badge-sprite-img"
            >
          </div>
          <div class="medal-info">
            <span class="leader-name">{{ gym.leader }}</span>
            <span class="badge-status">{{ isGymDefeated(gym.id) ? 'GANADA' : 'PENDIENTE' }}</span>
          </div>
        </div>
      </PVTooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.home-gyms-progress {
  background: Rgba(18, 22, 34, 0.85);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px 16px;
  box-sizing: border-box;
  box-shadow: 0 4px 16px Rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.06);
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;

  .card-icon {
    font-size: 20px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .title-text-group {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .card-title {
    @include pixelated;
    font-size: 11px;
    color: var(--yellow, #facc15);
    margin: 0;
    line-height: 1.2;
    letter-spacing: 0.5px;
  }

  .gyms-sub {
    font-size: 10px;
    color: Rgba(255, 255, 255, 0.5);
  }
}

.card-action-btn {
  @include pixelated;
  font-size: 8px;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: Rgba(255, 255, 255, 0.05);
  border: 1px solid Rgba(255, 255, 255, 0.15);
  color: var(--white, #ffffff);
  cursor: pointer;
  box-sizing: border-box;
  white-space: nowrap;
  letter-spacing: 0.5px;
  line-height: 1;

  .btn-icon {
    font-size: 11px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  &:hover:not(:disabled) {
    background: Rgba(255, 255, 255, 0.12);
    border-color: var(--yellow, #facc15);
    color: var(--yellow, #facc15);
    box-shadow: 0 0 10px Rgba(250, 204, 21, 0.2);
  }
}

.medals-row {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.medal-slot {
  background: Rgba(0, 0, 0, 0.35);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  filter: Grayscale(1) Opacity(0.4);
  box-sizing: border-box;
  width: 100%;

  &:hover {
    background: Rgba(255, 255, 255, 0.06);
    border-color: Rgba(255, 255, 255, 0.2);
    transform: Translatey(-2px);
  }

  .medal-icon-wrap {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: Rgba(255, 255, 255, 0.04);
    border: 1px solid Rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;

    .badge-sprite-img {
      width: 24px;
      height: 24px;
      object-fit: contain;
      image-rendering: pixelated;
    }
  }

  .medal-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    text-align: center;
    width: 100%;

    .leader-name {
      @include pixelated;
      font-size: 7px;
      color: var(--white);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .badge-status {
      @include pixelated;
      font-size: 6px;
      color: Rgba(148, 163, 184, 0.7);
    }
  }

  &.is-conquered {
    filter: none;
    opacity: 1;
    border-color: Rgba(250, 204, 21, 0.35);
    background: Rgba(250, 204, 21, 0.04);

    .medal-icon-wrap {
      background: linear-gradient(135deg, Rgba(255, 215, 0, 0.2) 0%, Rgba(255, 215, 0, 0.05) 100%);
      border-color: var(--yellow);
      box-shadow: 0 0 12px Rgba(250, 204, 21, 0.3);
    }

    .badge-status {
      color: var(--yellow);
      font-weight: bold;
    }

    &:hover {
      border-color: var(--yellow);
      box-shadow: 0 4px 16px Rgba(250, 204, 21, 0.2);
    }
  }
}
</style>
