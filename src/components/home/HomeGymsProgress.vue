<script setup lang="ts">
import { computed } from 'vue'
import { GYMS, type GymId } from '@/data/world/gyms'
import type { BattleDifficulty } from '@/types/battle/battle'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useGymsStore } from '@/stores/gyms'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVTooltip from '@/components/common/PVTooltip.vue'
import HomeWidgetMinimizeBtn from './HomeWidgetMinimizeBtn.vue'

const gameStore = useGameStore()
const uiStore = useUIStore()
const gymsStore = useGymsStore()

const defeatedGyms = computed<readonly GymId[]>(() => gameStore.state.defeatedGyms || [])
const defeatedCount = computed(() => defeatedGyms.value.length)

const isGymDefeated = (gymId: GymId) => {
  return defeatedGyms.value.includes(gymId)
}

const isDiffWon = (gymId: GymId, diff: BattleDifficulty) => {
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
  
  let rematchStatus = ''
  if (gymsStore.isRematchAvailable(gym.id)) {
    rematchStatus = ' | 🔥 ¡Revancha diaria disponible hoy!'
  } else if (gymsStore.isRematchDoneToday(gym.id)) {
    rematchStatus = ' | ✓ Revancha completada hoy'
  }

  return `${gym.leader} (${gym.city}) · ${status} | ${easy} · ${norm} · ${hard}${rematchStatus}`
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
        <HomeWidgetMinimizeBtn widget-id="gyms" />
      </div>
    </div>

    <!-- Banner de Revanchas Diarias si hay líderes listos para revancha -->
    <div
      v-if="gymsStore.availableRematchesCount > 0"
      v-gsap-hover
      class="rematches-banner"
      @click.stop="openGyms"
    >
      <div class="rematches-banner-left">
        <span class="emoji flame">🔥</span>
        <span class="banner-title">
          {{ gymsStore.availableRematchesCount }} REVANCHA{{ gymsStore.availableRematchesCount > 1 ? 'S' : '' }} DIARIA{{ gymsStore.availableRematchesCount > 1 ? 'S' : '' }} DISPONIBLE{{ gymsStore.availableRematchesCount > 1 ? 'S' : '' }}
        </span>
      </div>
      <span class="banner-btn">DESAFIAR <span class="emoji">➔</span></span>
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
            'is-mastered': isGymMastered(gym.id),
            'has-rematch': gymsStore.isRematchAvailable(gym.id)
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
              v-if="gymsStore.isRematchAvailable(gym.id)"
              class="rematch-fire-badge emoji"
              title="Revancha diaria disponible"
            >🔥</span>
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
  @include home-section-card;
}

.card-header-bar {
  @include home-card-header-bar;
}

.title-wrap {
  @include home-card-title-wrap;

  .card-icon {
    font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif !important;
  }

  .title-text-group {
    gap: 3px;
  }

  .card-title {
    @include pixelated;

    margin: 0;
    color: var(--yellow, #facc15);
    font-size: 11px;
    line-height: 1.35;
    letter-spacing: 0.5px;
  }

  .gyms-sub {
    color: Rgb(255 255 255 / 50%);
    font-size: 10px;
    line-height: 1.35;
  }
}

.header-actions {
  @include widget-header-actions;

  flex-shrink: 0;
  margin-left: auto;
}

.rematches-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid Rgb(249 115 22 / 40%);
  border-radius: 8px;
  background: Linear-Gradient(135deg, Rgb(234 88 12 / 25%) 0%, Rgb(180 83 9 / 20%) 100%);
  cursor: pointer;
  box-shadow: 0 2px 12px Rgb(234 88 12 / 20%);

  &:hover {
    background: Linear-Gradient(135deg, Rgb(234 88 12 / 35%) 0%, Rgb(180 83 9 / 30%) 100%);
    transform: Translatey(-1px);
    border-color: #f97316;
  }

  .rematches-banner-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .flame {
      font-size: 14px;
    }

    .banner-title {
      color: #fdba74;
      font-size: 11px;
      font-weight: bold;
      letter-spacing: 0.5px;
    }
  }

  .banner-btn {
    padding: 3px 8px;
    border: 1px solid Rgb(249 115 22 / 40%);
    border-radius: 4px;
    background: Rgb(249 115 22 / 30%);
    color: #fed7aa;
    font-size: 10px;
    font-weight: bold;
  }
}

.medals-row {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(8, 1fr);

  @media (width <= 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (width <= 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.medal-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  width: 100%;
  padding: 8px 4px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: 8px;
  background: Rgb(0 0 0 / 35%);
  cursor: pointer;
  filter: Grayscale(1) Opacity(0.4);
  box-sizing: border-box;

  &:hover {
    background: Rgb(255 255 255 / 6%);
    transform: Translatey(-2px);
    border-color: Rgb(255 255 255 / 20%);
  }

  &.has-rematch {
    background: Rgb(249 115 22 / 8%);
    border-color: Rgb(249 115 22 / 50%);
    filter: none;
    box-shadow: 0 0 10px Rgb(249 115 22 / 20%);
  }

  .medal-icon-wrap {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 32px;
    height: 32px;
    border: 1px solid Rgb(255 255 255 / 8%);
    border-radius: 8px;
    background: Rgb(255 255 255 / 4%);

    .badge-sprite-img {
      width: 24px;
      height: 24px;
      object-fit: contain;
      image-rendering: pixelated;
    }

    .rematch-fire-badge {
      position: absolute;
      top: -6px;
      left: -6px;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      font-size: 11px;
      line-height: 1.25 !important;
      filter: Drop-Shadow(0 0 4px #f97316);
    }

    .master-crown {
      position: absolute;
      top: -6px;
      right: -6px;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif !important;
      font-size: 9px;
      line-height: 1.25 !important;
      filter: Drop-Shadow(0 2px 4px Rgb(0 0 0 / 80%));
    }
  }

  .medal-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    width: 100%;
    text-align: center;

    .leader-name {
      @include pixelated;

      max-width: 100%;
      color: var(--white);
      font-size: 7px;
      line-height: 1.45;
      padding-bottom: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .diff-chips-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 3px;
      width: 100%;
    }

    .diff-chip {
      @include pixelated;

      display: inline-flex;
      justify-content: center;
      align-items: center;
      width: 14px;
      height: 13px;
      padding: 0;
      border: 1px dashed Rgb(255 255 255 / 15%);
      border-radius: 3px;
      background: Rgb(255 255 255 / 4%);
      color: Rgb(255 255 255 / 30%);
      font-size: 6px;
      font-weight: 800;
      line-height: 1.35;
      text-align: center;
      box-sizing: border-box;

      &.won {
        border-style: solid;

        &.is-easy {
          background: Rgb(74 222 128 / 20%);
          color: #4ade80;
          border-color: Rgb(74 222 128 / 60%);
        }

        &.is-normal {
          background: Rgb(56 189 248 / 20%);
          color: #38bdf8;
          border-color: Rgb(56 189 248 / 60%);
        }

        &.is-hard {
          background: Rgb(250 204 21 / 20%);
          color: #facc15;
          border-color: Rgb(250 204 21 / 60%);
          box-shadow: 0 0 6px Rgb(250 204 21 / 25%);
        }
      }
    }

    .badge-status {
      @include pixelated;

      color: Rgb(148 163 184 / 70%);
      font-size: 6px;
      line-height: 1.35;

      &.mastered {
        color: #facc15;
        font-weight: bold;
        text-shadow: 0 0 4px Rgb(250 204 21 / 40%);
      }

      &.partial {
        color: #38bdf8;
        font-weight: bold;
      }
    }
  }

  &.is-conquered {
    background: Rgb(250 204 21 / 4%);
    opacity: 1;
    filter: none;
    border-color: Rgb(250 204 21 / 35%);

    &:hover {
      border-color: var(--yellow);
      box-shadow: 0 4px 16px Rgb(250 204 21 / 20%);
    }

    .medal-icon-wrap {
      background: Linear-Gradient(135deg, Rgb(255 215 0 / 20%) 0%, Rgb(255 215 0 / 5%) 100%);
      border-color: var(--yellow);
      box-shadow: 0 0 12px Rgb(250 204 21 / 30%);
    }
  }

  &.is-mastered {
    background: Radial-Gradient(circle at 50% 0%, Rgb(250 204 21 / 12%) 0%, Rgb(250 204 21 / 2%) 100%), Rgb(18 22 34 / 95%);
    border-color: Rgb(250 204 21 / 60%);
    box-shadow: 0 0 14px Rgb(250 204 21 / 20%);

    &:hover {
      border-color: #facc15;
      box-shadow: 0 0 20px Rgb(250 204 21 / 35%);
    }
  }
}
</style>

