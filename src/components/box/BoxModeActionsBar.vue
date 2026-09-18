<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  isRocketMode?: boolean;
  selectedCount?: number;
  rocketSellValue?: number;
}>(), {
  isRocketMode: false,
  selectedCount: 0,
  rocketSellValue: 0
});

const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'confirm-rocket'): void;
  (e: 'confirm-release'): void;
}>();

const modeLabel = computed(() => {
  return props.isRocketMode ? 'PARA MERCADO NEGRO' : 'PARA LIBERAR';
});

const formattedSellValue = computed(() => {
  return props.rocketSellValue.toLocaleString();
});
</script>

<template>
  <div class="mode-actions-bar glass-morphism">
    <div class="selection-info">
      <span class="count">{{ selectedCount }}</span>
      <span class="label">{{ modeLabel }}</span>
      
      <div
        v-if="isRocketMode"
        class="earnings"
      >
        <span class="currency">₽</span>
        <span class="value">{{ formattedSellValue }}</span>
      </div>
    </div>

    <div class="action-buttons">
      <button
        id="box-view-cancel-mode-btn"
        class="btn-cancel"
        @click.stop="emit('cancel')"
      >
        CANCELAR
      </button>
      <button 
        v-if="isRocketMode"
        id="box-view-confirm-rocket-btn"
        class="btn-confirm-rocket" 
        :disabled="selectedCount === 0"
        @click.stop="emit('confirm-rocket')"
      >
        <span class="emoji">💀</span> VENDER LOTE
      </button>
      <button 
        v-else
        id="box-view-confirm-release-btn"
        class="btn-confirm-release" 
        :disabled="selectedCount === 0"
        @click.stop="emit('confirm-release')"
      >
        <span class="emoji">⚡</span> LIBERAR LOTE
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/views/box";
@use "@/styles/core/tools" as *;

.mode-actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-radius: 16px;
  margin: 0 12px 16px 12px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  background: Rgba(15, 23, 42, 0.8);
  box-shadow: 0 8px 32px Rgba(0, 0, 0, 0.4);

  .selection-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .count {
      font-size: 16px;
      color: var(--yellow);
      @include pixelated;
    }

    .label {
      font-size: 8px;
      color: Rgba(255, 255, 255, 0.6);
      @include pixelated;
    }

    .earnings {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: 12px;
      padding-left: 12px;
      border-left: 1px solid Rgba(255, 255, 255, 0.1);

      .currency { font-family: sans-serif; color: var(--green); }
      .value { color: var(--white); @include pixelated; font-size: 10px; }
    }
  }

  .action-buttons {
    display: flex;
    gap: 12px;

    .btn-cancel { @include btn-vicio('neutral', 'sm'); }
    .btn-confirm-rocket { @include btn-vicio('danger', 'sm'); }
    .btn-confirm-release { @include btn-vicio('success', 'sm'); }
  }
}
</style>
