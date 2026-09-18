<script setup lang="ts">
/**
 * src/components/events/MissionCardActiveOperation.vue
 * 
 * Subcomponent rendering the active deployment progress, countdown, and assigned Pokémon.
 */

defineProps<{
  isActiveMission?: boolean;
  isCompleted?: boolean;
  remainingTimeText?: string;
  progressPercent?: number;
  activePokemonInfo?: string;
  activeGuaranteedReward?: string;
  hasRewardsList?: boolean;
}>();
</script>

<template>
  <!-- Active Operation Summary & Single Countdown Box -->
  <div
    v-if="isActiveMission"
    class="active-operation-box mission-active-progress"
    :class="{ 'is-done': isCompleted }"
  >
    <div class="operation-header-row">
      <span class="operation-status-title">
        {{ isCompleted ? '¡OPERACIÓN COMPLETADA!' : 'OPERACIÓN EN CURSO' }}
      </span>
      <span class="operation-timer-text">
        {{ remainingTimeText }}
      </span>
    </div>

    <!-- In-card active deployment progress bar -->
    <div class="operation-progress-track">
      <div
        class="operation-progress-fill"
        :style="{ width: Math.min(100, Math.max(0, progressPercent || 0)) + '%' }"
      />
    </div>

    <div
      v-if="activePokemonInfo"
      class="operation-detail-row"
    >
      <span class="detail-label">ASIGNADO:</span>
      <span class="detail-val">{{ activePokemonInfo }}</span>
    </div>

    <div
      v-if="activeGuaranteedReward && !hasRewardsList"
      class="operation-detail-row"
    >
      <span class="detail-label">BOTÍN FIJADO:</span>
      <span class="detail-val is-reward">{{ activeGuaranteedReward }}</span>
    </div>
  </div>
</template>

<style scoped src="./MissionCard.styles.scss" lang="scss"></style>
