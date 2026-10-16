<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { useGTSStore } from '@/stores/gts';
import type { MarketFilters } from '@/logic/economy/market';
import MarketPokemonFiltersGroup from './MarketPokemonFiltersGroup.vue';

interface Props {
  context: string; // 'explore' or 'my-inventory'
}

defineProps<Props>();

const gtsStore = useGTSStore();
const priceGroupId = useId();

const isExpanded = ref(false);

const filters = computed(() => gtsStore.filters);

const categories = [
  { value: 'all', label: 'Todo' },
  { value: 'pokeballs', label: 'Pokéballs' },
  { value: 'potions', label: 'Curativos' },
  { value: 'stones', label: 'Piedras' },
  { value: 'combat_held', label: 'Combate' },
  { value: 'breeding_held', label: 'Crianza' },
  { value: 'machinery', label: 'Maquinaria' },
  { value: 'tools', label: 'Herramientas' },
  { value: 'tms', label: 'MTs' },
  { value: 'raw_material', label: 'M. Prima' },
  { value: 'refined_material', label: 'M. Refinado' },
  { value: 'component', label: 'Componente' },
  { value: 'otros', label: 'Otros' }
];

const setFilter = <K extends keyof MarketFilters>(key: K, value: MarketFilters[K]) => {
  gtsStore.filters[key] = value;
};

const MARKET_FILTER_PRICE_MAX_LIMIT = 1000000;
const MARKET_FILTER_IV_TOTAL_MAX_LIMIT = 186;

const formattedPriceRange = computed(() => {
  const minText = `₽${filters.value.priceMin.toLocaleString()}`;
  const maxText =
    filters.value.priceMax === MARKET_FILTER_PRICE_MAX_LIMIT
      ? 'Máx'
      : `₽${filters.value.priceMax.toLocaleString()}`;
  return `${minText} - ${maxText}`;
});

const resetFilters = () => {
  gtsStore.filters = {
    mode: 'pokemon',
    search: '',
    priceMin: 0,
    priceMax: MARKET_FILTER_PRICE_MAX_LIMIT,
    tier: 'all',
    type: 'all',
    levelMin: 1,
    levelMax: 100,
    ivTotalMin: 0,
    ivTotalMax: MARKET_FILTER_IV_TOTAL_MAX_LIMIT,
    ivAny31: false,
    itemCat: 'all'
  };
};
</script>

<template>
  <div class="market-filters">
    <div class="filter-header">
      <div
        id="market-filters-toggle-btn"
        class="toggle-btn"
        role="button"
        tabindex="0"
        @click.stop="isExpanded = !isExpanded"
      >
        <span class="label"><span class="emoji">🔍</span><span>FILTROS GTS</span></span>
        <span class="emoji arrow">{{ isExpanded ? '▲' : '▼' }}</span>
      </div>

      <div v-if="context === 'explore'" class="mode-switch">
        <button
          id="market-filters-mode-pokemon-btn"
          :class="{ active: filters.mode === 'pokemon' }"
          @click.stop="setFilter('mode', 'pokemon')"
        >
          <span class="emoji">⚡</span>
          <span>Pokes</span>
        </button>
        <button
          id="market-filters-mode-item-btn"
          :class="{ active: filters.mode === 'item' }"
          @click.stop="setFilter('mode', 'item')"
        >
          <span class="emoji">🎒</span>
          <span>Objetos</span>
        </button>
      </div>
      <span v-else class="context-label">Filtrando tu inventario</span>
    </div>

    <div class="search-row">
      <input
        id="market-filters-search-input"
        v-model="gtsStore.filters.search"
        type="text"
        :placeholder="filters.mode === 'pokemon' ? 'Buscar Pokémon...' : 'Buscar objetos...'"
        :aria-label="filters.mode === 'pokemon' ? 'Buscar Pokémon' : 'Buscar objetos'"
        class="search-input"
      />
    </div>

    <div v-show="isExpanded" class="filter-body">
      <!-- Price Range -->
      <div class="filter-group" role="group" :aria-labelledby="priceGroupId">
        <div :id="priceGroupId" class="group-header">
          <span class="price-title"><span>Precio</span> <span class="emoji">💰</span></span>
          <span class="range-val">{{ formattedPriceRange }}</span>
        </div>
        <input
          id="market-filters-price-min-input"
          v-model.number="gtsStore.filters.priceMin"
          type="range"
          min="0"
          max="50000"
          step="500"
          aria-label="Precio mínimo"
          class="range-input"
        />
        <input
          id="market-filters-price-max-input"
          v-model.number="gtsStore.filters.priceMax"
          type="range"
          min="0"
          max="1000000"
          step="1000"
          aria-label="Precio máximo"
          class="range-input"
        />
      </div>

      <!-- Pokemon Specific -->
      <MarketPokemonFiltersGroup
        v-if="filters.mode === 'pokemon'"
        id="market-filters-marketpokemonfiltersgroup-1"
        :current-tier="filters.tier"
        :current-type="filters.type"
        @change-tier="setFilter('tier', $event)"
        @change-type="setFilter('type', $event)"
      />

      <!-- Item Specific -->
      <template v-else>
        <div class="filter-group">
          <div class="group-label">Categoría</div>
          <div class="tags-grid">
            <button
              v-for="c in categories"
              :id="`market-filters-cat-${c.value}`"
              :key="c.value"
              class="tag-btn"
              :class="{ active: filters.itemCat === c.value }"
              @click.stop="setFilter('itemCat', c.value)"
            >
              {{ c.label }}
            </button>
          </div>
        </div>
      </template>

      <button id="market-filters-reset-btn" class="reset-btn" @click.stop="resetFilters">
        Limpiar filtros
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/core/tools' as *;

.market-filters {
  margin: 20px;
  padding: 14px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: $radius-2xl-alt;
  background: Rgb(255 255 255 / 3%);
  margin-bottom: 16px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm;
  cursor: pointer;
}

.label {
  @include pixelated;

  display: inline-flex;
  align-items: center;
  gap: $spacing-sm-alt;
  color: var(--blue-light);
  font-size: var(--font-8);
  line-height: 1.35;

  .emoji {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    font-size: var(--font-9);
    line-height: 1;
  }
}

.arrow {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  color: var(--gray);
  font-size: var(--font-9);
  line-height: 1;
}

.mode-switch {
  display: flex;
  gap: $spacing-xs;
  padding: 3px;
  border-radius: $radius-lg-alt;
  background: Rgb(0 0 0 / 30%);
}

.mode-switch button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: $spacing-xs-5;
  padding: 4px 10px;
  border: 1px solid transparent;
  border-radius: $radius-7;
  background: transparent;
  color: var(--gray);
  font-size: var(--font-9);
  line-height: 1.35;
  cursor: pointer;

  .emoji {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    font-size: var(--font-10);
    line-height: 1;
  }
}

.mode-switch button.active {
  background: var(--blue);
  color: $white;
  border-color: var(--black);
  text-shadow:
    1px 1px 0 #000,
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000;
}

.context-label {
  color: var(--gray);
  font-size: var(--font-9);
  opacity: 0.6;
}

.search-row {
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: $radius-lg;
  background: Rgb(0 0 0 / 40%);
  color: $white;
  font-size: var(--font-10);
  outline: none;
}

.search-input:focus {
  border-color: var(--blue);
}

.filter-body {
  border-top: 1px solid Rgb(255 255 255 / 6%);
  padding-top: 14px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  margin-bottom: 15px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--yellow);
  font-size: var(--font-10);
  margin-bottom: 8px;

  .price-title {
    display: inline-flex;
    align-items: center;
    gap: $spacing-xs;
    line-height: 1.35;

    .emoji {
      font-size: var(--font-10);
      line-height: 1;
    }
  }
}

.range-input {
  width: 100%;
  accent-color: var(--yellow);
  margin-bottom: 6px;
}

.group-label {
  color: var(--gray);
  font-size: var(--font-10);
  margin-bottom: 8px;
}

.tags-grid,
.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm-alt;
}

.tag-btn {
  padding: 6px 10px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: $radius-xl;
  background: Rgb(255 255 255 / 4%);
  color: var(--gray);
  font-size: var(--font-8);
  cursor: pointer;
  text-transform: capitalize;
}

.tag-btn.active {
  background: Rgb(10 132 255 / 20%);
  color: $white;
  border-color: var(--blue);
}

.reset-btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: $radius-xl;
  background: Rgb(255 255 255 / 3%);
  color: var(--gray);
  font-size: var(--font-11);
  margin-top: 15px;
  cursor: pointer;
}
</style>
