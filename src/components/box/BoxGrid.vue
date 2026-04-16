<script setup>
import BoxPokemonCard from './BoxPokemonCard.vue'

const props = defineProps({
  displayList: { type: Array, required: true },
  rocketSelection: { type: Array, default: () => [] },
  isRocketMode: { type: Boolean, default: false },
  isBoxEmpty: { type: Boolean, default: false }
})

const emit = defineEmits(['pokemonClick'])
</script>

<template>
  <div
    v-if="isBoxEmpty"
    class="empty-state"
  >
    <span class="empty-icon">📦</span>La PC está vacía.
  </div>
  <div
    v-else-if="displayList.length === 0"
    class="empty-state"
  >
    <span class="empty-icon">🔍</span>Ningún Pokémon coincide.
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
      @click="emit('pokemonClick', item.index)"
    />
  </div>
</template>

<style scoped>
.box-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 10px;
}

.empty-state {
  grid-column: 1 / -1;
  padding: 40px;
  text-align: center;
  font-size: 13px;
  color: var(--gray);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 20px;
  border: 1px dashed rgba(255, 255, 255, 0.05);
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
  opacity: 0.5;
}
</style>
