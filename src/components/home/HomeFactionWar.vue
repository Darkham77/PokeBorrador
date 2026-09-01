<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useWarStore } from '@/stores/war'
import { useModalStore } from '@/stores/modals'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

const warStore = useWarStore()
const modalStore = useModalStore()

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

const openWarModal = () => {
  modalStore.open('FactionWar')
}

const openWarShop = () => {
  modalStore.open('WarShop')
}

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
        <button
          id="home-war-shop-btn"
          v-gsap-hover
          class="card-action-btn"
          @click.stop="openWarShop"
        >
          <span class="emoji">🪙</span>
          TIENDA
        </button>
        <button
          id="home-war-open-btn"
          v-gsap-hover
          class="card-action-btn primary"
          @click.stop="openWarModal"
        >
          <span class="emoji">🗺️</span>
          MAPA DE GUERRA
        </button>
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
  flex-wrap: wrap;
  gap: 8px;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;

  .card-icon {
    font-size: 16px;
  }

  .title-text-group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .card-title {
    @include pixelated;
    font-size: 10px;
    color: var(--yellow, #facc15);
    margin: 0;
    letter-spacing: 1px;
  }

  .phase-pill {
    @include pixelated;
    font-size: 7px;
    padding: 2px 6px;
    border-radius: 4px;

    &.is-dispute {
      background: Rgba(239, 68, 68, 0.15);
      border: 1px solid Rgba(239, 68, 68, 0.4);
      color: #f87171;
    }

    &.is-dominance {
      background: Rgba(34, 197, 94, 0.15);
      border: 1px solid Rgba(34, 197, 94, 0.4);
      color: #4ade80;
    }
  }
}

.header-actions {
  display: flex;
  gap: 8px;
}

.card-action-btn {
  @include widget-action-btn;

  &.primary {
    background: Rgba(250, 204, 21, 0.12);
    border-color: Rgba(250, 204, 21, 0.35);
    color: var(--yellow, #facc15);

    &:hover {
      background: Rgba(250, 204, 21, 0.22);
      border-color: var(--yellow, #facc15);
    }
  }
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
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.team-score {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;

  .faction-logo {
    width: 28px;
    height: 28px;
    object-fit: contain;
    @include pixelated;
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
      font-size: 10px;
      color: Rgba(255, 255, 255, 0.6);
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
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
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
    font-size: 8px;
    color: Rgba(255, 255, 255, 0.3);
  }
}

.dual-progress-bar {
  height: 8px;
  border-radius: 4px;
  background: Rgba(0, 0, 0, 0.4);
  overflow: hidden;
  display: flex;
  border: 1px solid Rgba(255, 255, 255, 0.08);

  .union-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
  }

  .poder-fill {
    height: 100%;
    background: linear-gradient(90deg, #ef4444, #f87171);
  }
}

.user-war-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.summary-chip {
  flex: 1;
  min-width: 140px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.06);
  border-radius: 6px;

  .chip-label {
    @include pixelated;
    font-size: 7px;
    color: Rgba(255, 255, 255, 0.5);
  }

  .chip-value {
    @include pixelated;
    font-size: 8px;
    color: var(--white, #ffffff);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    line-height: 1;

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
