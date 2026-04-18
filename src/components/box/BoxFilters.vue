<script setup>
import { BOX_TIER_CONFIG } from '@/logic/pokemon/tierEngine'
const props = defineProps({
  filters: { type: Object, required: true },
  isFiltersOpen: { type: Boolean, required: true },
  sortMode: { type: String, required: true },
  hasActiveFilters: { type: Boolean, required: true },
  resultsCount: { type: Number, required: true }
})

const emit = defineEmits(['update:isFiltersOpen', 'update:sortMode', 'update:filters', 'reset'])

const toggleFilters = () => emit('update:isFiltersOpen', !props.isFiltersOpen)
const setSortMode = (val) => emit('update:sortMode', val)
</script>

<template>
  <div class="box-filter-panel">
    <div
      class="filter-header"
      @click="toggleFilters"
    >
      <span class="filter-title">🔍 FILTROS</span>
      <div class="filter-info">
        <span
          v-if="hasActiveFilters"
          class="results-count"
        >{{ resultsCount }} resultados</span>
        <span
          :class="{ rotated: isFiltersOpen }"
          class="arrow"
        >▼</span>
      </div>
    </div>

    <!-- Buscador -->
    <div class="search-container">
      <input
        :value="filters.search"
        type="text"
        placeholder="Buscar por nombre..."
        class="search-input"
        @input="emit('update:filters', { ...filters, search: $event.target.value })"
      >
    </div>

    <!-- Cuerpo de Filtros -->
    <div
      v-show="isFiltersOpen"
      class="filter-body"
    >
      <!-- Ordenar -->
      <div class="filter-group">
        <div class="group-label">
          Ordenar por
        </div>
        <div class="button-row">
          <button
            :class="['box-filter-btn', { active: sortMode === 'none' }]"
            @click="setSortMode('none')"
          >
            Captura
          </button>
          <button
            :class="['box-filter-btn btn-blue', { active: sortMode === 'level' }]"
            @click="setSortMode('level')"
          >
            Nivel
          </button>
          <button
            :class="['box-filter-btn btn-gold', { active: sortMode === 'tier' }]"
            @click="setSortMode('tier')"
          >
            Tier
          </button>
          <button
            :class="['box-filter-btn btn-green', { active: sortMode === 'type' }]"
            @click="setSortMode('type')"
          >
            Tipo
          </button>
        </div>
      </div>

      <!-- Tiers -->
      <div class="filter-group">
        <div class="group-label">
          Filtrar por Tier
        </div>
        <div class="button-row">
          <button
            :class="['box-filter-btn', { active: filters.tier === 'all' }]"
            @click="emit('update:filters', { ...filters, tier: 'all' })"
          >
            Todos
          </button>
          <button
            v-for="(cfg, tierKey) in BOX_TIER_CONFIG"
            :key="tierKey"
            :class="['box-filter-btn', { active: filters.tier === tierKey }]"
            :style="{ color: cfg.color, background: filters.tier === tierKey ? cfg.bg : 'rgba(255,255,255,0.1)', borderColor: cfg.color + '44' }"
            @click="emit('update:filters', { ...filters, tier: tierKey })"
          >
            {{ tierKey }}
          </button>
        </div>
      </div>

      <!-- Tipos (Simplificado para el template) -->
      <div class="filter-group">
        <div class="group-label">
          Tipo
        </div>
        <div class="button-row large-gap">
          <button
            :class="['box-filter-btn', { active: filters.type === 'all' }]"
            @click="emit('update:filters', { ...filters, type: 'all' })"
          >
            Todos
          </button>
          <!-- Se podrían agregar más tipos aquí o hacer un loop si se tiene la data -->
        </div>
      </div>

      <!-- Totales + Especial -->
      <div class="filter-split">
        <div class="split-side">
          <div class="group-label">
            IV Totales (Rango)
          </div>
          <div class="range-row">
            <input
              :value="filters.ivTotalMin"
              type="range"
              min="0"
              max="186"
              class="custom-range range-yellow"
              @input="emit('update:filters', { ...filters, ivTotalMin: Number($event.target.value) })"
            >
            <span class="range-val">{{ filters.ivTotalMin }}</span>
          </div>
          <div class="range-row">
            <input
              :value="filters.ivTotalMax"
              type="range"
              min="0"
              max="186"
              class="custom-range range-yellow"
              @input="emit('update:filters', { ...filters, ivTotalMax: Number($event.target.value) })"
            >
            <span class="range-val">{{ filters.ivTotalMax }}</span>
          </div>
        </div>
        <div class="split-side centered">
          <div class="group-label">
            IV Especial
          </div>
          <button
            :class="['special-btn', { active: filters.ivAny31 }]"
            @click="emit('update:filters', { ...filters, ivAny31: !filters.ivAny31 })"
          >
            {{ filters.ivAny31 ? '[★] IV 31 DETECTADO' : 'Cualquier IV en 31' }}
          </button>
        </div>
      </div>

      <button
        class="reset-btn"
        @click="emit('reset')"
      >
        ↺ Limpiar filtros
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.box-filter-btn {
  &.btn-blue {
    color: var(--blue);
    border-color: rgba(59, 139, 255, 0.4);
  }
  &.btn-gold {
    color: var(--coin-gold);
    border-color: rgba(255, 215, 0, 0.4);
  }
  &.btn-green {
    color: var(--green);
    border-color: rgba(107, 203, 119, 0.4);
  }

  &:hover {
    transform: Scale(1.05);
    filter: Brightness(1.2);
  }
}

.box-filter-panel {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 14px;
  margin-bottom: 14px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.filter-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--purple);
}

.filter-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.results-count {
  font-size: 10px;
  color: var(--yellow);
}

.arrow {
  color: var(--gray);
  font-size: 14px;
  transition: transform .2s;
}

.arrow.rotated {
  transform: rotate(180deg);
}

.search-container {
  margin-top: 12px;
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: #fff;
  font-size: 13px;
  font-family: 'Nunito', sans-serif;
  outline: none;
}

.filter-body {
  margin-top: 14px;
}

.filter-group {
  margin-bottom: 15px;
}

.group-label {
  font-size: 10px;
  color: var(--gray);
  margin-bottom: 8px;
  font-weight: 700;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.box-filter-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  padding: 5px 10px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.1);
  color: #eee;
  cursor: pointer;
  transition: all 0.2s;
}

.box-filter-btn.active {
  border-color: var(--purple-light) !important;
  background: rgba(199, 125, 255, 0.2) !important;
  color: #fff !important;
}

.filter-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.range-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-val {
  font-size: 11px;
  color: var(--yellow);
  width: 26px;
  text-align: right;
  font-weight: 700;
}

.custom-range {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255,255,255,0.1);
  height: 4px;
  border-radius: 5px;
  outline: none;
}

.range-yellow { accent-color: var(--yellow); }

.special-btn {
  width: 100%;
  padding: 10px;
  border-radius: 12px;
  font-size: 7px;
  font-family: 'Press Start 2P', monospace;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.1);
  color: #eee;
  transition: all 0.2s;
}

.special-btn.active {
  border: 1px solid var(--yellow);
  background: rgba(255, 184, 0, 0.12);
  color: var(--yellow);
}

.reset-btn {
  width: 100%;
  margin-top: 12px;
  padding: 10px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.05);
  color: var(--gray);
  font-size: 11px;
  transition: all 0.2s;
}
</style>
