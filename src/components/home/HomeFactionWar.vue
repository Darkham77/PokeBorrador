<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useWarStore } from '@/stores/war'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import HomeWidgetMinimizeBtn from './HomeWidgetMinimizeBtn.vue'

const warStore = useWarStore()

const isDispute = computed(() => warStore.isDisputeActive)
const faction = computed(() => warStore.faction)

const globalScore = computed(() => {
  let union = 0
  let poder = 0
  Object.values(warStore.mapDominance).forEach((m) => {
    if (m.winner === 'union') union++
    else if (m.winner === 'poder') poder++
    else if ((m.union ?? 0) > (m.poder ?? 0)) union++
    else if ((m.poder ?? 0) > (m.union ?? 0)) poder++
  })
  const total = Math.max(1, union + poder)
  const unionPercent = Math.round((union / total) * 100)
  const poderPercent = 100 - unionPercent
  return { union, poder, unionPercent, poderPercent }
})

onMounted(() => {
  void warStore.loadWarData()
})
</script>

<template>
  <div class="home-faction-war home-section-card">
    <div class="card-header-bar">
      <div class="title-wrap">
        <span class="emoji">⚔️</span>
        <div class="title-text-group">
          <h3 class="card-title">
            GUERRA TERRITORIAL DE FACCIONES
          </h3>
          <span
            class="phase-pill"
            :class="isDispute ? 'is-dispute' : 'is-dominance'"
          >
            <span class="emoji">{{ isDispute ? '⚔️' : '🏆' }}</span> {{ isDispute ? 'FASE DE DISPUTA' : 'FASE DE DOMINANCIA' }}
          </span>
        </div>
      </div>

      <div class="header-actions">
        <HomeWidgetMinimizeBtn widget-id="faction" />
      </div>
    </div>

    <div class="war-body">
      <!-- Dominance Bar -->
      <div class="dominance-section">
        <div class="team-score union-side">
          <img
            :src="getAssetUrl(ASSET_TYPES.FACTION, 'union')"
            alt="Unión"
            class="faction-logo"
            @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
          >
          <div class="score-data">
            <span class="team-name">UNIÓN</span>
            <span class="team-count">{{ globalScore.union }} Rutas</span>
          </div>
        </div>

        <div class="progress-bar-container">
          <div class="bar-labels">
            <span class="percent-label union">{{ globalScore.unionPercent }}%</span>
            <span class="vs-text">VS</span>
            <span class="percent-label poder">{{ globalScore.poderPercent }}%</span>
          </div>
          <div class="dual-progress-bar">
            <div
              class="union-fill"
              :style="{ width: globalScore.unionPercent + '%' }"
            />
            <div
              class="poder-fill"
              :style="{ width: globalScore.poderPercent + '%' }"
            />
          </div>
        </div>

        <div class="team-score poder-side">
          <div class="score-data right">
            <span class="team-name">PODER</span>
            <span class="team-count">{{ globalScore.poder }} Rutas</span>
          </div>
          <img
            :src="getAssetUrl(ASSET_TYPES.FACTION, 'poder')"
            alt="Poder"
            class="faction-logo"
            @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
          >
        </div>
      </div>

      <!-- User Faction Status -->
      <div class="user-war-summary">
        <div class="summary-chip">
          <span class="chip-label">TU FACCIÓN:</span>
          <span
            class="chip-value"
            :class="faction"
          >
            <template v-if="faction === 'union'">
              <span class="emoji">⭐</span> Unión
            </template>
            <template v-else-if="faction === 'poder'">
              <span class="emoji">✊</span> Poder
            </template>
            <template v-else>
              Sin afiliar
            </template>
          </span>
        </div>
        <div class="summary-chip">
          <span class="chip-label">PUNTOS SEMANA:</span>
          <span class="chip-value pts">{{ warStore.weeklyPoints }} PT</span>
        </div>
        <div class="summary-chip">
          <span class="chip-label">MONEDAS DE GUERRA:</span>
          <span class="chip-value coins">{{ warStore.warCoins }} <span class="emoji">🪙</span></span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.home-faction-war {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: 12px;
  background: Rgb(18 22 34 / 85%);
  box-sizing: border-box;
  box-shadow: 0 4px 16px Rgb(0 0 0 / 40%);
}

.card-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid Rgb(255 255 255 / 6%);
}

.title-wrap {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  flex: 1;

  .card-icon {
    font-size: 16px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .title-text-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .card-title {
    @include pixelated;

    margin: 0;
    color: var(--yellow, #facc15);
    font-size: 10px;
    line-height: 1.35;
    letter-spacing: 0.5px;
  }

  .phase-pill {
    @include pixelated;

    padding: 2px 6px;
    border-radius: 4px;
    font-size: 7px;
    align-self: flex-start;

    &.is-dispute {
      border: 1px solid Rgb(239 68 68 / 40%);
      background: Rgb(239 68 68 / 15%);
      color: #f87171;
    }

    &.is-dominance {
      border: 1px solid Rgb(34 197 94 / 40%);
      background: Rgb(34 197 94 / 15%);
      color: #4ade80;
    }
  }
}

.header-actions {
  @include widget-header-actions;

  flex-shrink: 0;
  margin-left: auto;
}

.war-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dominance-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: 8px;
  background: Rgb(255 255 255 / 2%);
}

.team-score {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;

  .faction-logo {
    @include pixelated;

    width: 28px;
    height: 28px;
    object-fit: contain;
  }

  .score-data {
    display: flex;
    flex-direction: column;
    gap: 2px;

    &.right {
      align-items: flex-end;
    }

    .team-name {
      @include pixelated;

      font-size: 8px;
      letter-spacing: 0.5px;
    }

    .team-count {
      color: Rgb(255 255 255 / 60%);
      font-size: 10px;
    }
  }

  &.union-side .team-name {
    color: #60a5fa;
  }

  &.poder-side .team-name {
    color: #f87171;
  }
}

.progress-bar-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.bar-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 9px;

  .percent-label.union {
    @include pixelated;

    color: #60a5fa;
  }

  .percent-label.poder {
    @include pixelated;

    color: #f87171;
  }

  .vs-text {
    @include pixelated;

    color: Rgb(255 255 255 / 30%);
    font-size: 8px;
  }
}

.dual-progress-bar {
  display: flex;
  height: 8px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: 4px;
  background: Rgb(0 0 0 / 40%);
  overflow: hidden;

  .union-fill {
    height: 100%;
    background: Linear-Gradient(90deg, #3b82f6, #60a5fa);
  }

  .poder-fill {
    height: 100%;
    background: Linear-Gradient(90deg, #ef4444, #f87171);
  }
}

.user-war-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.summary-chip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 140px;
  padding: 6px 10px;
  border: 1px solid Rgb(255 255 255 / 6%);
  border-radius: 6px;
  background: Rgb(255 255 255 / 3%);
  flex: 1;

  .chip-label {
    @include pixelated;

    color: Rgb(255 255 255 / 50%);
    font-size: 7px;
  }

  .chip-value {
    @include pixelated;

    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--white, #fff);
    font-size: 8px;

    &.union {
      color: #60a5fa;
    }

    &.poder {
      color: #f87171;
    }

    &.pts {
      color: #38bdf8;
    }

    &.coins {
      color: var(--yellow, #facc15);
    }
  }
}
</style>
