<script setup>
import { useWarStore } from '@/stores/war'

const warStore = useWarStore()
</script>

<template>
  <div class="faction-choice-overlay">
    <div class="choice-modal">
      <h2>ELEGIR BANDO</h2>
      <p>Tu bando determina con quién disputás el control de Kanto.<br>¡Elige con sabiduría!</p>
      <div class="choice-grids">
        <div
          class="choice-card union"
          @click="warStore.chooseFaction('union')"
        >
          <img
            src="/assets/factions/union.png"
            alt="Union"
          >
          <h3>TEAM UNIÓN</h3>
          <button class="join-btn">
            UNIRSE
          </button>
        </div>
        <div
          class="choice-card poder"
          @click="warStore.chooseFaction('poder')"
        >
          <img
            src="/assets/factions/poder.png"
            alt="Poder"
          >
          <h3>TEAM PODER</h3>
          <button class="join-btn">
            UNIRSE
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.faction-choice-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.choice-modal {
  background: #1e293b;
  border: 2px solid #334155;
  border-radius: 20px;
  padding: 30px;
  max-width: 600px;
  text-align: center;

  h2 { font-family: 'Press Start 2P', monospace; font-size: 18px; margin-bottom: 20px; color: #fff; }
  p { font-size: 12px; color: #94a3b8; line-height: 1.6; margin-bottom: 30px; }
}

.choice-grids {
  display: flex;
  gap: 20px;
}

.choice-card {
  flex: 1;
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;

  img { width: 60px; height: 60px; margin-bottom: 15px; }
  h3 { font-family: 'Press Start 2P', monospace; font-size: 10px; margin-bottom: 20px; }

  &.union:hover { border-color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
  &.poder:hover { border-color: #ef4444; background: rgba(239, 68, 68, 0.1); }
  
  .join-btn {
    width: 100%;
    padding: 10px;
    border-radius: 8px;
    border: none;
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    cursor: pointer;
  }
  &.union .join-btn { background: #3b82f6; color: #fff; }
  &.poder .join-btn { background: #ef4444; color: #fff; }
}
</style>
