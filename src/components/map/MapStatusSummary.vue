<script setup>
const props = defineProps({
  missionsRemaining: { type: Number, default: 0 },
  missionSprites: { type: Array, default: () => [] },
  gymRematches: { type: Number, default: 0 },
  gymSprites: { type: Array, default: () => [] },
  eggCount: { type: Number, default: 0 },
  rivalEventActive: { type: Boolean, default: true }, // Default true for demo as in screenshot
  rivalEventText: { type: String, default: 'Doble chance de encuentro con El Rival durante todo el día' }
})

const emit = defineEmits(['openTab', 'openCenter'])
</script>

<template>
  <div class="pc-split-container">
    <!-- Carta Centro Pokémon (Izq: 65%) -->
    <div class="pc-left">
      <div
        class="location-card pokecenter-banner"
        @click="emit('openCenter')"
      >
        <div class="banner-overlay">
          <div class="banner-title">
            CENTRO POKÉMON
          </div>
          <div class="banner-desc">
            Saná a tu equipo y restaurá todos sus PP al instante.
          </div>
        </div>
        <span class="location-tag">🏥 CURACIÓN</span>
      </div>
    </div>

    <!-- Grilla de Status Banners (Der: 35% - Grilla 2x2) -->
    <div class="pc-right">
      <div class="pc-banner-grid">
        <!-- 1. Rival Event (Highlight Card) -->
        <div
          class="pc-banner rival-banner"
          :class="{ active: rivalEventActive }"
        >
          <div class="pc-banner-icon">
            🚨
          </div>
          <div class="pc-banner-content">
            <div class="pc-banner-title">
              ¡EL RIVAL QUIERE PELEAR!
            </div>
            <div class="pc-banner-text">
              {{ rivalEventText }}
            </div>
          </div>
        </div>

        <!-- 2. Guardería -->
        <div
          class="pc-banner"
          @click="emit('openTab', 'daycare')"
        >
          <div class="pc-banner-icon">
            📜
          </div>
          <div class="pc-banner-content">
            <div class="pc-banner-title">
              GUARDERÍA
            </div>
            <div class="pc-banner-text">
              ¡Tenés <span>{{ missionsRemaining }}</span> misiones por hacer!
            </div>
            <div class="pc-banner-spawns">
              <img
                v-for="(src, i) in missionSprites"
                :key="i"
                :src="src"
                onerror="this.style.display='none'"
              >
            </div>
          </div>
        </div>

        <!-- 3. Gimnasios -->
        <div
          class="pc-banner"
          @click="emit('openTab', 'gyms')"
        >
          <div class="pc-banner-icon">
            🏆
          </div>
          <div class="pc-banner-content">
            <div class="pc-banner-title">
              GIMNASIOS
            </div>
            <div class="pc-banner-text">
              Tenés <span>{{ gymRematches || 8 }}</span> gimnasios por derrotar
            </div>
            <div class="pc-banner-spawns">
              <img
                v-for="(src, i) in gymSprites"
                :key="i"
                :src="src"
                onerror="this.style.display='none'"
              >
            </div>
          </div>
        </div>

        <!-- 4. Crianza -->
        <div
          class="pc-banner"
          @click="emit('openTab', 'daycare')"
        >
          <div class="pc-banner-icon">
            🥚
          </div>
          <div class="pc-banner-content">
            <div class="pc-banner-title">
              CRIANZA
            </div>
            <div class="pc-banner-text">
              Tenés <span>{{ eggCount }}</span> huevos esperando
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pc-split-container {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
  align-items: stretch;
}

.pc-left { flex: 1.8; } /* Corrected for ~65% appearance */
.pc-right { flex: 1; }

.pokecenter-banner {
  background-image: url('/assets/pokecenter_banner.png');
  background-size: cover;
  background-position: center;
  border: 2px solid #f69;
  height: 100%;
  min-height: 260px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  border-radius: 18px;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.6);
}

.banner-overlay {
  background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);
  padding: 30px;
}

.banner-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  color: #f69;
  margin-bottom: 15px;
  text-shadow: 0 0 10px rgba(255, 102, 153, 0.3);
}

.banner-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
}

.location-tag {
  position: absolute;
  top: 15px;
  right: 15px;
  background: #f69;
  color: #fff;
  padding: 6px 12px;
  border-radius: 8px;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}

.pc-banner-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 15px;
  height: 100%;
}

.pc-banner {
  display: flex;
  gap: 12px;
  background: var(--bg-card);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 18px;
  padding: 18px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(0,0,0,0.4);
}

.pc-banner:hover {
  background: var(--card2);
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.1);
}

.rival-banner.active {
  border: 1.5px solid var(--yellow);
  box-shadow: 0 0 20px rgba(255, 214, 10, 0.15);
}

.rival-banner.active .pc-banner-title {
  color: var(--yellow);
  text-shadow: 0 0 8px rgba(255, 214, 10, 0.4);
}

.pc-banner-icon { 
  font-size: 26px; 
  display: flex;
  align-items: center;
}

.pc-banner-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.pc-banner-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: #fff;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.pc-banner-text {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.4;
}

.pc-banner-text span {
  color: #fff;
  font-weight: 800;
}

.pc-banner-spawns {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.pc-banner-spawns img {
  width: 26px;
  height: 26px;
  image-rendering: pixelated;
}

@media (max-width: 1280px) {
  .pc-split-container { flex-direction: column; }
  .pc-banner-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .pc-banner-grid { grid-template-columns: 1fr; }
}
</style>
