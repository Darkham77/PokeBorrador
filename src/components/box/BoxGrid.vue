<script setup>
import BoxPokemonCard from './BoxPokemonCard.vue'

defineProps({
  displayList: { type: Array, required: true },
  rocketSelection: { type: Array, default: () => [] },
  isRocketMode: { type: Boolean, default: false },
  isBoxEmpty: { type: Boolean, default: false },
  hasActiveFilters: { type: Boolean, default: false }
})

const emit = defineEmits(['pokemonClick'])
</script>

<template>
  <div
    v-if="isBoxEmpty"
    class="empty-state glass-morphism"
  >
    <span class="empty-icon">📦</span>
    <p>SISTEMA DE ALMACENAMIENTO VACÍO</p>
  </div>
  <div
    v-else-if="displayList.length === 0"
    class="empty-state glass-morphism"
  >
    <span class="empty-icon">🔍</span>
    <p>{{ hasActiveFilters ? 'SIN COINCIDENCIAS EN LA RED' : 'ESTA CAJA ESTÁ VACÍA' }}</p>
  </div>
  <div
    v-else
    class="box-grid"
  >
    <BoxPokemonCard
      v-for="item in displayList"
      :key="item.index"
      :pokemon="item.p"
      :index="item.index"
      :is-selected="rocketSelection.includes(item.index)"
      :is-rocket-mode="isRocketMode"
      @click="emit('pokemonClick', item.index)" data-ignore="[PureVue-Ignore]"
    />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/views/box";
@use "@/styles/core/tools" as *;

.empty-state {
  @include flex-center;
  flex-direction: column;
  padding: 60px 40px;
  text-align: center;
  border: 2px dashed Rgba(255, 255, 255, 0.05);
  border-radius: 32px;
  
  .empty-icon {
    font-size: 40px;
    margin-bottom: 20px;
    filter: Grayscale(1);
    opacity: 0.3;
  }

  p {
    @include pixelated;
    font-size: 8px;
    color: var(--gray);
    letter-spacing: 2px;
  }
}
</style>
