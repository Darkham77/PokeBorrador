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
    >+ ADQUIRIR(<span class="currency-symbol">₱</span>{{ buyCost.toLocaleString() }})</button>
  </div>
</template>

<style scoped lang="scss">
// Estilos globales desde _box.scss
</style>

