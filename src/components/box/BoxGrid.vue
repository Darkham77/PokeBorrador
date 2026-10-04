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
  isFastMode?: boolean
}

withDefaults(defineProps<Props>(), {
  selection: () => [],
  selectionType: null,
  isBoxEmpty: false,
  hasActiveFilters: false,
  isFastMode: false
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
      :is-fast-mode="isFastMode"
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
  border: 2px dashed Rgb(255 255 255 / 5%);
  border-radius: 32px;
  text-align: center;
  
  .empty-icon {
    font-size: 40px;
    opacity: 0.3;
    margin-bottom: 20px;
    will-change: transform, filter, opacity;
  filter: Grayscale(1);
  }

  p {
    @include pixelated;

    color: var(--gray);
    font-size: 8px;
    letter-spacing: 2px;
  }
}
</style>
