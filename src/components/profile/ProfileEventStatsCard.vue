<script setup lang="ts">
import { formatCurrency } from '@/logic/utils/formatters'

interface Props {
  participations?: number
  medalsTotal?: number
  firstPlace?: number
  secondPlace?: number
  thirdPlace?: number
  handleStatEnter?: (e: MouseEvent) => void
  handleStatLeave?: (e: MouseEvent) => void
}

withDefaults(defineProps<Props>(), {
  participations: 0,
  medalsTotal: 0,
  firstPlace: 0,
  secondPlace: 0,
  thirdPlace: 0,
  handleStatEnter: undefined,
  handleStatLeave: undefined
})

const formatNum = (num: number) => formatCurrency(num)
</script>

<template>
  <div class="profile-section-card event-stats-card">
    <div class="section-label">
      TORNEOS Y COMPETICIONES DE EVENTOS
    </div>

    <!-- Fila Principal: Participaciones y Medallas Totales -->
    <div class="stats-grid main-event-grid">
      <div
        class="stat-item highlight-participations"
        @mouseenter="handleStatEnter"
        @mouseleave="handleStatLeave"
      >
        <span class="stat-val">
          <span class="emoji event-stat-icon">🎮</span>
          {{ formatNum(participations) }}
        </span>
        <span class="stat-lbl">Eventos Participados</span>
      </div>

      <div
        class="stat-item highlight-medals-total"
        @mouseenter="handleStatEnter"
        @mouseleave="handleStatLeave"
      >
        <span class="stat-val">
          <span class="emoji event-stat-icon">🏆</span>
          {{ formatNum(medalsTotal) }}
        </span>
        <span class="stat-lbl">Medallas Totales</span>
      </div>
    </div>

    <!-- Podio de Medallas (1º Oro, 2º Plata, 3º Bronce) -->
    <div class="podium-medals-grid">
      <div
        class="stat-item medal-item gold"
        title="Medallas de 1er Puesto (Oro)"
        @mouseenter="handleStatEnter"
        @mouseleave="handleStatLeave"
      >
        <span class="stat-val gold-text">
          <span class="emoji medal-icon">🥇</span>
          {{ formatNum(firstPlace) }}
        </span>
        <span class="stat-lbl">1er Puesto (Oro)</span>
      </div>

      <div
        class="stat-item medal-item silver"
        title="Medallas de 2do Puesto (Plata)"
        @mouseenter="handleStatEnter"
        @mouseleave="handleStatLeave"
      >
        <span class="stat-val silver-text">
          <span class="emoji medal-icon">🥈</span>
          {{ formatNum(secondPlace) }}
        </span>
        <span class="stat-lbl">2do Puesto (Plata)</span>
      </div>

      <div
        class="stat-item medal-item bronze"
        title="Medallas de 3er Puesto (Bronce)"
        @mouseenter="handleStatEnter"
        @mouseleave="handleStatLeave"
      >
        <span class="stat-val bronze-text">
          <span class="emoji medal-icon">🥉</span>
          {{ formatNum(thirdPlace) }}
        </span>
        <span class="stat-lbl">3er Puesto (Bronce)</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;
@use "@/styles/components/cosmetics" as *;
@use "@/styles/components/_profile-shared.scss" as *;

.event-stats-card {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .main-event-grid {
    margin-bottom: 0;
  }

  .podium-medals-grid {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(3, 1fr);
  }

  .event-stat-icon {
    font-size: 16px;
    filter: Drop-Shadow(0 2px 4px Rgb(0 0 0 / 40%));
  }

  .medal-icon {
    font-size: 14px;
    filter: Drop-Shadow(0 2px 4px Rgb(0 0 0 / 40%));
  }

  .highlight-participations {
    background: Linear-Gradient(135deg, Rgb(168 85 247 / 8%) 0%, Rgb(15 23 42 / 60%) 100%);
    border-color: Rgb(168 85 247 / 25%);

    .stat-val {
      color: #c084fc;
      text-shadow: 0 0 10px Rgb(192 132 252 / 40%);
    }
  }

  .highlight-medals-total {
    background: Linear-Gradient(135deg, Rgb(250 204 21 / 8%) 0%, Rgb(15 23 42 / 60%) 100%);
    border-color: Rgb(250 204 21 / 30%);

    .stat-val {
      color: #facc15;
      text-shadow: 0 0 10px Rgb(250 204 21 / 40%);
    }
  }

  .medal-item {
    gap: 6px;
    padding: 12px 6px;

    &.gold {
      background: Linear-Gradient(135deg, Rgb(234 179 8 / 12%) 0%, Rgb(15 23 42 / 70%) 100%);
      border-color: Rgb(234 179 8 / 35%);

      .gold-text {
        color: #fde047;
        text-shadow: 0 0 8px Rgb(253 224 71 / 50%);
      }
    }

    &.silver {
      background: Linear-Gradient(135deg, Rgb(148 163 184 / 12%) 0%, Rgb(15 23 42 / 70%) 100%);
      border-color: Rgb(148 163 184 / 35%);

      .silver-text {
        color: #e2e8f0;
        text-shadow: 0 0 8px Rgb(226 232 240 / 50%);
      }
    }

    &.bronze {
      background: Linear-Gradient(135deg, Rgb(249 115 22 / 12%) 0%, Rgb(15 23 42 / 70%) 100%);
      border-color: Rgb(249 115 22 / 35%);

      .bronze-text {
        color: #fdba74;
        text-shadow: 0 0 8px Rgb(253 186 116 / 50%);
      }
    }

    .stat-val {
      gap: 4px;
      font-size: 13px;
    }

    .stat-lbl {
      font-size: 6.5px;
    }
  }
}
</style>
