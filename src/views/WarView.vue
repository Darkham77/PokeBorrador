<script setup>
import { onMounted, computed } from 'vue'
import { useWarStore } from '@/stores/war'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { FACTION_CHANGE_COST } from '@/logic/war/warEngine'

const warStore = useWarStore()
const gameStore = useGameStore()
const uiStore = useUIStore()

onMounted(async () => {
  await warStore.loadWarData()
})

const factionColor = computed(() => {
  if (warStore.faction === 'union') return 'var(--blue)'
  if (warStore.faction === 'poder') return 'var(--red)'
  return 'var(--gray)'
})

const handleJoinFaction = async (faction) => {
  const confirmMsg = warStore.faction 
    ? `¿Estás seguro de cambiar al Team ${faction === 'union' ? 'Unión' : 'Poder'}? Esto costará 🪙${FACTION_CHANGE_COST.toLocaleString()} y perderás tus puntos de esta semana.`
    : `¿Deseas unirte al Team ${faction === 'union' ? 'Unión' : 'Poder'}?`
  
  if (confirm(confirmMsg)) {
    await warStore.chooseFaction(faction)
  }
}
</script>

<template>
  <div class="war-view">
    <!-- Faction Selection Overlay -->
    <div
      v-if="!warStore.faction"
      class="faction-picker"
    >
      <div class="picker-content">
        <h1>ELIGE TU FACCIÓN</h1>
        <p>Tu elección determinará a quién apoyas en la toma de control de las rutas del mapa.</p>
        
        <div class="options">
          <div
            class="faction-card union"
            @click="handleJoinFaction('union')"
          >
            <div class="icon">
              🛡️
            </div>
            <h2>TEAM UNIÓN</h2>
            <p>Lealtad y Protección</p>
            <button class="btn-union">
              UNIRSE
            </button>
          </div>
          
          <div
            class="faction-card poder"
            @click="handleJoinFaction('poder')"
          >
            <div class="icon">
              ⚔️
            </div>
            <h2>TEAM PODER</h2>
            <p>Fuerza y Dominio</p>
            <button class="btn-poder">
              UNIRSE
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Command Center -->
    <div
      v-else
      class="command-center"
    >
      <header class="war-header">
        <div class="player-stats">
          <div
            class="badge"
            :style="{ borderColor: factionColor }"
          >
            <span class="faction-label">{{ warStore.faction?.toUpperCase() }}</span>
          </div>
          <div class="coins">
            <span class="icon">🪙</span>
            <span class="value">{{ warStore.warCoins }}</span>
          </div>
        </div>
        
        <div class="week-info">
          <span class="label">SEMANA ACTUAL</span>
          <span class="value">{{ warStore.currentWeekId }}</span>
          <div
            class="phase-tag"
            :class="{ dispute: warStore.isDisputeActive }"
          >
            {{ warStore.isDisputeActive ? 'FASE DE DISPUTA' : 'FASE DE DOMINANCIA' }}
          </div>
        </div>
      </header>

      <section class="dominance-map">
        <div class="section-title">
          <h2>CONTROL TERRITORIAL</h2>
          <p v-if="warStore.isDisputeActive">
            Los mapas están en disputa. Combate para ganar puntos.
          </p>
          <p v-else>
            Estamos en fase de dominancia. Reclama tus bonos en las rutas controladas.
          </p>
        </div>

        <div class="maps-grid">
          <div
            v-for="(data, mapId) in warStore.mapDominance"
            :key="mapId"
            class="map-card"
          >
            <div class="map-name">
              {{ mapId.replace('_', ' ').toUpperCase() }}
            </div>
            
            <div class="dominance-bar">
              <div
                class="union-fill"
                :style="{ width: (data.union / (data.union + data.poder || 1) * 100) + '%' }"
              />
              <div
                class="poder-fill"
                :style="{ width: (data.poder / (data.union + data.poder || 1) * 100) + '%' }"
              />
            </div>
            
            <div class="pts-info">
              <span class="pts union">{{ data.union }}</span>
              <span class="pts poder">{{ data.poder }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.war-view {
  width: 100%;
  height: 100%;
  padding: 20px;
  background: var(--bg-main);
  color: var(--text);
  overflow-y: auto;
}

.faction-picker {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 100px);
  text-align: center;

  h1 { font-size: 3rem; margin-bottom: 1rem; color: var(--yellow); letter-spacing: 4px; }
  
  .options {
    display: flex;
    gap: 40px;
    margin-top: 50px;
  }

  .faction-card {
    background: #1a1a1a;
    border: 2px solid #333;
    padding: 40px;
    border-radius: 20px;
    width: 300px;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-10px);
      background: #252525;
    }

    &.union:hover { border-color: var(--blue); box-shadow: 0 0 20px rgba(10, 132, 255, 0.3); }
    &.poder:hover { border-color: var(--red); box-shadow: 0 0 20px rgba(255, 69, 58, 0.3); }

    .icon { font-size: 4rem; margin-bottom: 20px; }
    h2 { margin-bottom: 10px; }
    p { color: var(--gray); margin-bottom: 30px; }
    
    button {
      padding: 12px 30px;
      border-radius: 30px;
      border: none;
      font-weight: bold;
      cursor: pointer;
    }
    
    .btn-union { background: var(--blue); color: white; }
    .btn-poder { background: var(--red); color: white; }
  }
}

.command-center {
  max-width: 1200px;
  margin: 0 auto;
}

.war-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255,255,255,0.05);
  padding: 20px 30px;
  border-radius: 15px;
  border: 1px solid rgba(255,255,255,0.1);
  margin-bottom: 40px;

  .player-stats {
    display: flex;
    align-items: center;
    gap: 20px;
    
    .badge {
      border: 2px solid;
      padding: 5px 15px;
      border-radius: 10px;
      font-weight: 800;
    }
    
    .coins {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1.2rem;
      font-weight: 600;
    }
  }

  .week-info {
    text-align: right;
    
    .label { display: block; font-size: 0.8rem; color: var(--gray); }
    .value { font-size: 1.5rem; font-weight: 800; letter-spacing: 2px; }
    
    .phase-tag {
      font-size: 0.7rem;
      font-weight: bold;
      padding: 3px 8px;
      border-radius: 4px;
      margin-top: 5px;
      display: inline-block;
      
      &.dispute { background: var(--red); color: white; }
      &:not(.dispute) { background: var(--green); color: black; }
    }
  }
}

.maps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 30px;
}

.map-card {
  background: var(--card);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.05);
  
  .map-name {
    font-size: 0.9rem;
    font-weight: 700;
    margin-bottom: 15px;
    color: var(--gray);
  }
  
  .dominance-bar {
    height: 10px;
    background: #333;
    border-radius: 5px;
    overflow: hidden;
    display: flex;
    margin-bottom: 10px;
    
    .union-fill { background: var(--blue); height: 100%; transition: width 0.5s ease; }
    .poder-fill { background: var(--red); height: 100%; transition: width 0.5s ease; }
  }
  
  .pts-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    font-weight: 600;
    
    .union { color: var(--blue); }
    .poder { color: var(--red); }
  }
}
</style>
