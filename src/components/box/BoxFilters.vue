<script setup lang="ts">
import { gsap } from 'gsap'
import { BOX_TIER_CONFIG } from '@/logic/pokemon/tierEngine'
import PVTooltip from '@/components/common/PVTooltip.vue'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import { POKEMON_TYPES } from '@/data/battle/types'

interface BoxFilters {
  tier: string
  type: string
  levelMin: number
  levelMax: number
  ivHP: number
  ivATK: number
  ivDEF: number
  ivSPA: number
  ivSPD: number
  ivSPE: number
  ivAny31: boolean
  ivMin: number
  ivMax: number
  ivTotalMin: number
  ivTotalMax: number
  bstMin: number
  bstMax: number
  search: string
  tags: string[]
}

interface Props {
  filters: BoxFilters
  isFiltersOpen: boolean
  sortMode: string
  sortDirection?: string
  hasActiveFilters: boolean
  resultsCount: number
}

const props = withDefaults(defineProps<Props>(), {
  sortDirection: 'desc'
})

const emit = defineEmits<{
  (e: 'update:isFiltersOpen', val: boolean): void
  (e: 'update:sortMode', val: string): void
  (e: 'update:sortDirection', val: string): void
  (e: 'update:filters', val: BoxFilters): void
  (e: 'reset'): void
}>()

const toggleFilters = () => {
  emit('update:isFiltersOpen', !props.isFiltersOpen)
}

const setSortMode = (val: string) => {
  if (props.sortMode === val) {
    emit('update:sortDirection', props.sortDirection === 'desc' ? 'asc' : 'desc')
  } else {
    emit('update:sortMode', val)
    emit('update:sortDirection', 'desc')
  }
}

const updateFilter = <K extends keyof BoxFilters>(key: K, val: BoxFilters[K]) => {
  emit('update:filters', { ...props.filters, [key]: val })
}

const toggleTag = (tag: string) => {
  const currentTags = [...(props.filters.tags || [])]
  const idx = currentTags.indexOf(tag)
  if (idx > -1) currentTags.splice(idx, 1)
  else currentTags.push(tag)
  updateFilter('tags', currentTags)
}

const onSearchInput = (e: Event) => {
  const val = (e.target as HTMLInputElement).value
  updateFilter('search', val)
}

const onRangeInput = (key: keyof BoxFilters, e: Event) => {
  const val = Number((e.target as HTMLInputElement).value)
  updateFilter(key, val as BoxFilters[keyof BoxFilters]) // domain-ok
}

// Colores de estadísticas estandarizados (Corregidos con Hexadecimales)
const STAT_COLORS: Record<string, string> = {
  HP: '#4ade80',
  ATK: '#f87171',
  DEF: '#60a5fa',
  SPA: '#c084fc',
  SPD: '#2dd4bf',
  SPE: '#fbbf24',
  LEVEL: '#a855f7',
  TOTAL: '#fbbf24'
}

const MAX_INDIVIDUAL_IV_STAT = 31
const MAX_POKEMON_BASE_STAT_TOTAL = 1000
const PERCENTAGE_SCALE_FACTOR = 100;

const getSliderStyle = (val: number, max: number, color: string) => {
  const percentage = (val / max) * PERCENTAGE_SCALE_FACTOR
  return {
    background: `Linear-Gradient(to right, ${color} 0%, ${color} ${percentage}%, Rgba(255,255,255,0.1) ${percentage}%, Rgba(255,255,255,0.1) 100%)`
  }
}

const PERFECT_IV_LABEL_TEXT = '31'

const AVAILABLE_TAGS = [
  { id: 'fav', label: 'FAV', icon: '⭐' },
  { id: 'breed', label: 'GEN', icon: '🧬' },
  { id: 'comp', label: 'COMP', icon: '🏆' },
  { id: 'trade', label: 'TRADE', icon: '🔄' },
  { id: 'iv31', label: 'IV', icon: PERFECT_IV_LABEL_TEXT },
  { id: 'shy', label: 'SHY', icon: '✨' },
  { id: 'team', label: 'TEAM', icon: '👥' },
  { id: 'hatched', label: 'CRÍA', icon: '🥚' }
]

const BOX_FILTERS_ENTER_DURATION_SEC = 0.35
const BOX_FILTERS_LEAVE_DURATION_SEC = 0.25

const beforeEnter = (el: Element) => {
  gsap.set(el, { 
    height: 0,
    opacity: 0,
    overflow: 'hidden'
  })
}

const enter = (el: Element, done: () => void) => {
  gsap.fromTo(el, 
    { height: 0, opacity: 0 },
    { 
      height: 'auto', 
      opacity: 1, 
      duration: BOX_FILTERS_ENTER_DURATION_SEC, 
      ease: 'power2.out',
      onComplete: () => {
        gsap.set(el, { clearProps: 'height,overflow' })
        done()
      }
    }
  )
}

const leave = (el: Element, done: () => void) => {
  gsap.to(el, { 
    height: 0, 
    opacity: 0, 
    duration: BOX_FILTERS_LEAVE_DURATION_SEC, 
    ease: 'power2.in',
    onComplete: done 
  })
}
</script>

<template>
  <div class="box-controls-wrapper">
    <div class="box-controls-compact">
      <!-- Renglón 1: Buscador + Filtros + Orden -->
      <div class="search-row-integrated">
        <div class="box-search-wrapper">
          <span class="box-search-icon">🔍</span>
          <input
            :value="filters.search"
            type="text"
            placeholder="Buscar..."
            class="box-search-input"
            @input="onSearchInput"
          >
          <button
            v-if="filters.search"
            class="box-search-clear"
            @click.stop="updateFilter('search', '')"
          >
            ×
          </button>
        </div>
        
        <PVTooltip
          title="CONFIGURACIÓN DE FILTROS"
          description="Abre el panel avanzado de búsqueda y tipos."
          position="bottom"
        >
          <button 
            class="filter-toggle-btn-premium"
            :class="{ active: isFiltersOpen }"
            @click.stop="toggleFilters"
          >
            <span class="box-icon-ref">⚙️</span>
            <span class="text">FILTROS</span>
          </button>
        </PVTooltip>

        <div class="sort-controls-integrated">
          <div class="sort-group-mini">
            <span class="mini-label">ORDEN:</span>
            <PVTooltip
              title="MÁS RECIENTES"
              description="Orden cronológico de captura."
              position="bottom"
            >
              <button
                :class="['mini-sort-btn', { active: sortMode === 'recent' }]"
                @click.stop="setSortMode('recent')"
              >
                REC {{ sortMode === 'recent' ? (sortDirection === 'desc' ? '▼' : '▲') : '' }}
              </button>
            </PVTooltip>
            <PVTooltip
              title="NIVEL"
              description="Orden por nivel de combate."
              position="bottom"
            >
              <button
                :class="['mini-sort-btn', { active: sortMode === 'level' }]"
                @click.stop="setSortMode('level')"
              >
                LVL {{ sortMode === 'level' ? (sortDirection === 'desc' ? '▼' : '▲') : '' }}
              </button>
            </PVTooltip>
            <PVTooltip
              title="IVs TOTALES"
              description="Potencial genético acumulado."
              position="bottom"
            >
              <button
                :class="['mini-sort-btn', { active: sortMode === 'tier' }]"
                @click.stop="setSortMode('tier')"
              >
                IVs {{ sortMode === 'tier' ? (sortDirection === 'desc' ? '▼' : '▲') : '' }}
              </button>
            </PVTooltip>
            <PVTooltip
              title="PODER TOTAL"
              description="Suma de estadísticas base, IVs genéticos y bonificación por EVs entrenados (4 EVs = 1 IV)."
              position="bottom"
            >
              <button
                :class="['mini-sort-btn', { active: sortMode === 'bst' }]"
                @click.stop="setSortMode('bst')"
              >
                TOTAL {{ sortMode === 'bst' ? (sortDirection === 'desc' ? '▼' : '▲') : '' }}
              </button>
            </PVTooltip>
            <PVTooltip
              title="NÚMERO POKÉDEX"
              description="Orden numérico oficial."
              position="bottom"
            >
              <button
                :class="['mini-sort-btn', { active: sortMode === 'pokedex' }]"
                @click.stop="setSortMode('pokedex')"
              >
                PDEX {{ sortMode === 'pokedex' ? (sortDirection === 'desc' ? '▼' : '▲') : '' }}
              </button>
            </PVTooltip>
            <PVTooltip
              title="PESO"
              description="Ordenar por peso en kilogramos."
              position="bottom"
            >
              <button
                :class="['mini-sort-btn', { active: sortMode === 'weight' }]"
                @click.stop="setSortMode('weight')"
              >
                PES {{ sortMode === 'weight' ? (sortDirection === 'desc' ? '▼' : '▲') : '' }}
              </button>
            </PVTooltip>
            <PVTooltip
              title="ALTURA"
              description="Ordenar por altura en metros."
              position="bottom"
            >
              <button
                :class="['mini-sort-btn', { active: sortMode === 'height' }]"
                @click.stop="setSortMode('height')"
              >
                ALT {{ sortMode === 'height' ? (sortDirection === 'desc' ? '▼' : '▲') : '' }}
              </button>
            </PVTooltip>
          </div>
        </div>
      </div>

      <!-- Renglón 2: Etiquetas -->
      <div class="tags-row-compact">
        <div class="tags-group-mini">
          <span class="mini-label">ETIQUETAS:</span>
          <div class="tags-scroll-container">
            <PVTooltip 
              v-for="tag in AVAILABLE_TAGS" 
              :key="tag.id"
              :title="tag.label"
              :description="(tag.id === 'fav' ? 'Pokémon marcados con estrella.' : 
                tag.id === 'breed' ? 'Marcado para breeding o crianza selectiva.' :
                tag.id === 'comp' ? 'Pokémon entrenados para torneos.' :
                tag.id === 'trade' ? 'Pokémon listos para intercambio.' :
                tag.id === 'iv31' ? 'Pokémon con estadísticas perfectas (31 IV).' :
                tag.id === 'shy' ? 'Pokémon Shiny con colores alternativos.' :
                tag.id === 'team' ? 'Pokémon asignados a tu equipo actual.' :
                tag.id === 'hatched' ? 'Pokémon nacidos de un huevo.' : '') || ''"
              position="bottom"
            >
              <button
                :class="['mini-tag-btn', { active: filters.tags.includes(tag.id) }]"
                @click.stop="toggleTag(tag.id)"
              >
                <span class="box-tag-icon-inner">{{ tag.icon }}</span>
                <span class="tag-text-small">{{ tag.label }}</span>
              </button>
            </PVTooltip>
          </div> <!-- end tags-scroll-container -->
        </div> <!-- end tags-group-mini -->
      </div> <!-- end tags-row-compact -->
    </div> <!-- end box-controls-compact -->

    <!-- Panel Extendido de Filtros (Optimizado Mixto) -->
    <Transition
      :css="false"
      @before-enter="beforeEnter"
      @enter="enter"
      @leave="leave"
    >
      <div
        v-if="isFiltersOpen"
        class="filters-expanded-premium"
      >
        <!-- Fila Superior: Tipos (Ancho Completo) -->
        <div class="compact-section full-width">
          <h4 class="box-section-label">
            TIPOS ELEMENTALES
          </h4>
          <div class="types-compact-grid">
            <button
              :class="['filter-pill', { active: filters.type === 'all' }]"
              @click.stop="updateFilter('type', 'all')"
            >
              TODOS
            </button>
            <PokemonTypeTag
              v-for="type in POKEMON_TYPES"
              :key="type"
              tag="button"
              :type="type"
              size="sm"
              :active="filters.type === type"
              @click.stop="updateFilter('type', type)"
            />
          </div>
        </div>
        
        <!-- Filtro por Tier -->
        <div class="compact-section full-width margin-top">
          <h4 class="box-section-label">
            FILTRAR POR TIER (POTENCIAL GENÉTICO)
          </h4>
          <div class="tiers-compact-grid">
            <button
              :class="['filter-pill', { active: filters.tier === 'all' }]"
              @click.stop="updateFilter('tier', 'all')"
            >
              TODOS
            </button>
            <button
              v-for="(cfg, tier) in BOX_TIER_CONFIG"
              :key="tier"
              :class="['filter-pill tier-pill', { active: filters.tier === tier }]"
              :style="{ 
                '--tier-color': (cfg as { color: string, bg: string }).color,
                '--tier-bg': (cfg as { color: string, bg: string }).bg
              }"
              @click.stop="updateFilter('tier', tier as string)"
            >
              {{ tier }}
            </button>
          </div>
        </div>

        <!-- Fila Inferior: Grid de 2 Columnas -->
        <div class="filters-grid-columns">
          <!-- Columna 1: Rangos -->
          <div class="filter-column">
            <div class="compact-section">
              <h4 class="box-section-label">
                RANGOS GENERALES
              </h4>
              <div class="premium-slider-group compact">
                <div class="slider-row-mini">
                  <span class="label">NV. MÍN</span>
                  <input
                    :value="filters.levelMin"
                    type="range"
                    min="1"
                    max="100"
                    :style="[getSliderStyle(filters.levelMin, 100, STAT_COLORS.LEVEL as string), { '--stat-color': STAT_COLORS.LEVEL }]"
                    @input="onRangeInput('levelMin', $event)"
                  >
                  <span class="val">{{ filters.levelMin }}</span>
                </div>
                <div class="slider-row-mini">
                  <span class="label">NV. MÁX</span>
                  <input
                    :value="filters.levelMax"
                    type="range"
                    min="1"
                    max="100"
                    :style="[getSliderStyle(filters.levelMax, 100, STAT_COLORS.LEVEL as string), { '--stat-color': STAT_COLORS.LEVEL }]"
                    @input="onRangeInput('levelMax', $event)"
                  >
                  <span class="val">{{ filters.levelMax }}</span>
                </div>
                <div class="slider-row-mini">
                  <span class="label">IV MÍN.</span>
                  <input
                    :value="filters.ivMin"
                    type="range"
                    min="0"
                    :max="MAX_INDIVIDUAL_IV_STAT"
                    :style="[getSliderStyle(filters.ivMin, MAX_INDIVIDUAL_IV_STAT, '#4ade80'), { '--stat-color': '#4ade80' }]"
                    @input="onRangeInput('ivMin', $event)"
                  >
                  <span class="val">{{ filters.ivMin }}</span>
                </div>
                <div class="slider-row-mini">
                  <span class="label">IV MÁX.</span>
                  <input
                    :value="filters.ivMax"
                    type="range"
                    min="0"
                    :max="MAX_INDIVIDUAL_IV_STAT"
                    :style="[getSliderStyle(filters.ivMax, MAX_INDIVIDUAL_IV_STAT, '#4ade80'), { '--stat-color': '#4ade80' }]"
                    @input="onRangeInput('ivMax', $event)"
                  >
                  <span class="val">{{ filters.ivMax }}</span>
                </div>
                <div class="slider-row-mini">
                  <span class="label">TOTAL MÍN.</span>
                  <input
                    :value="filters.bstMin"
                    type="range"
                    min="0"
                    :max="MAX_POKEMON_BASE_STAT_TOTAL"
                    step="10"
                    :style="[getSliderStyle(filters.bstMin, MAX_POKEMON_BASE_STAT_TOTAL, '#fbbf24'), { '--stat-color': '#fbbf24' }]"
                    @input="onRangeInput('bstMin', $event)"
                  >
                  <span class="val">{{ filters.bstMin }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Columna 2: IVs Stats -->
          <div class="filter-column">
            <div class="compact-section full-height">
              <h4 class="box-section-label">
                IVs STATS INDIVIDUALES
              </h4>
              <div class="iv-mini-grid">
                <div
                  v-for="stat in ['HP', 'ATK', 'DEF', 'SPA', 'SPD', 'SPE']"
                  :key="stat"
                  class="iv-slider-row-mini"
                >
                  <span class="stat-name">{{ stat }}</span>
                  <input
                    :value="filters[('iv' + stat) as keyof BoxFilters]"
                    type="range"
                    min="0"
                    :max="MAX_INDIVIDUAL_IV_STAT"
                    :style="[getSliderStyle(filters[('iv' + stat) as keyof BoxFilters] as number, MAX_INDIVIDUAL_IV_STAT, STAT_COLORS[stat] as string), { '--stat-color': STAT_COLORS[stat] }]"
                    @input="onRangeInput(('iv' + stat) as keyof BoxFilters, $event)"
                  >
                  <span
                    class="stat-val"
                    :style="{ color: STAT_COLORS[stat] }"
                  >{{ filters[('iv' + stat) as keyof BoxFilters] }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="filter-footer-compact">
          <div class="results-badge-mini">
            <span class="box-icon-ref">⚡</span> {{ resultsCount }} POKÉMON ENCONTRADOS
          </div>
          <button
            class="btn-vicio-danger btn-vicio-sm"
            @click.stop="emit('reset')"
          >
            ↺ REINICIAR TODO
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_box-filters.scss"></style>
