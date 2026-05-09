<script setup>
const props = defineProps({
  boxCount: { type: Number, default: 4 },
  currentIndex: { type: Number, required: true },
  buyCost: { type: Number, required: true }
})

const emit = defineEmits(['switch', 'buy'])
</script>

<template>
  <div class="box-tabs glass-morphism">
    <div class="tabs-list">
      <button
        v-for="i in props.boxCount"
        :key="i"
        :class="{ active: currentIndex === (i - 1) }"
        class="box-tab-btn"
        @click.stop="emit('switch', i - 1)"
      >
        CAJA {{ i }}
      </button>
      
      <button
        v-if="props.boxCount < 10"
        class="box-buy-new-btn"
        @click.stop="emit('buy')"
      >
        <span class="btn-text">+ ADQUIRIR</span>
        <span class="btn-price">(<span class="currency-symbol">₱</span>{{ buyCost.toLocaleString() }})</span>
      </button>
    </div>

    <div class="tabs-extra-actions">
      <slot name="extra" />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.box-tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  gap: 16px;
  flex-wrap: wrap;
  
  .tabs-list {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    flex: 1 1 auto;
    min-width: 0;
  }

  .tabs-extra-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
    
    @media (max-width: 768px) {
      width: 100%;
      justify-content: flex-end;
      margin-top: 4px;
      padding-top: 8px;
      border-top: 1px solid Rgba(255, 255, 255, 0.05);
    }
  }

  @media (max-width: 1100px) {
    padding: 12px;
  }
}

.box-buy-new-btn {
  @include btn-Vicio('warning', 'sm', false);
  margin-left: 8px;
  height: 32px;
  font-size: 7px;
  border-radius: 8px;
  padding: 0 12px;
  flex-shrink: 0;

  .btn-price {
    margin-left: 4px;
    opacity: 0.8;
  }

  @media (max-width: 900px) {
    .btn-price { display: none; }
    padding: 0 8px;
    margin-left: 4px;
  }

  .currency-symbol {
    font-family: sans-serif;
    font-size: 11px;
    vertical-align: baseline;
    margin-left: 2px;
  }
}
</style>
