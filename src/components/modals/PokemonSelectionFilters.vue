<script setup lang="ts">

import PVTooltip from '@/components/common/PVTooltip.vue'
import { POKEMON_TAGS, POKEMON_BADGES } from '@/logic/constants/tags'
import type { Pokemon } from '@/types/pokemon/pokemon'

interface Props {
  isDaycareContext?: boolean
  otherDaycarePokemon?: Pokemon | null
}

defineProps<Props>()

const searchQuery = defineModel<string>('searchQuery', { required: true })
const sortBy = defineModel<string>('sortBy', { required: true })
const sortOrder = defineModel<string>('sortOrder', { required: true })
const activeTags = defineModel<string[]>('activeTags', { required: true })
const filterCompatibleOnly = defineModel<boolean>('filterCompatibleOnly', { required: true })

function setSort(type: string) {
  if (sortBy.value === type) {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortBy.value = type
    sortOrder.value = 'desc'
  }
}

function toggleTagFilter(tagId: string) {
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
      <span class="ps-search-icon">🔍</span>
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
        ✕
      </button>
    </div>
    <div class="ps-sort-btns">
      <PVTooltip
        title="MÁS RECIENTES"
        description="Orden cronológico de captura."
        position="bottom"
        class="ps-sort-wrapper"
      >
        <button
          :class="{ active: sortBy === 'recent' }"
          @click.stop="setSort('recent')"
        >
          REC {{ sortBy === 'recent' ? (sortOrder === 'desc' ? '▼' : '▲') : '' }}
        </button>
      </PVTooltip>
      <PVTooltip
        title="NIVEL"
        description="Orden por nivel de combate."
        position="bottom"
        class="ps-sort-wrapper"
      >
        <button
          :class="{ active: sortBy === 'level' }"
          @click.stop="setSort('level')"
        >
          LVL {{ sortBy === 'level' ? (sortOrder === 'desc' ? '▼' : '▲') : '' }}
        </button>
      </PVTooltip>
      <PVTooltip
        title="IVs"
        description="Potencial genético total."
        position="bottom"
        class="ps-sort-wrapper"
      >
        <button
          :class="{ active: sortBy === 'ivs' }"
          @click.stop="setSort('ivs')"
        >
          IVs {{ sortBy === 'ivs' ? (sortOrder === 'desc' ? '▼' : '▲') : '' }}
        </button>
      </PVTooltip>
      <PVTooltip
        title="PODER TOTAL"
        description="Suma de estadísticas base e IVs individuales."
        position="bottom"
        class="ps-sort-wrapper"
      >
        <button
          :class="{ active: sortBy === 'TOT' }"
          @click.stop="setSort('TOT')"
        >
          TOTAL {{ sortBy === 'TOT' ? (sortOrder === 'desc' ? '▼' : '▲') : '' }}
        </button>
      </PVTooltip>
      <PVTooltip
        title="CRÍA"
        description="Ordenar por Pokémon nacidos de huevo."
        position="bottom"
        class="ps-sort-wrapper"
      >
        <button
          :class="{ active: sortBy === 'hatched' }"
          @click.stop="setSort('hatched')"
        >
          CRÍA {{ sortBy === 'hatched' ? (sortOrder === 'desc' ? '▼' : '▲') : '' }}
        </button>
      </PVTooltip>
    </div>

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
            🧹
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
              <span class="icon">{{ t.icon }}</span>
              <span class="ps-tag-label">{{ t.shortLabel || t.label }}</span>
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
              <span class="icon">{{ POKEMON_BADGES.shiny.icon }}</span>
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
              <span class="icon">❤️</span>
              <span class="ps-tag-label">COMPATIBLE</span>
            </button>
          </PVTooltip>
        </div>
      </div>
    </div>
  </div>
</template>
