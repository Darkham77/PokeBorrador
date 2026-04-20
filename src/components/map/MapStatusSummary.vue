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
        class="pokecenter-banner"
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
          class="pc-banner event-banner"
          :class="{ active: rivalEventActive }"
        >
          <div class="pc-banner-icon">
            ⚡
          </div>
          <div class="pc-banner-content">
            <div class="pc-banner-title">
              EVENTO
            </div>
            <div class="pc-banner-text">
              <span
                v-if="rivalEventActive && rivalEventText.includes(':')"
                class="text-highlight"
              >
                {{ rivalEventText.split(':')[0] }}
              </span>
              {{ rivalEventActive ? (rivalEventText.includes(':') ? rivalEventText.split(':')[1] : rivalEventText) : 'No hay eventos activos' }}
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
          </div>
          <div
            v-if="missionSprites.length"
            class="pc-banner-spawns"
          >
            <img
              v-for="(spriteId, i) in missionSprites"
              :key="i"
              :src="getAssetUrl(ASSET_TYPES.TRAINER, spriteId)"
              class="pixelated"
            >
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
              Tenés <span>{{ gymRematches }}</span> gimnasios por derrotar
            </div>
          </div>
          <div
            v-if="gymSprites.length"
            class="pc-banner-spawns"
          >
            <img
              v-for="(spriteId, i) in gymSprites"
              :key="i"
              :src="getAssetUrl(ASSET_TYPES.TRAINER, spriteId)"
              class="pixelated"
            >
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
  flex: 1.5;
  min-width: 0;
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

.pc-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.pokecenter-banner {
  flex: 1;
  width: 100%;
  border-radius: 20px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 10px 40px rgba(0,0,0,0.6), inset 0 0 15px rgba(0,0,0,0.5);
  border: 4px solid #ff007f !important;
  overflow: hidden; // Crucial para que la imagen siga la curva
  
  .banner-bg {
    position: absolute;
    inset: -5px; // Sangrado profundo para asegurar que cubra debajo del marco
    background-size: cover;
    background-position: center 20%;
    z-index: 0;
    border-radius: 16px; // Ajustado para curva interna (20px - 4px)
  }


  &::after {
    content: '';
    position: absolute;
    inset: -5px; // Sangrado profundo
    background: linear-gradient(to top, #000 0%, rgba(0,0,0,0.85) 35%, transparent 70%);
    z-index: 1;
    pointer-events: none;
    border-radius: 16px;
  }

  &:hover {
    transform: translateY(-6px);
    border-color: var(--yellow) !important;
    box-shadow: 
      0 20px 50px rgba(0, 0, 0, 0.7), 
      0 0 30px rgba(255, 214, 10, 0.5);
  }
}

.banner-overlay {
  position: absolute;
  bottom: -2px; // Sangrado leve hacia abajo
  left: -2px;
  right: -2px;
  padding: 24px;
  text-align: left;
  z-index: 2;
  border-radius: 0 0 16px 16px;
  background: linear-gradient(to top, rgba(0,0,0,0.4), transparent);
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
  // GLASSMORPHISM ENHANCED
  background: linear-gradient(180deg, 
    rgba(30, 41, 59, 0.85) 0%, 
    rgba(15, 23, 42, 0.75) 100%
  );
  -webkit-backdrop-filter: blur(25px);
  backdrop-filter: blur(25px);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 85px;
  
  // MULTI-LAYER REFLECTIONS & CONTRAST
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 8px 30px rgba(0, 0, 0, 0.5), 
    inset 0 1px 1px rgba(255, 255, 255, 0.12),
    inset 0 -1px 2px rgba(0, 0, 0, 0.3);

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: var(--yellow);
    box-shadow: 
      0 0 0 1px var(--yellow), 
      0 12px 30px rgba(0, 0, 0, 0.6), 
      0 0 20px rgba(255, 214, 10, 0.4);
    transform: translateY(-4px);
    z-index: 2;
  }

  // GLOW EFFECT ON THE CONTOUR
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.01));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
}

.pc-banner-icon {
  width: 44px;
  height: 44px;
  @include flex-center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  font-size: 24px;
  flex-shrink: 0;
}

.pc-banner-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.pc-banner-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--gray);
  text-transform: uppercase;
  @include pixelated;
}

.pc-banner-text {
  font-size: 13px; // Matched legacy size
  font-weight: 700;
  line-height: 1.2;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  span { color: var(--yellow); }
  .text-highlight { 
    color: #ffcc00; 
    font-family: 'Press Start 2P', monospace;
    font-size: 9px;
    display: block;
    margin-bottom: 2px;
    @include pixelated;
  }
}

.pc-banner-spawns {
  display: flex;
  align-items: center;
  margin-top: 4px;
  min-height: 48px;

  img {
    width: 48px; // Matched legacy size
    height: 48px;
    object-fit: contain;
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));
    @include pixelated;
    
    &:not(:first-child) { margin-left: -15px; } // Increased overlap
  }
}

.event-banner {
  &.active {
    background: linear-gradient(135deg, 
      rgba(255, 214, 10, 0.15) 0%, 
      rgba(15, 23, 42, 0.9) 100%
    );
    border-color: rgba(255, 214, 10, 0.4);
    backdrop-filter: blur(30px);
    
    .pc-banner-title { color: #ffcc00; opacity: 1; }
    .pc-banner-icon { 
      background: rgba(255, 214, 10, 0.15);
      color: #ffcc00; 
      box-shadow: 0 0 15px rgba(255, 214, 10, 0.3);
    }

    &::after {
      background: linear-gradient(180deg, rgba(255,214,10,0.2), rgba(255,214,10,0.02));
    }
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
