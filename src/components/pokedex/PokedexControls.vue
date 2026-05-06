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

<style lang="scss">
</style>
