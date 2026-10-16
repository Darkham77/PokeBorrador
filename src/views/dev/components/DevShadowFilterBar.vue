<script setup lang="ts">
/**
 * src/views/dev/components/DevShadowFilterBar.vue
 *
 * Filter toolbar with categories, generation/gender dropdowns, and search
 * for the Developer Shadow Calibration View.
 */

import { type ShadowEntityCategory } from '@/types/pokemon/spriteShadows';
import {
  VIEW_OPTIONS,
  GENERATION_OPTIONS,
  GENDER_OPTIONS,
  type ShadowGenOption,
  type ShadowGenderOption,
  type ShadowViewOption
} from '../devShadowMathHelper.ts';

interface Props {
  selectedCategory: ShadowEntityCategory;
  selectedGen: number | 'all';
  selectedGender: ShadowGenderOption;
  isShiny: boolean;
  selectedView: ShadowViewOption;
  onlyModified: boolean;
  searchQuery: string;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:selectedCategory', val: ShadowEntityCategory): void;
  (e: 'update:selectedGen', val: number | 'all'): void;
  (e: 'update:selectedGender', val: ShadowGenderOption): void;
  (e: 'update:isShiny', val: boolean): void;
  (e: 'update:selectedView', val: ShadowViewOption): void;
  (e: 'update:onlyModified', val: boolean): void;
  (e: 'update:searchQuery', val: string): void;
  (e: 'filterChange'): void;
}>();

const handleCategoryClick = (cat: ShadowEntityCategory) => {
  emit('update:selectedCategory', cat);
  emit('filterChange');
};

const handleGenChange = (event: Event) => {
  const raw = (event.target as HTMLSelectElement).value;
  const val = raw === 'all' ? 'all' : Number(raw);
  emit('update:selectedGen', val as ShadowGenOption);
  emit('filterChange');
};

const handleGenderChange = (event: Event) => {
  emit('update:selectedGender', (event.target as HTMLSelectElement).value as ShadowGenderOption);
  emit('filterChange');
};

const handleViewChange = (event: Event) => {
  emit('update:selectedView', (event.target as HTMLSelectElement).value as ShadowViewOption);
  emit('filterChange');
};

const handleShinyChange = (event: Event) => {
  emit('update:isShiny', (event.target as HTMLInputElement).checked);
};

const handleOnlyModifiedChange = (event: Event) => {
  emit('update:onlyModified', (event.target as HTMLInputElement).checked);
  emit('filterChange');
};

const handleSearchInput = (event: Event) => {
  emit('update:searchQuery', (event.target as HTMLInputElement).value);
  emit('filterChange');
};

const handleClearSearch = () => {
  emit('update:searchQuery', '');
  emit('filterChange');
};
</script>

<template>
  <!-- Secondary Filter Toolbar -->
  <nav class="filter-toolbar">
    <!-- Category Tabs -->
    <div class="category-tabs">
      <button
        id="dev-shadow-filter-bar-btn-pok-mon"
        type="button"
        class="tab-btn"
        :class="{ 'is-active': selectedCategory === 'pokemon' }"
        @click="handleCategoryClick('pokemon')"
      >
        Pokémon
      </button>
      <button
        id="dev-shadow-filter-bar-btn-npcs"
        type="button"
        class="tab-btn"
        :class="{ 'is-active': selectedCategory === 'npc' }"
        @click="handleCategoryClick('npc')"
      >
        NPCs
      </button>
      <button
        id="dev-shadow-filter-bar-btn-jugadores-clases"
        type="button"
        class="tab-btn"
        :class="{ 'is-active': selectedCategory === 'trainer' }"
        @click="handleCategoryClick('trainer')"
      >
        Jugadores / Clases
      </button>
      <button
        id="dev-shadow-filter-bar-btn-todos"
        type="button"
        class="tab-btn"
        :class="{ 'is-active': selectedCategory === 'all' }"
        @click="handleCategoryClick('all')"
      >
        Todos
      </button>
    </div>

    <!-- Contextual Filters Row -->
    <div class="sub-filters">
      <!-- Pokémon Generations (Only if pokemon) -->
      <div v-if="selectedCategory === 'pokemon'" class="gen-filter-group">
        <label class="filter-label">Gen:</label>
        <select
          id="dev-shadow-filter-bar-select-genchange"
          :value="selectedGen"
          aria-label="Generación"
          class="filter-select"
          @change="handleGenChange"
        >
          <option v-for="opt in GENERATION_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- Pokémon Gender Filter (Only if pokemon) -->
      <div v-if="selectedCategory === 'pokemon'" class="gen-filter-group">
        <label class="filter-label">Género:</label>
        <select
          id="dev-shadow-filter-bar-select-genderchange"
          :value="selectedGender"
          aria-label="Género"
          class="filter-select"
          @change="handleGenderChange"
        >
          <option v-for="opt in GENDER_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- Shiny Switch (Pokémon) -->
      <label v-if="selectedCategory === 'pokemon'" class="checkbox-label">
        <input
          id="dev-shadow-filter-bar-input-shinychange"
          :checked="isShiny"
          type="checkbox"
          aria-label="Variocolor (Shiny)"
          class="filter-checkbox"
          @change="handleShinyChange"
        />
        <span><span class="emoji">✨</span> Shiny</span>
      </label>

      <!-- View Filter -->
      <div class="gen-filter-group">
        <label class="filter-label">Vista:</label>
        <select
          id="dev-shadow-filter-bar-select-viewchange"
          :value="selectedView"
          aria-label="Vista"
          class="filter-select"
          @change="handleViewChange"
        >
          <option v-for="opt in VIEW_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- Only Modified Switch -->
      <label class="checkbox-label">
        <input
          id="dev-shadow-filter-bar-input-onlymodifiedchange"
          :checked="onlyModified"
          type="checkbox"
          aria-label="Solo Modificados"
          class="filter-checkbox"
          @change="handleOnlyModifiedChange"
        />
        <span>Solo Modificados</span>
      </label>

      <!-- Search Input -->
      <div class="search-box">
        <input
          id="dev-shadow-filter-bar-input-buscar-por-nombre-o-archivo"
          :value="searchQuery"
          type="text"
          class="search-input"
          placeholder="Buscar por nombre o archivo..."
          aria-label="Buscar por nombre o archivo"
          @input="handleSearchInput"
        />
        <button
          v-if="searchQuery"
          id="dev-shadow-filter-bar-btn-clearsearch"
          type="button"
          class="search-clear-btn"
          @click="handleClearSearch"
        >
          <span class="emoji">✕</span>
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped lang="scss" src="@/styles/views/_dev-shadow-editor.scss"></style>
