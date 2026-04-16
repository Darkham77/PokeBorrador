<script setup>
const props = defineProps({
  boxCount: { type: Number, default: 4 },
  currentIndex: { type: Number, required: true },
  buyCost: { type: Number, required: true }
})

const emit = defineEmits(['switch', 'buy'])
</script>

<template>
  <div class="box-tabs-container">
    <button
      v-for="i in props.boxCount"
      :key="i"
      :class="{ active: currentIndex === (i - 1) }"
      class="tab-btn"
      @click="emit('switch', i - 1)"
    >
      CAJA {{ i }}
    </button>
    <button
      v-if="props.boxCount < 10"
      :title="'Comprar nueva caja (₱' + buyCost.toLocaleString() + ')'"
      class="add-btn"
      @click="emit('buy')"
    >
      +
    </button>
  </div>
</template>

<style scoped>
.box-tabs-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
  align-items: center;
}

.tab-btn {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: var(--gray);
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  border: 1px solid var(--purple);
  background: rgba(199, 125, 255, 0.2);
  color: var(--purple-light);
}

.add-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid var(--green);
  background: rgba(107, 203, 119, 0.1);
  color: var(--green);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
}
</style>
