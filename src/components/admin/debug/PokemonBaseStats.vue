<script setup>
defineProps({
  stats: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <div class="base-stats-grid">
    <div
      v-for="(val, stat) in stats"
      :key="stat"
      class="stat-item"
    >
      <label>{{ stat.toUpperCase() }}</label>
      <div class="stat-value">
        {{ val }}
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.base-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(255, 255, 255, 0.05);
    padding: 8px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);

    label {
      font-size: 8px;
      color: rgba(255, 255, 255, 0.4);
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 11px;
      font-weight: bold;
      color: var(--yellow);
    }
  }
}
</style>
