<script setup lang="ts">
import { computed } from 'vue'
import SortControls from '@/components/common/SortControls.vue'
import type { SortOrder, ItemSortKey } from '@/types/system/game'

type SortKey = ItemSortKey

interface Props {
  search: string
  sortKey: SortKey
  sortOrder: SortOrder
  placeholder?: string
  accentColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Buscar objeto por nombre...',
  accentColor: ''
})

const emit = defineEmits<{
  (e: 'update:search', val: string): void
  (e: 'update:sortKey', val: SortKey): void
  (e: 'update:sortOrder', val: SortOrder): void
}>()

const localSearch = computed({
  get: () => props.search,
  set: (val) => emit('update:search', val)
})

const localSortKey = computed({
  get: () => props.sortKey,
  set: (val) => emit('update:sortKey', val)
})

const localSortOrder = computed({
  get: () => props.sortOrder,
  set: (val) => emit('update:sortOrder', val)
})
</script>

<template>
  <div class="shop-search-wrapper">
    <div class="search-input-container">
      <span class="search-icon">🔍</span>
      <input
        v-model="localSearch"
        type="text"
        :placeholder="placeholder"
        class="shop-search-bar"
      >
      <button
        v-if="localSearch"
        class="clear-btn"
        @click.stop="localSearch = ''"
      >
        ×
      </button>
    </div>
    <SortControls
      v-model="localSortKey"
      v-model:sort-order="localSortOrder"
      :accent-color="accentColor"
    >
      <template
        v-for="(_, slotName) in $slots"
        #[slotName]="slotProps"
      >
        <slot
          :name="slotName"
          v-bind="slotProps ?? {}"
        />
      </template>
    </SortControls>
  </div>
</template>
