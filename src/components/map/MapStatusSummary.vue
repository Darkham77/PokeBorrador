<script setup>
const props = defineProps({
  missionsRemaining: { type: Number, default: 0 },
  missionSprites: { type: Array, default: () => [] },
  gymRematches: { type: Number, default: 0 },
  gymSprites: { type: Array, default: () => [] },
  eggCount: { type: Number, default: 0 },
  rivalEventActive: { type: Boolean, default: true },
  rivalEventText: { type: String, default: 'Doble chance de encuentro con El Rival durante todo el día' }
})

const emit = defineEmits(['openTab', 'openCenter'])
</script>

<template>
  <div class="pc-split-container">
    <!-- Carta Centro Pokémon (Izq: 65%) -->
    <div class="pc-left">
      <div
        class="pokecenter-banner legacy-panel"
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
        <span class="banner-tag">🏥 CURACIÓN</span>
      </div>
    </div>

    <!-- Grilla de Status Banners (Der: 35%) -->
    <div class="pc-right">
      <div class="pc-banner-grid">
        <!-- 1. Rival Event -->
        <div
          class="pc-banner rival-banner legacy-panel"
          :class="{ active: rivalEventActive }"
        >
          <div class="pc-banner-header">
            <span class="pc-banner-icon">🚨</span>
            <span class="pc-banner-title">EVENTO</span>
          </div>
          <div class="pc-banner-text">
            {{ rivalEventText }}
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
            Misiones: <span>{{ missionsRemaining }}</span>
          </div>
          <div class="pc-banner-spawns">
            <img
              v-for="(src, i) in missionSprites"
              :key="i"
              :src="src"
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
            Rematches: <span>{{ gymRematches || 8 }}</span>
          </div>
          <div class="pc-banner-spawns">
            <img
              v-for="(src, i) in gymSprites"
              :key="i"
              :src="src"
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
            Huevos: <span>{{ eggCount }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pc-split-container {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  height: 240px;
}

.pc-left { flex: 1.8; }
.pc-right { flex: 1; }

.pokecenter-banner {
  background-image: linear-gradient(to top, rgba(0,0,0,0.8), transparent), url('@/assets/ui/banners/pokecenter_banner.webp');
  background-size: cover;
  background-position: center;
  border: 4px solid #f69;
  box-shadow: 0 0 0 4px #000;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  cursor: pointer;
  transition: all 0.1s;
}

.pokecenter-banner:hover {
  filter: Brightness(1.1);
}

.banner-overlay {
  padding: 20px;
}

.banner-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  color: #f69;
  margin-bottom: 10px;
  text-shadow: 2px 2px #000;
}

.banner-desc {
  font-size: 11px;
  color: #ccc;
  line-height: 1.5;
}

.banner-tag {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #f69;
  color: #fff;
  padding: 4px 8px;
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  border: 2px solid #000;
}

.pc-banner-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 10px;
  height: 100%;
}

.pc-banner {
  background: #111;
  border: 4px solid #333;
  box-shadow: 0 0 0 4px #000;
  padding: 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition: all 0.1s;
}

.pc-banner:hover {
  background: #1a1a1a;
  border-color: #444;
}

.rival-banner.active {
  border-color: #ffcc00;
}

.rival-banner.active .pc-banner-title {
  color: #ffcc00;
}

.pc-banner-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}

.pc-banner-icon { font-size: 16px; }

.pc-banner-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: #fff;
}

.pc-banner-text {
  font-size: 9px;
  color: #888;
}

.pc-banner-text span {
  color: #fff;
  font-weight: bold;
}

.pc-banner-spawns {
  display: flex;
  gap: 2px;
  margin-top: 5px;
}

.pc-banner-spawns img {
  width: 24px;
  height: 24px;
}

.pixelated {
  image-rendering: pixelated;
}

@media (max-width: 1280px) {
  .pc-split-container { 
    flex-direction: column; 
    height: auto; 
  }
  .pokecenter-banner { min-height: 200px; }
  .pc-banner-grid { height: auto; }
}
</style>
