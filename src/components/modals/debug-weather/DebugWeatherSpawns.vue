<script setup lang="ts">
defineProps<{
  hasSpawns: boolean
  visitors: { name: string; sprite: string }[]
  exclusive: { name: string; sprite: string }[]
}>()
</script>

<template>
  <div 
    v-if="hasSpawns"
    class="weather-spawns"
  >
    <div 
      v-if="visitors.length" 
      class="spawn-group visitors"
    >
      <span class="group-label">Visitantes:</span>
      <div class="spawn-icons">
        <img 
          v-for="p in visitors" 
          :key="p.name"
          :src="p.sprite"
          :alt="p.name"
          class="mini-sprite"
          :title="p.name"
        >
      </div>
    </div>
    <div 
      v-if="exclusive.length" 
      class="spawn-group exclusive"
    >
      <span class="group-label">Exclusivos:</span>
      <div class="spawn-icons">
        <img 
          v-for="p in exclusive" 
          :key="p.name"
          :src="p.sprite"
          :alt="p.name"
          class="mini-sprite"
          :title="p.name"
        >
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_debug-weather-tables.scss"></style>
