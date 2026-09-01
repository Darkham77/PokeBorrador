<script setup lang="ts">

import type { Pokemon } from '@/types/pokemon/pokemon'
import BoxPokemonCard from './BoxPokemonCard.vue'

interface BoxItem {
  p: Pokemon
  index: number
}

interface Props {
  displayList: BoxItem[]
  selection?: number[]
  selectionType?: string | null
  isBoxEmpty?: boolean
  hasActiveFilters?: boolean
  isPerformanceMode?: boolean
}

withDefaults(defineProps<Props>(), {
  selection: () => [],
  selectionType: null,
  isBoxEmpty: false,
  hasActiveFilters: false,
  isPerformanceMode: false
})

const emit = defineEmits<{
  (e: 'pokemonClick', index: number): void
}>()
</script>

<template>
  <div
    v-if="isBoxEmpty"
    class="empty-state glass-morphism"
  >
    <span class="emoji empty-icon">📦</span>
    <p>SISTEMA DE ALMACENAMIENTO VACÍO</p>
  </div>
  <div
    v-else-if="displayList.length === 0"
    class="empty-state glass-morphism"
  >
    <span class="emoji empty-icon">🔍</span>
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
      :is-selected="selection.includes(item.index)"
      :selection-type="selectionType"
      :is-performance-mode="isPerformanceMode"
      data-ignore="[PureVue-Ignore]"
      @click.stop="(_, idx) => emit('pokemonClick', idx ?? item.index)"
    />
  </div>
</template>

<style scoped lang="scss">
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
    will-change: transform, filter, opacity;
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
