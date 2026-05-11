<script setup lang="ts">
interface Props {
  currentGen: number
  sortBy: string
  searchQuery: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:currentGen', gen: number): void
  (e: 'update:sortBy', sortBy: string): void
  (e: 'update:searchQuery', query: string): void
}>()
</script>

<template>
  <div class="pokedex-controls glass-morphism">
    <nav class="gen-tabs">
      <button 
        v-for="gen in [1, 2]"
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
          class="pdex-sort-btn" 
          :class="{ active: sortBy === 'number' }"
          @click.stop="$emit('update:sortBy', 'number')"
        >
          #
        </button>
        <button 
          class="pdex-sort-btn" 
          :class="{ active: sortBy === 'name' }"
          @click.stop="$emit('update:sortBy', 'name')"
        >
          A-Z
        </button>
      </div>

      <div class="search-wrapper">
        <i class="pdex-search-icon">🔍</i>
        <input 
          :value="searchQuery" 
          type="text" 
          placeholder="Buscar..."
          class="pdex-search-input"
          @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        >
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.pokedex-controls {
  @include shell-premium(Rgba(15, 23, 42, 0.95));
  padding: 12px 24px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border: 1px solid Rgba(255, 255, 255, 0.05);
  margin-bottom: 24px;
  @include gpu-layer;

  @include responsive(950px) {
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
    gap: 12px;
  }
}

.gen-tabs {
  display: flex;
  background: Rgba(0, 0, 0, 0.3);
  padding: 4px;
  border-radius: 12px;
  border: 1px solid Rgba(255, 255, 255, 0.05);
  gap: 4px;

  .tab-btn {
    padding: 8px 16px;
    border: none;
    background: none;
    color: var(--gray);
    @include pixelated;
    font-size: 8px;
    cursor: pointer;
    border-radius: 8px;
    will-change: transform, background-color, color;

    &:hover { color: var(--white); background: Rgba(255, 255, 255, 0.05); }
    &.active {
      background: Rgba(255, 255, 255, 0.1);
      color: var(--white);
      border: 1px solid Rgba(255, 255, 255, 0.1);
    }
  }
}

.controls-right {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
  justify-content: flex-end;

  @include responsive(950px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
}

.sort-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: Rgba(0, 0, 0, 0.2);
  padding: 4px 8px;
  border-radius: 10px;
  border: 1px solid Rgba(255, 255, 255, 0.05);

  .sort-label {
    @include pixelated;
    font-size: 6px;
    color: var(--gray);
    margin-right: 4px;
    opacity: 0.6;
  }

  .pdex-sort-btn {
    width: 28px;
    height: 28px;
    @include flex-center;
    background: Rgba(255, 255, 255, 0.03);
    border: 1px solid Rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    color: var(--gray);
    @include pixelated;
    font-size: 8px;
    cursor: pointer;
    will-change: transform, background-color, border-color, color;

    &.active {
      background: var(--yellow-low);
      border-color: var(--yellow);
      color: var(--yellow);
    }
  }
}

.search-wrapper {
  position: relative;
  flex: 0 1 300px;
  display: flex;
  align-items: center;

  .pdex-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: Translatey(-50%);
    font-size: 12px;
    opacity: 0.4;
    pointer-events: none;
    font-style: normal;
  }

  .pdex-search-input {
    width: 100%;
    height: 40px;
    background: Rgba(0, 0, 0, 0.3);
    border: 1px solid Rgba(255, 255, 255, 0.1);
    padding: 0 12px 0 36px;
    border-radius: 10px;
    color: var(--white);
    font-size: 8px;
    @include pixelated;
    outline: none;
    will-change: background-color, border-color;

    &::placeholder {
      color: var(--gray);
      opacity: 0.4;
    }

    &:focus {
      background: Rgba(255, 255, 255, 0.05);
      border-color: var(--yellow);
    }
  }
}
</style>
