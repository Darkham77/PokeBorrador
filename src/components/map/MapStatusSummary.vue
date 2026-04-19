<script setup>
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

const props = defineProps({
  missionsRemaining: { type: Number, default: 0 },
  missionSprites: { type: Array, default: () => [] },
  gymRematches: { type: Number, default: 0 },
  gymSprites: { type: Array, default: () => [] },
  eggCount: { type: Number, default: 0 },
  rivalEventActive: { type: Boolean, default: true },
  rivalEventText: { type: String, default: 'Doble chance de encuentro con El Rival durante todo el día' },
  isReady: { type: Boolean, default: false }
})

const emit = defineEmits(['openTab', 'openCenter'])

const bannerUrl = computed(() => {
  return getAssetUrl(ASSET_TYPES.BANNER, 'pokecenter_banner')
})

const bannerStyle = computed(() => ({
  backgroundImage: `url('${bannerUrl.value}')`
}))
</script>

<template>
  <div class="pc-split-container">
    <!-- Carta Centro Pokémon (Izq: 50%) -->
    <div class="pc-left">
      <div
        class="pokecenter-banner legacy-panel"
        @click="emit('openCenter')"
      >
        <div 
          class="banner-bg" 
          :style="bannerStyle"
        />
        <div class="banner-overlay">
          <div class="banner-title">
            CENTRO POKÉMON
          </div>
          <div class="banner-desc">
            Saná a tu equipo y restaurá todos sus PP al instante.
          </div>
        </div>
        <span class="banner-tag">🏥 CURACIÓN</span>
      </div>
    </div>

    <!-- Grilla de Status Banners (Der: 50%) -->
    <div class="pc-right">
      <div class="pc-banner-grid">
        <!-- 1. Evento -->
        <div
          class="pc-banner event-banner legacy-panel"
          :class="{ active: rivalEventActive }"
        >
          <div class="pc-banner-header">
            <span class="pc-banner-icon">⚡</span>
            <span class="pc-banner-title">EVENTO</span>
          </div>
          <div class="pc-banner-text-large">
            {{ rivalEventActive ? rivalEventText.split(':')[0] : 'SIN EVENTOS' }}
          </div>
          <div class="pc-banner-text">
            {{ rivalEventActive ? (rivalEventText.split(':')[1] || rivalEventText) : 'No hay eventos activos en este momento' }}
          </div>
        </div>

        <!-- 2. Guardería -->
        <div
          class="pc-banner legacy-panel"
          @click="emit('openTab', 'daycare')"
        >
          <div class="pc-banner-header">
            <span class="pc-banner-icon">📜</span>
            <span class="pc-banner-title">GUARDERÍA</span>
          </div>
          <div class="pc-banner-text">
            ¡Tenés <span>{{ missionsRemaining }}</span> misiones por hacer!
          </div>
          <div class="pc-banner-spawns">
            <img
              v-for="(spriteId, i) in missionSprites"
              :key="i"
              :src="getAssetUrl(ASSET_TYPES.TRAINER, spriteId)"
              class="pixelated"
              onerror="this.style.display='none'"
            >
          </div>
        </div>

        <!-- 3. Gimnasios -->
        <div
          class="pc-banner legacy-panel"
          @click="emit('openTab', 'gyms')"
        >
          <div class="pc-banner-header">
            <span class="pc-banner-icon">🏆</span>
            <span class="pc-banner-title">GIMNASIOS</span>
          </div>
          <div class="pc-banner-text">
            Tenés <span>{{ gymRematches }}</span> gimnasios por derrotar
          </div>
          <div class="pc-banner-spawns">
            <img
              v-for="(spriteId, i) in gymSprites"
              :key="i"
              :src="getAssetUrl(ASSET_TYPES.TRAINER, spriteId)"
              class="pixelated"
              onerror="this.style.display='none'"
            >
          </div>
        </div>

        <!-- 4. Crianza -->
        <div
          class="pc-banner legacy-panel"
          @click="emit('openTab', 'daycare')"
        >
          <div class="pc-banner-header">
            <span class="pc-banner-icon">🥚</span>
            <span class="pc-banner-title">CRIANZA</span>
          </div>
          <div class="pc-banner-text">
            Tenés <span>{{ eggCount }}</span> huevos esperando
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.map-view-container {
  padding: 0 0 10px;
  width: 100%;
}

.pc-split-container {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  align-items: stretch;

  @media (max-width: 1100px) {
    flex-direction: column;
  }
}

.pc-left {
  flex: 1;
  min-width: 0;
  min-height: 180px;
  display: flex;
  flex-direction: column;
}

.pc-right {
  flex: 1;
  min-width: 0;
}

.pokecenter-banner {
  flex: 1;
  width: 100%;
  border-radius: 20px;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  border-bottom: 3px solid #000;
  overflow: hidden; /* Back to overflow hidden for the background image */
  
  .banner-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center 20%;
    z-index: 0;
  }

  &::after {
    content: '';
    position: absolute;
    inset: -2px -2px 0; // Overlap slightly to prevent bleeding
    background: linear-gradient(to top, #000 0%, rgba(0,0,0,0.9) 45%, transparent 100%);
    z-index: 1;
    pointer-events: none;
    border-radius: 20px;
  }

  &:hover {
    transform: translateY(-4px);
    border-bottom-color: var(--yellow);
  }
}

.banner-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px;
  text-align: left;
  z-index: 2;
}

.banner-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 24px;
  color: white;
  margin-bottom: 4px;
  text-shadow: 0 4px 12px rgba(0,0,0,1);
}

.banner-desc {
  font-size: 11px;
  color: rgba(255,255,255,0.8);
  max-width: 90%;
}

.banner-tag {
  position: absolute;
  top: 15px;
  right: 15px;
  background: #ff3333;
  color: white;
  padding: 6px 12px;
  border-radius: 10px;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  box-shadow: 0 4px 10px rgba(255,51,51,0.3);
  z-index: 2;
}

.pc-banner-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  height: 100%;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.pc-banner {
  background: rgba(255,255,255,0.03);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.05);
  transition: all 0.2s;

  &:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.2);
  }
}

.pc-banner-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.pc-banner-icon { font-size: 14px; }
.pc-banner-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--gray);
}

.pc-banner-text-large {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  line-height: 1.4;
  margin-bottom: 4px;
  color: #ffcc00;
  text-transform: uppercase;
}

.pc-banner-text {
  font-size: 9px;
  font-weight: 700;
  line-height: 1.2;
  color: rgba(255, 255, 255, 0.7);
  
  span { color: var(--yellow); }
}

.pc-banner-spawns {
  position: absolute;
  right: 8px;
  bottom: 6px;
  display: flex;
  gap: -8px;

  img {
    width: 24px;
    height: 24px;
    object-fit: contain;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    
    &:not(:first-child) { margin-left: -10px; }
  }
}

.event-banner {
  &.active {
    border: 1px solid rgba(255, 204, 0, 0.4);
    box-shadow: 0 0 15px rgba(255, 204, 0, 0.1);
    background: linear-gradient(135deg, rgba(255, 204, 0, 0.08) 0%, transparent 100%);
    
    .pc-banner-title { color: #ffcc00; opacity: 0.8; }
    .pc-banner-icon { color: #ffcc00; }
  }
}

.pixelated { image-rendering: pixelated; }

@media (max-width: 1100px) {
  /* Removed rogue global HUD overrides */
}

@media (max-width: 768px) {
  .pc-split-container {
    flex-direction: column;
    height: auto;
  }
  .pc-left {
    flex: 1;
    min-height: 120px;
  }
  .pc-right {
    flex: 1;
  }
  .pc-banner { height: 70px; }
}
</style>
