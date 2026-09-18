<script setup lang="ts">
import HomeWidgetRefreshBtn from '@/components/home/HomeWidgetRefreshBtn.vue';

interface Props {
  hideRefresh?: boolean;
  refreshCount: number;
}

const props = withDefaults(defineProps<Props>(), {
  hideRefresh: false
});

const emit = defineEmits<{
  refresh: [];
}>();
</script>

<template>
  <header class="missions-header">
    <div class="title-wrap">
      <h3>Misiones Diarias</h3>
    </div>
    <div
      v-if="!props.hideRefresh"
      class="missions-header-actions"
    >
      <span
        class="refresh-count"
        title="Refrescos disponibles"
      >
        <span class="refresh-label">Refrescos: </span>{{ props.refreshCount }}/3
      </span>
      <HomeWidgetRefreshBtn 
        id="missions-refresh-btn"
        :disabled="props.refreshCount <= 0"
        @click.stop="emit('refresh')"
      />
    </div>
  </header>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.missions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  min-width: 0;

  .title-wrap {
    min-width: 0;
  }

  h3 { 
    font-weight: 800; 
    @include pixelated; 
    font-size: 10px; 
    color: var(--yellow, #facc15); 
    margin: 0; 
    word-break: break-word; 
  }

  .missions-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    .refresh-count { 
      font-size: 10px; 
      color: var(--gray, #94a3b8); 
      @include pixelated;
      background: Rgba(255, 255, 255, 0.05);
      border: 1px solid Rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 3px 8px;
      white-space: nowrap;

      .refresh-label {
        @media (max-width: 640px) {
          display: none;
        }
      }
    }
  }
}
</style>
