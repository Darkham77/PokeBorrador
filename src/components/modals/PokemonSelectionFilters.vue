<script setup lang="ts">
// style-inherited: styles imported in parent PokemonSelectionModal.vue

import PVTooltip from '@/components/common/PVTooltip.vue'
import { POKEMON_TAGS, POKEMON_BADGES, type PokemonFilterTagId } from '@/logic/constants/tags'
import type { Pokemon } from '@/types/pokemon/pokemon'

interface Props {
  isDaycareContext?: boolean
  otherDaycarePokemon?: Pokemon | null
}

defineProps<Props>()

const searchQuery = defineModel<string>('searchQuery', { required: true })
const sortBy = defineModel<string>('sortBy', { required: true })
const sortOrder = defineModel<string>('sortOrder', { required: true })
const activeTags = defineModel<PokemonFilterTagId[]>('activeTags', { required: true })
const filterCompatibleOnly = defineModel<boolean>('filterCompatibleOnly', { required: true })

function toggleTagFilter(tagId: PokemonFilterTagId) {
  const idx = activeTags.value.indexOf(tagId)
  if (idx > -1) {
    activeTags.value.splice(idx, 1)
  } else {
    activeTags.value.push(tagId)
  }
}

function clearFilters() {
  searchQuery.value = ''
  sortBy.value = 'recent'
  sortOrder.value = 'desc'
  activeTags.value = []
  filterCompatibleOnly.value = false
}
</script>

<template>
  <div class="filters-bar">
    <div class="ps-search-row">
      <span class="emoji ps-search-icon">🔍</span>
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="Buscar por nombre o ID..."
        class="ps-search-input"
      >
      <button
        v-if="searchQuery"
        class="ps-clear-search"
        @click.stop="searchQuery = ''"
      >
        ×
      </button>
    </div>
    <PokemonSortBar
      v-model:model-value="sortBy"
      v-model:sort-direction="sortOrder"
    />

    <div class="ps-tags-section">
      <div class="ps-tags-row-unified">
        <PVTooltip
          title="LIMPIAR FILTROS"
          description="Resetear búsqueda, orden y etiquetas."
        >
          <button
            class="ps-clear-icon-btn"
            :class="{ disabled: !(activeTags.length > 0 || searchQuery || sortBy !== 'recent' || filterCompatibleOnly) }"
            :disabled="!(activeTags.length > 0 || searchQuery || sortBy !== 'recent' || filterCompatibleOnly)"
            @click.stop="clearFilters"
          >
            <span class="emoji">🧹</span>
          </button>
        </PVTooltip>

        <div class="ps-tags-list-horizontal">
          <PVTooltip 
            v-for="t in POKEMON_TAGS" 
            :key="t.id"
            :title="t.label" 
            :description="t.desc" 
            position="bottom"
          >
            <button
              :class="['ps-tag-' + t.id, { active: activeTags.includes(t.id) }]"
              @click.stop="toggleTagFilter(t.id)"
            >
              <span class="emoji">{{ t.icon }}</span>
              <span class="ps-tag-label">{{ t.shortLabel || t.label }}</span>
            </button>
          </PVTooltip>

          <PVTooltip
            title="LISTOS P/ EVOLUCIONAR"
            description="Mostrar Pokémon listos para evolucionar por amistad."
            position="bottom"
          >
            <button
              :class="['ps-tag-friendship-evo', { active: activeTags.includes('friendship-evo') }]"
              @click.stop="toggleTagFilter('friendship-evo')"
            >
              <span class="emoji">💎</span>
              <span class="ps-tag-label">EVO</span>
            </button>
          </PVTooltip>

          <PVTooltip
            title="VÍNCULO MÁXIMO"
            description="Mostrar Pokémon con amistad y vínculo al máximo (220+)."
            position="bottom"
          >
            <button
              :class="['ps-tag-friendship-max', { active: activeTags.includes('friendship-max') }]"
              @click.stop="toggleTagFilter('friendship-max')"
            >
              <span class="emoji">🎀</span>
              <span class="ps-tag-label">MAX</span>
            </button>
          </PVTooltip>
          
          <PVTooltip 
            v-if="POKEMON_BADGES.shiny"
            :title="POKEMON_BADGES.shiny.label" 
            :description="POKEMON_BADGES.shiny.desc" 
            position="bottom"
          >
            <button
              :class="['ps-tag-shiny', { active: activeTags.includes('shiny') }]"
              @click.stop="toggleTagFilter('shiny')"
            >
              <span class="emoji">{{ POKEMON_BADGES.shiny.icon }}</span>
              <span class="ps-tag-label">{{ POKEMON_BADGES.shiny.shortLabel }}</span>
            </button>
          </PVTooltip>

          <PVTooltip 
            v-if="isDaycareContext"
            :title="otherDaycarePokemon ? 'COMPATIBLES' : 'MODO COMPATIBLE'" 
            :description="otherDaycarePokemon ? `Mostrar solo Pokémon compatibles con ${otherDaycarePokemon.name}.` : 'Filtro compatible (elige una pareja en el otro slot para filtrar).'" 
            position="bottom"
          >
            <button
              :class="['ps-tag-compatible', { active: filterCompatibleOnly }]"
              @click.stop="filterCompatibleOnly = !filterCompatibleOnly"
            >
              <span class="emoji">❤️</span>
              <span class="ps-tag-label">COMPATIBLE</span>
            </button>
          </PVTooltip>
        </div>
      </div>
    </div>
  </div>
</template>

