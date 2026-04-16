<script setup>
import { onMounted } from 'vue'
import { useWarStore } from '@/stores/war'
import { FIRE_RED_MAPS } from '@/data/maps'

// Modular Components
import FactionChoiceModal from '@/components/war/FactionChoiceModal.vue'
import WarMapCard from '@/components/war/WarMapCard.vue'

const warStore = useWarStore()

// Mapping legacy image names
const WAR_MAP_IMAGES = {
  route1: 'ruta 1.png', route2: 'ruta 2.png', forest: 'bosque viridian.png',
  route22: 'ruta 22.png', route3: 'ruta 3.png', mt_moon: 'mt. moon.png',
  route4: 'ruta 4.png', route24: 'ruta 24.png', route25: 'ruta 25.png',
  route5: 'ruta 5.png', route6: 'ruta 6.png', route11: 'ruta 11.png',
  diglett_cave: 'cueva diglett.png', route9: 'ruta 9.png', rock_tunnel: 'tunel roca.png',
  route10: 'ruta 10.png', power_plant: 'central de energia.png', route8: 'ruta 8.png',
  pokemon_tower: 'torre pokemon.png', route12: 'ruta 12.png', route13: 'ruta 13.png',
  safari_zone: 'zona safari.png', seafoam_islands: 'islas espuma.png',
  mansion: 'mansion pokemon.png', route14: 'ruta 14.png', route15: 'ruta 15.png',
  route23: 'ruta 23.png', victory_road: 'calle victoria.png', cerulean_cave: 'cueva celeste.png'
}

onMounted(() => {
  warStore.loadWarData()
})
</script>

<template>
  <div class="war-view">
    <!-- 1. HEADER -->
    <header class="war-main-header">
      <div class="stats-bar">
        <div
          class="faction-badge"
          :class="warStore.faction"
        >
          <img
            v-if="warStore.faction"
            :src="`/assets/factions/${warStore.faction}.png`"
            alt="Faction Icon"
          >
          <span>TEAM {{ warStore.faction?.toUpperCase() || 'SIN BANDO' }}</span>
        </div>
        <div class="war-stats">
          <div class="stat-item">
            ⚡ {{ warStore.warCoins }} MONEDAS
          </div>
          <div class="stat-item">
            ⚔️ {{ warStore.weeklyPoints }} PT SEMANALES
          </div>
        </div>
      </div>

      <div
        class="phase-banner"
        :class="{ dispute: warStore.isDisputePhase }"
      >
        <span class="phase-label">FASE DE {{ warStore.isDisputePhase ? 'DISPUTA' : 'DOMINANCIA' }}</span>
        <div
          v-if="warStore.isDisputePhase"
          class="phase-hint"
        >
          Capturar y batallar suma puntos para tu bando
        </div>
        <div
          v-else
          class="phase-hint"
        >
          Las rutas conquistadas otorgan bonus de EXP y Shiny Chance
        </div>
      </div>
    </header>

    <!-- 2. NO FACTION SELECTION MODAL -->
    <FactionChoiceModal v-if="!warStore.faction" />

    <!-- 3. MAP GRID -->
    <div
      v-else
      class="war-grid custom-scrollbar"
    >
      <WarMapCard 
        v-for="map in FIRE_RED_MAPS" 
        :key="map.id"
        :map="map"
        :image-name="WAR_MAP_IMAGES[map.id]"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.war-view {
  height: 100%;
  padding: 0;
  display: flex;
  flex-direction: column;
  background: #0d1117;
  color: #fff;
}

.war-main-header {
  padding: 15px 20px;
  background: rgba(0,0,0,0.4);
  border-bottom: 2px solid rgba(255,255,255,0.05);
}

.stats-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.faction-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;

  img { width: 16px; height: 16px; }
  &.union { border-color: #3b82f6; color: #3b82f6; }
  &.poder { border-color: #ef4444; color: #ef4444; }
}

.war-stats {
  display: flex;
  gap: 20px;
  font-size: 11px;
  font-weight: bold;
}

.phase-banner {
  text-align: center;
  padding: 10px;
  background: rgba(255,255,255,0.03);
  border: 1px dashed rgba(255,255,255,0.1);
  border-radius: 12px;

  &.dispute { border-color: #fbbf24; background: rgba(251, 191, 36, 0.05); }

  .phase-label {
    display: block;
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    margin-bottom: 4px;
    color: #ffd700;
  }
  .phase-hint { font-size: 9px; color: #888; }
}

.war-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  padding: 20px;
}

.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
</style>
