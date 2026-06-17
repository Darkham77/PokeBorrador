<script setup lang="ts">
import { useStatHover } from '@/composables/ui/useStatHover'

interface Props {
  rankedMaxElo: number
  boxCount: number
  shinyCount: number
  longestStreak: number
  maxDamage: number
  totalBattles: number
  tradeVolume: number
  captureEfficiency: number
}

defineProps<Props>()

const { handleStatEnter, handleStatLeave } = useStatHover()
</script>

<template>
  <div class="profile-section-card achievements-card">
    <div class="section-label">
      LOGROS DE ENTRENADOR
    </div>
    <div class="stats-grid">
      <div
        class="stat-item"
        @mouseenter="handleStatEnter"
        @mouseleave="handleStatLeave"
      >
        <span class="stat-val ELO">{{ rankedMaxElo }}</span>
        <span class="stat-lbl">ELO Máximo</span>
      </div>
      <div
        class="stat-item"
        @mouseenter="handleStatEnter"
        @mouseleave="handleStatLeave"
      >
        <span class="stat-val">{{ boxCount }}</span>
        <span class="stat-lbl">Pokémon en Caja</span>
      </div>
      <div
        class="stat-item highlight-war-coins"
        @mouseenter="handleStatEnter"
        @mouseleave="handleStatLeave"
      >
        <span class="stat-val shiny-text">✨ {{ shinyCount }}</span>
        <span class="stat-lbl">Shinies</span>
      </div>
      <div
        class="stat-item"
        @mouseenter="handleStatEnter"
        @mouseleave="handleStatLeave"
      >
        <span class="stat-val yellow-text">{{ longestStreak }}</span>
        <span class="stat-lbl">Racha Captura</span>
      </div>
      <!-- Nuevas Métricas -->
      <div
        class="stat-item"
        @mouseenter="handleStatEnter"
        @mouseleave="handleStatLeave"
      >
        <span class="stat-val danger-text">{{ maxDamage }}</span>
        <span class="stat-lbl">Daño Máx. Turno</span>
      </div>
      <div
        class="stat-item"
        @mouseenter="handleStatEnter"
        @mouseleave="handleStatLeave"
      >
        <span class="stat-val primary-text">{{ totalBattles }}</span>
        <span class="stat-lbl">Combates Totales</span>
      </div>
      <div
        class="stat-item highlight-war-coins"
        @mouseenter="handleStatEnter"
        @mouseleave="handleStatLeave"
      >
        <span class="stat-val yellow-text">{{ tradeVolume }}</span>
        <span class="stat-lbl">Intercambios GTS</span>
      </div>
      <div
        class="stat-item"
        @mouseenter="handleStatEnter"
        @mouseleave="handleStatLeave"
      >
        <span class="stat-val green-text">{{ captureEfficiency }}%</span>
        <span class="stat-lbl">Eficiencia Captura</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.profile-section-card {
  padding: 20px;
  background: Rgba(255, 255, 255, 0.02);
  border-radius: 20px;
  border: 1px solid Rgba(255, 255, 255, 0.05);

  .section-label {
    @include pixelated;
    font-size: 8px;
    color: Rgba(255, 255, 255, 0.3);
    margin-bottom: 16px;
    letter-spacing: 1px;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-item {
  background: Rgba(15, 23, 42, 0.95);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 18px;
  padding: 16px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
  @include gpu-layer;

  &.highlight-war-coins {
    background: linear-gradient(135deg, Rgba(251, 191, 36, 0.05) 0%, Rgba(15, 23, 42, 0.4) 100%);
    border-color: Rgba(251, 191, 36, 0.2);

    .stat-val {
      color: #fbbf24;
      text-shadow: 0 0 10px Rgba(251, 191, 36, 0.4);
    }
  }
}

.stat-val {
  @include pixelated;
  font-size: 14px;
  color: var(--white);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.stat-lbl {
  @include pixelated;
  font-size: 6px;
  color: Rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.danger-text { color: #f87171 !important; text-shadow: 0 0 10px Rgba(239, 68, 68, 0.4); }
.primary-text { color: #60a5fa !important; text-shadow: 0 0 10px Rgba(59, 130, 246, 0.4); }
.yellow-text { color: #fbbf24 !important; text-shadow: 0 0 10px Rgba(251, 191, 36, 0.4); }
.shiny-text { color: #fbbf24 !important; text-shadow: 0 0 10px Rgba(251, 191, 36, 0.4); }
.green-text { color: #4ade80 !important; text-shadow: 0 0 10px Rgba(34, 197, 94, 0.4); }
</style>
