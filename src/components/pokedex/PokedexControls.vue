<script setup>
defineProps({
  currentGen: { type: Number, required: true },
  sortBy: { type: String, required: true },
  searchQuery: { type: String, required: true }
})
defineEmits(['update:currentGen', 'update:sortBy', 'update:searchQuery'])
</script>

<template>
  <div class="pokedex-controls glass-morphism">
    <nav class="gen-tabs">
      <button 
        v-for="gen in [1, 2]"
        :key="gen"
        class="tab-btn" 
        :class="{ active: currentGen === gen }"
        @click="$emit('update:currentGen', gen)"
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
          @click="$emit('update:sortBy', 'number')"
        >
          #
        </button>
        <button 
          class="sort-btn" 
          :class="{ active: sortBy === 'name' }"
          @click="$emit('update:sortBy', 'name')"
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
          @input="$emit('update:searchQuery', $event.target.value)"
        >
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/views/pokedex";
</style>
