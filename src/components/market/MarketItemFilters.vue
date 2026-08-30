<script setup lang="ts">
import SortControls from '@/components/common/SortControls.vue'
import type { SortOrder, ItemSortKey } from '@/types/system/game'

defineProps<{
  itemSearchQuery: string
  itemSortKey: ItemSortKey
  itemSortOrder: SortOrder
}>()

const emit = defineEmits<{
  (e: 'update:itemSearchQuery', val: string): void
  (e: 'update:itemSortKey', val: ItemSortKey): void
  (e: 'update:itemSortOrder', val: SortOrder): void
}>()
</script>

<template>
  <div class="market-publish-filters">
    <div class="ps-search-row">
      <span class="ps-search-icon">🔍</span>
      <input
        :value="itemSearchQuery"
        type="text"
        placeholder="Buscar por nombre..."
        class="ps-search-input"
        @input="emit('update:itemSearchQuery', ($event.target as HTMLInputElement).value)"
      >
      <button
        v-if="itemSearchQuery"
        class="ps-clear-search"
        @click.stop="emit('update:itemSearchQuery', '')"
      >
        ×
      </button>
    </div>
    <SortControls
      :model-value="itemSortKey"
      :sort-order="itemSortOrder"
      accent-color="var(--blue)"
      @update:model-value="emit('update:itemSortKey', $event)"
      @update:sort-order="emit('update:itemSortOrder', $event)"
    />
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_gts.scss"></style>

