<script setup lang="ts">
defineProps<{
  faction: string | null | undefined
  totalWarPoints: number
  warCoins: number
  formatNum: (num: number) => string
  handleStatEnter: (e: MouseEvent) => void
  handleStatLeave: (e: MouseEvent) => void
}>()
</script>

<template>
  <div
    v-if="faction"
    class="profile-section-card war-card"
  >
    <div class="section-label">
      GUERRA DE BANDOS
    </div>
    <div class="stats-grid">
      <div
        class="stat-item highlight-war-points"
        @mouseenter="handleStatEnter"
        @mouseleave="handleStatLeave"
      >
        <span class="stat-val">
          <i class="fas fa-shield-alt icon-war" />
          {{ formatNum(totalWarPoints) }}
        </span>
        <span class="stat-lbl">Puntos de Guerra</span>
      </div>
      <div
        class="stat-item highlight-war-coins"
        @mouseenter="handleStatEnter"
        @mouseleave="handleStatLeave"
      >
        <span class="stat-val">
          <i class="fas fa-coins icon-war-coin" />
          {{ formatNum(warCoins) }}
        </span>
        <span class="stat-lbl">Monedas de Guerra</span>
      </div>
    </div>
  </div>
</template>
