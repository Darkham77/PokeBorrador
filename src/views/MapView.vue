<script setup>
import { ref } from 'vue'

const currentRoute = ref('Pueblo Inicial')
</script>

<template>
  <div class="map-view">
    <div class="header">
      <h2>Exploración</h2>
      <p>Estás en: <span>{{ currentRoute }}</span></p>
    </div>
    
    <div class="map-placeholder">
      <div class="placeholder-text">
        <span class="icon">🌿</span>
        <p>El mapa interactivo se está migrando...</p>
        <button class="action-btn">BUSCAR POKÉMON</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-view {
  animation: fadeIn 0.4s ease;
}

.header h2 {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  color: #fff;
  margin-bottom: 8px;
}

.header p {
  font-size: 13px;
  color: var(--gray);
}

.header p span {
  color: var(--yellow);
  font-weight: bold;
}

.map-placeholder {
  margin-top: 24px;
  background: var(--card);
  height: 400px;
  border-radius: 24px;
  border: 2px dashed rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.placeholder-text p {
  color: var(--gray);
  margin-bottom: 24px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  line-height: 1.6;
}

.action-btn {
  background: linear-gradient(135deg, var(--green), #27ae60);
  color: white;
  border: none;
  padding: 16px 32px;
  border-radius: 12px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(50, 215, 75, 0.3);
}
</style>
