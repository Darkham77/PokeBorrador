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
  min-width: 0;
  margin-bottom: 20px;

  .title-wrap {
    min-width: 0;
  }

  h3 { 
    @include pixelated; 

    margin: 0; 
    color: var(--yellow, #facc15); 
    font-size: 10px; 
    font-weight: 800; 
    overflow-wrap: break-word; 
  }

  .missions-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    .refresh-count { 
      @include pixelated;

      padding: 3px 8px;
      border: 1px solid rgb(255 255 255 / 8%);
      border-radius: 6px;
      background: rgb(255 255 255 / 5%); 
      color: var(--gray, #94a3b8); 
      font-size: 10px;
      white-space: nowrap;

      .refresh-label {
        @media (width <= 640px) {
          display: none;
        }
      }
    }
  }
}
</style>
