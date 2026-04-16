<script setup>
const props = defineProps({
  filters: { type: Object, required: true },
  isFiltersOpen: { type: Boolean, required: true },
  sortMode: { type: String, required: true },
  hasActiveFilters: { type: Boolean, required: true },
  resultsCount: { type: Number, required: true }
})

const emit = defineEmits(['update:isFiltersOpen', 'update:sortMode', 'reset'])

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
        v-model="filters.search"
        type="text"
        placeholder="Buscar por nombre..."
        class="search-input"
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
            :class="['box-filter-btn', { active: sortMode === 'level' }]"
            style="color: var(--blue); border-color: rgba(59,139,255,0.4);"
            @click="setSortMode('level')"
          >
            Nivel
          </button>
          <button
            :class="['box-filter-btn', { active: sortMode === 'tier' }]"
            style="color: #FFD700; border-color: rgba(255,215,0,0.4);"
            @click="setSortMode('tier')"
          >
            Tier
          </button>
          <button
            :class="['box-filter-btn', { active: sortMode === 'type' }]"
            style="color: var(--green); border-color: rgba(107,203,119,0.4);"
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
            @click="filters.tier = 'all'"
          >
            Todos
          </button>
          <button
            v-for="t in [['S+', '#FFD700', 'rgba(255,215,0,0.12)', 'rgba(255,215,0,0.4)'], ['S', '#FFB800', 'rgba(255,180,0,0.12)', 'rgba(255,180,0,0.4)'], ['A', 'var(--green)', 'rgba(107,203,119,0.12)', 'rgba(107,203,119,0.4)'], ['B', 'var(--blue)', 'rgba(59,139,255,0.12)', 'rgba(59,139,255,0.4)'], ['C', 'var(--purple)', 'rgba(199,125,255,0.12)', 'rgba(199,125,255,0.4)'], ['D', '#FF9632', 'rgba(255,150,50,0.12)', 'rgba(255,150,50,0.4)'], ['F', 'var(--red)', 'rgba(255,59,59,0.12)', 'rgba(255,59,59,0.4)']]"
            :key="t[0]"
            :class="['box-filter-btn', { active: filters.tier === t[0] }]"
            :style="{ color: t[1], background: filters.tier === t[0] ? t[2] : 'rgba(255,255,255,0.1)', borderColor: t[3] }"
            @click="filters.tier = t[0]"
          >
            {{ t[0] }}
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
            @click="filters.type = 'all'"
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
              v-model.number="props.filters.ivTotalMin"
              type="range"
              min="0"
              max="186"
              class="custom-range range-yellow"
            >
            <span class="range-val">{{ filters.ivTotalMin }}</span>
          </div>
          <div class="range-row">
            <input
              v-model.number="props.filters.ivTotalMax"
              type="range"
              min="0"
              max="186"
              class="custom-range range-yellow"
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
            @click="filters.ivAny31 = !filters.ivAny31"
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

<style scoped>
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
