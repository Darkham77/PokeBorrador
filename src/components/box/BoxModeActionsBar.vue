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
  justify-content: space-between;
  align-items: center;
  margin: 0 12px 16px;
  padding: 12px 20px;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 16px;
  background: rgb(15 23 42 / 80%);
  box-shadow: 0 8px 32px rgb(0 0 0 / 40%);

  .selection-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .count {
      @include pixelated;

      color: var(--yellow);
      font-size: 16px;
    }

    .label {
      @include pixelated;

      color: rgb(255 255 255 / 60%);
      font-size: 8px;
    }

    .earnings {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: 12px;
      padding-left: 12px;
      border-left: 1px solid rgb(255 255 255 / 10%);

      .currency { color: var(--green); font-family: sans-serif; }
      .value { @include pixelated; color: var(--white); font-size: 10px; }
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
