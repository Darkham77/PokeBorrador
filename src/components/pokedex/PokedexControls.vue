<script setup lang="ts">
import type { SortOrder } from '@/types/system/game'

interface Props {
  currentGen: number
  sortBy: string
  sortOrder: SortOrder
  searchQuery: string
}

const { currentGen, sortBy, sortOrder, searchQuery } = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:currentGen', gen: number): void
  (e: 'update:sortBy', sortBy: string): void
  (e: 'update:sortOrder', sortOrder: SortOrder): void
  (e: 'update:searchQuery', query: string): void
}>()

const handleSortClick = (key: string) => {
  if (sortBy === key) {
    emit('update:sortOrder', sortOrder === 'asc' ? 'desc' : 'asc')
  } else {
    emit('update:sortBy', key)
    emit('update:sortOrder', 'asc')
  }
}
</script>

<template>
  <div class="pokedex-controls glass-morphism">
    <nav class="gen-tabs">
      <button
        v-for="gen in [1, 2]" 
        id="pokedex-controls-btn-gen-gen"
        :key="gen"
        class="tab-btn" 
        :class="{ active: currentGen === gen }"
        @click.stop="$emit('update:currentGen', gen)"
      >
        GEN {{ gen }}
      </button>
    </nav>

    <div class="controls-right">
      <div class="sort-group">
        <span class="sort-label">ORDEN:</span>
        <button
          id="pokedex-controls-btn-1" 
          class="pdex-sort-btn" 
          :class="{ active: sortBy === 'number' }"
          @click.stop="handleSortClick('number')"
        >
          Nº
          <span
            v-if="sortBy === 'number'"
            class="emoji sort-arrow"
          >
            {{ sortOrder === 'asc' ? '↑' : '↓' }}
          </span>
        </button>
        <button
          id="pokedex-controls-btn-2" 
          class="pdex-sort-btn" 
          :class="{ active: sortBy === 'name' }"
          @click.stop="handleSortClick('name')"
        >
          A-Z
          <span
            v-if="sortBy === 'name'"
            class="emoji sort-arrow"
          >
            {{ sortOrder === 'asc' ? '↑' : '↓' }}
          </span>
        </button>
      </div>

      <div class="search-wrapper">
        <span class="emoji pdex-search-icon">🔍</span>
        <input
          id="pokedex-controls-input-buscar" 
          :value="searchQuery" 
          type="text" 
          placeholder="Buscar..."
          class="pdex-search-input"
          @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        >
        <button
          v-if="searchQuery" 
          id="pokedex-controls-btn-3"
          class="clear-btn"
          @click.stop="$emit('update:searchQuery', '')"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.pokedex-controls {
  @include shell-premium(Rgba(15, 23, 42, 0.95));
  @include gpu-layer;

  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-2xl;
  padding: 12px 24px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: $radius-3xl;
  margin-bottom: 0;

  @include responsive(950px) {
    flex-direction: column;
    align-items: stretch;
    gap: $spacing-md;
    padding: 16px;
  }
}

.gen-tabs {
  display: flex;
  gap: $spacing-xs;
  padding: 4px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: $radius-xl;
  background: Rgb(0 0 0 / 30%);

  .tab-btn {
    @include pixelated;

    padding: 8px 16px;
    border: none;
    border-radius: $radius-lg;
    background: none;
    color: var(--gray);
    font-size: var(--font-8);
    cursor: pointer;
    will-change: transform, background-color, color;

    &:hover { background: Rgb(255 255 255 / 5%); color: var(--white); }
    &.active {
      border: 1px solid Rgb(255 255 255 / 10%);
      background: Rgb(255 255 255 / 10%);
      color: var(--white);
    }
  }
}

.controls-right {

  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: $spacing-xl;
  flex: 1;

  @include responsive(950px) {
    flex-direction: column;
    align-items: stretch;
    gap: $spacing-md;
  }
}

.sort-group {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: 4px 8px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: $radius-lg-alt;
  background: Rgb(0 0 0 / 20%);

  .sort-label {
    @include pixelated;

    color: var(--gray);
    font-size: var(--font-6);
    opacity: 0.6;
    margin-right: 4px;
  }

  .pdex-sort-btn {
    @include flex-center;
    @include pixelated;

    gap: $spacing-xs-alt;
    min-width: 28px;
    height: 28px;
    padding: 0 6px;
    border: 1px solid Rgb(255 255 255 / 5%);
    border-radius: $radius-md;
    background: Rgb(255 255 255 / 3%);
    color: var(--gray);
    font-size: var(--font-8);
    cursor: pointer;
    will-change: transform, background-color, border-color, color;

    &.active {
      background: var(--yellow-low);
      color: var(--yellow);
      border-color: var(--yellow);
    }
  }
}

.search-wrapper {

  position: relative;
  display: flex;
  align-items: center;
  flex: 0 1 300px;

  @include responsive(950px) {
    width: 100%;
    flex: none;
  }

  .pdex-search-icon {
    position: absolute;
    top: 50%;
    left: 12px;
    font-size: var(--font-12);
    opacity: 0.4;
    transform: Translatey(-50%);
    pointer-events: none;
    font-style: normal;
  }

  .pdex-search-input {
    @include pixelated;

    width: 100%;
    height: 40px;
    padding: 0 12px 0 36px;
    border: 1px solid Rgb(255 255 255 / 10%);
    border-radius: $radius-lg-alt;
    background: Rgb(0 0 0 / 30%);
    color: var(--white);
    font-size: var(--font-8);
    outline: none;
    will-change: background-color, border-color;

    &:focus {
      background: Rgb(255 255 255 / 5%);
      border-color: var(--yellow);
    }

    &::placeholder {
      color: var(--gray);
      opacity: 0.4;
    }
  }

  .clear-btn {
    position: absolute;
    right: 12px;
    padding: 0;
    border: none;
    background: none;
    color: Rgb(255 255 255 / 50%);
    font-size: var(--font-16);
    line-height: 1;
    cursor: pointer;

    &:hover { color: var(--white); }
  }
}
</style>
