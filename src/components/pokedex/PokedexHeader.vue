<script setup lang="ts">
interface Props {
  stats: {
    seen: number
    caught: number
    total: number
  }
}

const props = defineProps<Props>()
</script>

<template>
  <header class="pokedex-header glass-morphism">
    <div class="header-content">
      <div class="title-group">
        <h1>POKÉDEX NACIONAL</h1>
        <p class="subtitle">
          REGIÓN DE KANTO & JOHTO
        </p>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">VISTOS</span>
          <span class="stat-value">{{ stats.seen }}</span>
        </div>
        <div class="stat-card highlight">
          <span class="stat-label">CAPTURADOS</span>
          <span class="stat-value">{{ stats.caught }} <small>/ {{ stats.total }}</small></span>
        </div>
      </div>
    </div>
  </header>
</template>
<style lang="scss">
</style>

