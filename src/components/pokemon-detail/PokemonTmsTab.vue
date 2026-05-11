<script setup lang="ts">
import { ref, computed } from 'vue'
import { PDEX_TYPE_COLORS } from '@/logic/pokedexConstants'
import { GAME_TMS, TM_COMPAT } from '@/data/pokedex'
import { useUIStore } from '@/stores/ui'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'

interface Props {
  speciesId: string
}

const props = defineProps<Props>()

const ui = useUIStore()

interface TM {
  id: string
  name: string
  type: string
}

const tmSearchQuery = ref('')
const tmSortBy = ref('id')

const tms = computed(() => {
  const compatData = TM_COMPAT as Record<string, string[]>
  const compatibleList = compatData[props.speciesId] || []

  const gameTms = GAME_TMS as TM[]
  const allTms = gameTms.map(tm => ({
    ...tm,
    isCompatible: compatibleList.includes(tm.id)
  }))

  let filtered = allTms
  if (tmSearchQuery.value) {
    const q = tmSearchQuery.value.toLowerCase()
    filtered = allTms.filter(tm =>
      tm.name.toLowerCase().includes(q) ||
      tm.id.toLowerCase().includes(q)
    )
  }

  return filtered.sort((a, b) => {
    if (tmSortBy.value === 'name') return a.name.localeCompare(b.name)
    return a.id.localeCompare(b.id, undefined, { numeric: true })
  })
})
</script>

<template>
  <div class="tab-pane tms-pane">
    <div class="tm-controls">
      <div class="search-box">
        <span class="icon">🔍</span>
        <input
          v-model="tmSearchQuery"
          type="text"
          placeholder="Buscar MT..."
          class="tm-search-input"
        >
      </div>
      <div class="sort-box">
        <button
          class="sort-btn"
          :class="{ active: tmSortBy === 'id' }"
          @click.stop="tmSortBy = 'id'"
        >
          ID
        </button>
        <button
          class="sort-btn"
          :class="{ active: tmSortBy === 'name' }"
          @click.stop="tmSortBy = 'name'"
        >
          ABC
        </button>
      </div>
    </div>

    <div class="tm-grid">
      <div
        v-for="tm in tms"
        :key="tm.id"
        class="tm-item clickable-item"
        :class="{ incompatible: !tm.isCompatible }"
        @click.stop="ui.openMoveDetail(tm.name)"
      >
        <div
          class="tm-id"
          :style="{ background: PDEX_TYPE_COLORS[tm.type.toLowerCase()] }"
        >
          {{ tm.id }}
        </div>
        <div class="tm-info">
          <span class="tm-name">{{ tm.name }}</span>
          <PokemonTypeTag
            :type="tm.type"
            size="sm"
          />
        </div>
        <div class="tm-check">
          {{ tm.isCompatible ? '✓' : '✕' }}
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@use "@/styles/components/pokedex-detail";
</style>
