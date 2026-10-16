<script setup lang="ts">
import { computed } from 'vue';
import { MAX_POKEMON_BOX_PAGES_LIMIT } from '@/logic/constants/gameplay';

const props = withDefaults(
  defineProps<{
    boxCount?: number;
    currentIndex: number;
    buyCost: number;
  }>(),
  {
    boxCount: 4
  }
);

const emit = defineEmits<{
  (e: 'switch', index: number): void;
  (e: 'buy'): void;
}>();

const canBuyMoreBoxes = computed(() => (props.boxCount ?? 0) < MAX_POKEMON_BOX_PAGES_LIMIT);
</script>

<template>
  <div class="box-tabs glass-morphism">
    <div class="tabs-list">
      <button
        v-for="i in props.boxCount"
        id="box-tabs-btn-caja-i"
        :key="i"
        :class="{ active: currentIndex === i - 1 }"
        class="box-tab-btn"
        @click.stop="emit('switch', i - 1)"
      >
        CAJA {{ i }}
      </button>

      <button
        v-if="canBuyMoreBoxes"
        id="box-tabs-btn-1"
        class="box-buy-new-btn"
        @click.stop="emit('buy')"
      >
        <span class="btn-text">+ ADQUIRIR</span>
        <span class="btn-price"
          >(<span class="currency-symbol">₱</span>{{ buyCost.toLocaleString() }})</span
        >
      </button>
    </div>

    <div class="tabs-extra-actions">
      <slot name="extra" />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/core/tools' as *;

.box-tabs {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-lg;
  padding: 8px 16px;

  .tabs-list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $spacing-sm;
    min-width: 0;
    flex: 1 1 auto;
  }

  .tabs-extra-actions {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    flex-shrink: 0;

    @media (width <= 768px) {
      justify-content: flex-end;
      width: 100%;
      margin-top: 4px;
      padding-top: 8px;
      border-top: 1px solid Rgb(255 255 255 / 5%);
    }
  }

  @media (width <= 1100px) {
    padding: 12px;
  }
}

.box-buy-new-btn {
  @include btn-vicio('primary', 'sm', false);

  height: 32px;
  padding: 0 12px;
  border-radius: $radius-lg;
  font-size: var(--font-7);
  margin-left: 8px;
  flex-shrink: 0;

  .btn-price {
    opacity: 0.8;
    margin-left: 4px;
  }

  @media (width <= 900px) {
    padding: 0 8px;
    margin-left: 4px;
    .btn-price {
      display: none;
    }
  }

  .currency-symbol {
    font-family: sans-serif;
    font-size: var(--font-11);
    vertical-align: baseline;
    margin-left: 2px;
  }
}
</style>
