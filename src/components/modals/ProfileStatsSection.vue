<script setup lang="ts">
interface ClassStat {
  label: string
  value: string | number
  class?: string
}

interface ActivityStat {
  label: string
  value: string | number
  class?: string
}

defineProps<{
  playerClass?: string | null
  classStats: ClassStat[]
  activityStats: ActivityStat[]
  handleStatEnter: (e: MouseEvent) => void
  handleStatLeave: (e: MouseEvent) => void
}>()
</script>

<template>
  <div class="profile-stats-extra">
    <!-- Class Custom Details -->
    <div
      v-if="playerClass"
      class="profile-section-card class-details-card"
    >
      <div class="section-label">
        ESPECIALIZACIÓN DE CLASE
      </div>
      <div class="stats-grid">
        <div
          v-for="stat in classStats"
          :key="stat.label"
          class="stat-item"
          @mouseenter="handleStatEnter"
          @mouseleave="handleStatLeave"
        >
          <span :class="['stat-val', stat.class]">{{ stat.value }}</span>
          <span class="stat-lbl">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <!-- Historial de Actividad -->
    <div class="profile-section-card activity-card">
      <div class="section-label">
        HISTORIAL DE ACTIVIDAD
      </div>
      <div class="stats-grid">
        <div
          v-for="stat in activityStats"
          :key="stat.label"
          class="stat-item"
          @mouseenter="handleStatEnter"
          @mouseleave="handleStatLeave"
        >
          <span :class="['stat-val', stat.class]">{{ stat.value }}</span>
          <span class="stat-lbl">{{ stat.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
