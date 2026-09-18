<script setup lang="ts">
const SELECTION_SORT_OPTIONS = [
  { id: 'rec', label: 'REC ▾', icon: '🔘' },
  { id: 'lvl', label: 'LVL', icon: '⭐' },
  { id: 'ivs', label: 'IVS', icon: '⚡' },
  { id: 'tot', label: 'TOT ▾', icon: '💪' },
  { id: 'dex', label: 'DEX', icon: '■' },
  { id: 'cri', label: 'CRI', icon: '🥚' },
  { id: 'pes', label: 'PES', icon: '⚖️' },
  { id: 'alt', label: 'ALT', icon: '📏' },
  { id: 'ami', label: 'AMI', icon: '❤️' }
] as const

const SELECTION_FILTER_TAGS = [
  { id: 'clear', label: '', icon: '🖌' },
  { id: 'fav', label: 'FAV', icon: '⭐' },
  { id: 'gen', label: 'GEN', icon: '🧬' },
  { id: 'cmp', label: 'CMP', icon: '🏆' },
  { id: 'trd', label: 'TRD', icon: '🗃' },
  { id: 'iv31', label: '31 IV', icon: '' },
  { id: 'shy', label: 'SHY', icon: '✨' },
  { id: 'tem', label: 'TEM', icon: '👥' },
  { id: 'cri', label: 'CRI', icon: '🥚' },
  { id: 'evo', label: 'EVO', icon: '💎' },
  { id: 'max', label: 'MAX', icon: '👑' }
] as const

type SelectionSortId = (typeof SELECTION_SORT_OPTIONS)[number]['id']
type SelectionFilterTagId = (typeof SELECTION_FILTER_TAGS)[number]['id']

const props = withDefaults(defineProps<{
  searchQuery: string
  activeSort: SelectionSortId
  activeTag: SelectionFilterTagId | null
  isFloating?: boolean
}>(), {
  isFloating: false
})

const emit = defineEmits<{
  (e: 'update:searchQuery', val: string): void
  (e: 'update:activeSort', val: SelectionSortId): void
  (e: 'update:activeTag', val: SelectionFilterTagId | null): void
  (e: 'clear'): void
}>()

const onClearFilters = () => {
  emit('update:activeTag', null)
  emit('update:searchQuery', '')
  emit('clear')
}

const onTagClick = (tagId: SelectionFilterTagId) => {
  const nextVal = props.activeTag === tagId ? null : tagId
  emit('update:activeTag', nextVal)
}
</script>

<template>
  <div class="filters-bar">
    <!-- BÚSQUEDA -->
    <div class="ps-search-row">
      <span class="emoji ps-search-icon">🔍</span>
      <input
        :id="(props.isFloating ? 'modal-' : '') + 'input-selection-search'"
        :value="searchQuery"
        type="text"
        class="pv-curve-xs ps-search-input"
        placeholder="Buscar por nombre o ID..."
        @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
      >
      <button
        v-if="searchQuery"
        type="button"
        class="ps-clear-search"
        @click.stop="emit('update:searchQuery', '')"
      >
        ×
      </button>
    </div>

    <!-- ORDENAMIENTOS -->
    <div class="ps-sort-btns">
      <div
        v-for="s in SELECTION_SORT_OPTIONS"
        :key="s.id"
        class="ps-sort-wrapper"
      >
        <button
          type="button"
          class="pv-curve-xs sort-pill-btn"
          :class="{ active: activeSort === s.id }"
          @click="emit('update:activeSort', s.id)"
        >
          <span class="emoji">{{ s.icon }}</span>
          <span class="label">{{ s.label }}</span>
        </button>
      </div>
    </div>

    <!-- TAGS SECUNDARIOS -->
    <div class="ps-tags-section">
      <div class="pv-curve-xs ps-tags-row-unified">
        <button
          id="ps-clear-filters-btn"
          type="button"
          class="pv-curve-xs ps-clear-icon-btn"
          title="Limpiar filtros"
          @click="onClearFilters"
        >
          <span class="emoji">🧹</span>
        </button>

        <div class="ps-tags-list-horizontal">
          <button
            v-for="tg in SELECTION_FILTER_TAGS.filter(t => t.id !== 'clear')"
            :key="tg.id"
            type="button"
            class="pv-curve-xs tag-pill-btn"
            :class="{ active: activeTag === tg.id }"
            @click="onTagClick(tg.id)"
          >
            <span
              v-if="tg.icon"
              class="emoji tag-icon"
            >{{ tg.icon }}</span>
            <span class="tag-text">{{ tg.label }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
