// [PureVue-Ignore-Length]
<script setup>
import { BOX_TIER_CONFIG } from '@/logic/pokemon/tierEngine'
import PVTooltip from '@/components/common/PVTooltip.vue'

const props = defineProps({
  filters: { type: Object, required: true },
  isFiltersOpen: { type: Boolean, required: true },
  sortMode: { type: String, required: true },
  sortDirection: { type: String, default: 'desc' },
  hasActiveFilters: { type: Boolean, required: true },
  resultsCount: { type: Number, required: true }
})

const emit = defineEmits([
  'update:isFiltersOpen', 
  'update:sortMode', 
  'update:sortDirection', 
  'update:filters', 
  'reset'
])

const toggleFilters = () => emit('update:isFiltersOpen', !props.isFiltersOpen)
const setSortMode = (val) => emit('update:sortMode', val)
const toggleSortDirection = () => emit('update:sortDirection', props.sortDirection === 'desc' ? 'asc' : 'desc')

const updateFilter = (key, val) => {
  emit('update:filters', { ...props.filters, [key]: val })
}

const toggleTag = (tag) => {
  const currentTags = [...props.filters.tags]
  const idx = currentTags.indexOf(tag)
  if (idx > -1) currentTags.splice(idx, 1)
  else currentTags.push(tag)
  updateFilter('tags', currentTags)
}

// Colores de estadísticas estandarizados (Corregidos con Hexadecimales)
const STAT_COLORS = {
  HP: '#4ade80',
  ATK: '#f87171',
  DEF: '#60a5fa',
  SPA: '#c084fc',
  SPD: '#2dd4bf',
  SPE: '#fbbf24',
  LEVEL: '#a855f7',
  TOTAL: '#fbbf24'
}

const getSliderStyle = (val, max, color) => {
  const percentage = (val / max) * 100
  return {
    background: `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, Rgba(255,255,255,0.1) ${percentage}%, Rgba(255,255,255,0.1) 100%)`
  }
}

const POKEMON_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 
  'fighting', 'poison', 'ground', 'flying', 'psychic', 
  'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel'
]

const AVAILABLE_TAGS = [
  { id: 'fav', label: 'FAV', icon: '⭐' },
  { id: 'breed', label: 'CRIA', icon: '❤️' },
  { id: 'comp', label: 'COMP', icon: '🏆' },
  { id: 'caja', label: 'CAJA', icon: '📦' },
  { id: 'trade', label: 'TRADE', icon: '🔄' },
  { id: 'iv31', label: 'IV', icon: '31' },
  { id: 'shy', label: 'SHY', icon: '✨' },
  { id: 'team', label: 'TEAM', icon: '👥' }
]
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
            placeholder="Buscar por nombre o ID..."
            class="box-search-input"
            @input="updateFilter('search', $event.target.value)"
          >
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
                :class="['mini-sort-btn', { active: sortMode === 'none' }]"
                @click.stop="setSortMode('none')"
              >
                REC
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
                LVL
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
                IVs
              </button>
            </PVTooltip>
            <PVTooltip
              title="PODER TOTAL"
              description="Suma de estadísticas base e IVs individuales."
              position="bottom"
            >
              <button
                :class="['mini-sort-btn', { active: sortMode === 'bst' }]"
                @click.stop="setSortMode('bst')"
              >
                TOTAL
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
                PDEX
              </button>
            </PVTooltip>
          </div>
          
          <PVTooltip
            :title="sortDirection === 'desc' ? 'ORDEN DESCENDENTE' : 'ORDEN ASCENDENTE'"
            description="Haz clic para invertir el sentido del orden."
            position="bottom"
          >
            <button 
              class="direction-toggle-btn" 
              @click.stop="toggleSortDirection"
            >
              {{ sortDirection === 'desc' ? '▼' : '▲' }}
            </button>
          </PVTooltip>
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
              :description="tag.id === 'fav' ? 'Pokémon marcados con estrella.' : 
                tag.id === 'breed' ? 'Pokémon aptos para reproducirse.' :
                tag.id === 'comp' ? 'Pokémon entrenados para torneos.' :
                tag.id === 'caja' ? 'Pokémon que no están en el equipo.' :
                tag.id === 'trade' ? 'Pokémon listos para intercambio.' :
                tag.id === 'iv31' ? 'Pokémon con estadísticas perfectas (31 IV).' :
                tag.id === 'shy' ? 'Pokémon Shiny con colores alternativos.' :
                tag.id === 'team' ? 'Pokémon asignados a tu equipo actual.' : ''"
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
          </div>
        </div>
      </div>
    </div>

    <!-- Panel Extendido de Filtros (Optimizado Mixto) -->
    <Transition name="pixel-slide">
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
            <button
              v-for="type in POKEMON_TYPES"
              :key="type"
              :class="['filter-pill type-pill-btn', type, { active: filters.type === type }]"
              @click.stop="updateFilter('type', type)"
            >
              {{ type }}
            </button>
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
                '--tier-color': cfg.color,
                '--tier-bg': cfg.bg
              }"
              @click.stop="updateFilter('tier', tier)"
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
                    :style="[getSliderStyle(filters.levelMin, 100, STAT_COLORS.LEVEL), { '--stat-color': STAT_COLORS.LEVEL }]"
                    @input="updateFilter('levelMin', Number($event.target.value))"
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
                    :style="[getSliderStyle(filters.levelMax, 100, STAT_COLORS.LEVEL), { '--stat-color': STAT_COLORS.LEVEL }]"
                    @input="updateFilter('levelMax', Number($event.target.value))"
                  >
                  <span class="val">{{ filters.levelMax }}</span>
                </div>
                <div class="slider-row-mini">
                  <span class="label">IV MÍN.</span>
                  <input
                    :value="filters.ivMin"
                    type="range"
                    min="0"
                    max="31"
                    :style="[getSliderStyle(filters.ivMin, 31, '#4ade80'), { '--stat-color': '#4ade80' }]"
                    @input="updateFilter('ivMin', Number($event.target.value))"
                  >
                  <span class="val">{{ filters.ivMin }}</span>
                </div>
                <div class="slider-row-mini">
                  <span class="label">IV MÁX.</span>
                  <input
                    :value="filters.ivMax"
                    type="range"
                    min="0"
                    max="31"
                    :style="[getSliderStyle(filters.ivMax, 31, '#4ade80'), { '--stat-color': '#4ade80' }]"
                    @input="updateFilter('ivMax', Number($event.target.value))"
                  >
                  <span class="val">{{ filters.ivMax }}</span>
                </div>
                <div class="slider-row-mini">
                  <span class="label">TOTAL MÍN.</span>
                  <input
                    :value="filters.bstMin"
                    type="range"
                    min="0"
                    max="1000"
                    step="10"
                    :style="[getSliderStyle(filters.bstMin, 1000, '#fbbf24'), { '--stat-color': '#fbbf24' }]"
                    @input="updateFilter('bstMin', Number($event.target.value))"
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
                    :value="filters['iv' + stat]"
                    type="range"
                    min="0"
                    max="31"
                    :style="[getSliderStyle(filters['iv' + stat], 31, STAT_COLORS[stat]), { '--stat-color': STAT_COLORS[stat] }]"
                    @input="updateFilter('iv' + stat, Number($event.target.value))"
                  >
                  <span
                    class="stat-val"
                    :style="{ color: STAT_COLORS[stat] }"
                  >{{ filters['iv' + stat] }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="filter-footer-compact">
          <div class="results-badge-mini">
            <span class="box-icon-ref">🔍</span> {{ resultsCount }} POKÉMON ENCONTRADOS
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

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.filters-expanded-premium {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 12px;
}

.filters-grid-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.filter-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.compact-section {
  background: Rgba(0, 0, 0, 0.2);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 16px;
  
  &.full-width { grid-column: span 2; }
  
  @media (max-width: 900px) {
    &.full-width { grid-column: span 1; }
  }

  .box-section-label {
    @include pixelated;
    font-size: 7px;
    color: var(--gray);
    margin-bottom: 16px;
    opacity: 0.6;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 8px;

    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background: linear-gradient(to right, Rgba(255,255,255,0.05), transparent);
    }
  }
}

.iv-mini-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.slider-row-mini, .iv-slider-row-mini {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 2px 0;

  .label, .stat-name {
    @include pixelated;
    font-size: 7px;
    color: var(--gray);
    width: 70px;
    white-space: nowrap;
    opacity: 0.8;
  }

  input[type="range"] {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    -webkit-appearance: none;
    outline: none;

    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 12px;
      height: 12px;
      background: var(--stat-color, var(--yellow));
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 0 10px var(--stat-color);
      border: 1px solid Rgba(0, 0, 0, 0.4);
    }
  }

  .val, .stat-val {
    @include pixelated;
    font-size: 8px;
    min-width: 25px;
    text-align: right;
  }
}

.filter-footer-compact {
  margin-top: 12px;
  padding-top: 16px;
  border-top: 1px solid Rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.results-badge-mini {
  @include pixelated;
  font-size: 8px;
  color: var(--yellow);
  display: flex;
  align-items: center;
  gap: 8px;
  background: Rgba(255, 214, 10, 0.05);
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid Rgba(255, 214, 10, 0.1);
}
</style>
