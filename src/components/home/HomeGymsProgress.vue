<script setup lang="ts">
import { computed } from 'vue'
import { GYMS, type GymId, type GymDifficultyId } from '@/data/world/gyms'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useGymsStore } from '@/stores/gyms'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVTooltip from '@/components/common/PVTooltip.vue'

const gameStore = useGameStore()
const uiStore = useUIStore()
const gymsStore = useGymsStore()

const defeatedGyms = computed<readonly GymId[]>(() => gameStore.state.defeatedGyms || [])
const defeatedCount = computed(() => defeatedGyms.value.length)

const isGymDefeated = (gymId: GymId) => {
  return defeatedGyms.value.includes(gymId)
}

const isDiffWon = (gymId: GymId, diff: GymDifficultyId) => {
  return gymsStore.isDifficultyDefeated(gymId, diff)
}

const getWonDiffCount = (gymId: GymId) => {
  let count = 0
  if (isDiffWon(gymId, 'easy')) count++
  if (isDiffWon(gymId, 'normal')) count++
  if (isDiffWon(gymId, 'hard')) count++
  return count
}

const isGymMastered = (gymId: GymId) => {
  return getWonDiffCount(gymId) === 3
}

const totalDifficultiesWon = computed(() => {
  return GYMS.reduce((acc, g) => acc + getWonDiffCount(g.id), 0)
})

const getGymTooltipDesc = (gym: (typeof GYMS)[number]) => {
  const easy = isDiffWon(gym.id, 'easy') ? '✅ Fácil' : '⏳ Fácil (Pendiente)'
  const norm = isDiffWon(gym.id, 'normal') ? '✅ Normal' : '⏳ Normal (Pendiente)'
  const hard = isDiffWon(gym.id, 'hard') ? '✅ Difícil' : '⏳ Difícil (Pendiente)'
  const count = getWonDiffCount(gym.id)
  const status = count === 3 ? '👑 ¡Gimnasio Dominado al 100%!' : `${count}/3 Dificultades superadas`
  return `${gym.leader} (${gym.city}) · ${status} | ${easy} · ${norm} · ${hard}`
}

const openGyms = () => {
  uiStore.activeTab = 'gyms'
}
</script>

<template>
  <div class="home-gyms-progress home-section-card">
    <div class="card-header-bar">
      <div class="title-wrap">
        <span class="emoji card-icon">🏆</span>
        <div class="title-text-group">
          <h3 class="card-title">
            GIMNASIOS DE KANTO
          </h3>
          <span class="gyms-sub">
            {{ defeatedCount }}/8 Medallas Conquistadas · {{ totalDifficultiesWon }}/24 Dificultades
          </span>
        </div>
      </div>

      <div class="header-actions">
        <button
          id="home-gyms-open-btn"
          v-gsap-hover
          class="card-action-btn"
          @click.stop="openGyms"
        >
          <span class="emoji">⚡</span>
          DESAFIAR
        </button>
      </div>
    </div>

    <div class="medals-row">
      <PVTooltip
        v-for="gym in GYMS"
        :key="gym.id"
        :title="gym.badgeName"
        :description="getGymTooltipDesc(gym)"
      >
        <div
          v-gsap-hover="{ scale: 1.05, y: -2 }"
          class="medal-slot"
          :class="{ 
            'is-conquered': isGymDefeated(gym.id),
            'is-mastered': isGymMastered(gym.id)
          }"
          @click.stop="openGyms"
        >
          <div class="medal-icon-wrap">
            <img
              :src="getAssetUrl(ASSET_TYPES.BADGE, gym.id)"
              :alt="gym.badgeName"
              class="badge-sprite-img"
            >
            <span
              v-if="isGymMastered(gym.id)"
              class="master-crown emoji"
            >👑</span>
          </div>
          <div class="medal-info">
            <span class="leader-name">{{ gym.leader }}</span>
            
            <!-- Compact 3-difficulty indicators: F (Fácil) | N (Normal) | D (Difícil) -->
            <div class="diff-chips-row">
              <span
                class="diff-chip is-easy"
                :class="{ won: isDiffWon(gym.id, 'easy') }"
              >F</span>
              <span
                class="diff-chip is-normal"
                :class="{ won: isDiffWon(gym.id, 'normal') }"
              >N</span>
              <span
                class="diff-chip is-hard"
                :class="{ won: isDiffWon(gym.id, 'hard') }"
              >D</span>
            </div>

            <span
              class="badge-status"
              :class="{ 
                mastered: isGymMastered(gym.id),
                partial: isGymDefeated(gym.id) && !isGymMastered(gym.id)
              }"
            >
              {{ isGymMastered(gym.id) ? 'DOMINADO' : (isGymDefeated(gym.id) ? `${getWonDiffCount(gym.id)}/3` : 'PENDIENTE') }}
            </span>
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
    line-height: 1 !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif !important;
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
    line-height: 1.35;
    letter-spacing: 0.5px;
  }

  .gyms-sub {
    font-size: 10px;
    line-height: 1.35;
    color: Rgba(255, 255, 255, 0.5);
  }
}

.card-action-btn {
  @include widget-action-btn;
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
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
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
    position: relative;
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

    .master-crown {
      position: absolute;
      top: -6px;
      right: -6px;
      font-size: 9px;
      line-height: 1 !important;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif !important;
      filter: Drop-Shadow(0 2px 4px Rgba(0, 0, 0, 0.8));
    }
  }

  .medal-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    text-align: center;
    width: 100%;

    .leader-name {
      @include pixelated;
      font-size: 7px;
      line-height: 1.35;
      color: var(--white);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .diff-chips-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      width: 100%;
    }

    .diff-chip {
      @include pixelated;
      font-size: 6px;
      line-height: 1.35;
      padding: 0;
      border-radius: 3px;
      font-weight: 800;
      text-align: center;
      width: 14px;
      height: 13px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      background: Rgba(255, 255, 255, 0.04);
      border: 1px dashed Rgba(255, 255, 255, 0.15);
      color: Rgba(255, 255, 255, 0.3);

      &.won {
        border-style: solid;

        &.is-easy {
          background: Rgba(74, 222, 128, 0.2);
          border-color: Rgba(74, 222, 128, 0.6);
          color: #4ade80;
        }

        &.is-normal {
          background: Rgba(56, 189, 248, 0.2);
          border-color: Rgba(56, 189, 248, 0.6);
          color: #38bdf8;
        }

        &.is-hard {
          background: Rgba(250, 204, 21, 0.2);
          border-color: Rgba(250, 204, 21, 0.6);
          color: #facc15;
          box-shadow: 0 0 6px Rgba(250, 204, 21, 0.25);
        }
      }
    }

    .badge-status {
      @include pixelated;
      font-size: 6px;
      line-height: 1.35;
      color: Rgba(148, 163, 184, 0.7);

      &.mastered {
        color: #facc15;
        font-weight: bold;
        text-shadow: 0 0 4px Rgba(250, 204, 21, 0.4);
      }

      &.partial {
        color: #38bdf8;
        font-weight: bold;
      }
    }
  }

  &.is-conquered {
    filter: none;
    opacity: 1;
    border-color: Rgba(250, 204, 21, 0.35);
    background: Rgba(250, 204, 21, 0.04);

    .medal-icon-wrap {
      background: Linear-Gradient(135deg, Rgba(255, 215, 0, 0.2) 0%, Rgba(255, 215, 0, 0.05) 100%);
      border-color: var(--yellow);
      box-shadow: 0 0 12px Rgba(250, 204, 21, 0.3);
    }

    &:hover {
      border-color: var(--yellow);
      box-shadow: 0 4px 16px Rgba(250, 204, 21, 0.2);
    }
  }

  &.is-mastered {
    border-color: Rgba(250, 204, 21, 0.6);
    background: Radial-Gradient(circle at 50% 0%, Rgba(250, 204, 21, 0.12) 0%, Rgba(250, 204, 21, 0.02) 100%), Rgba(18, 22, 34, 0.95);
    box-shadow: 0 0 14px Rgba(250, 204, 21, 0.2);

    &:hover {
      border-color: #facc15;
      box-shadow: 0 0 20px Rgba(250, 204, 21, 0.35);
    }
  }
}
</style>

