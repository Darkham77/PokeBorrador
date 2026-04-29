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
        + ADQUIRIR(<span class="currency-symbol">₱</span>{{ buyCost.toLocaleString() }})
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
  gap: 12px;
  overflow-x: auto;
  
  .tabs-list {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .tabs-extra-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: auto;
  }
}
</style>
