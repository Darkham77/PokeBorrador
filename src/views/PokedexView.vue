<script setup>
</script>

<template>
  <div class="pokedex-view">
    <div class="header">
      <h2>Pokédex</h2>
      <p>Avistados: 0 | Capturados: 0</p>
    </div>
    
    <div class="pokedex-placeholder">
      <div class="icon">📖</div>
      <p>Base de datos en proceso de sincronización...</p>
    </div>
  </div>
</template>

<style scoped>
.header h2 {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  margin-bottom: 8px;
}

.pokedex-placeholder {
  margin-top: 40px;
  text-align: center;
  color: var(--gray);
}

.icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.pokedex-placeholder p {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
}
</style>
