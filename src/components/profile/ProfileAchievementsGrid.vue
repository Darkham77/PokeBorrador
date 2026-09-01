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
        <span class="stat-val shiny-text"><span class="emoji">✨</span> {{ shinyCount }}</span>
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
@use "@/styles/components/_profile-shared.scss";
</style>
