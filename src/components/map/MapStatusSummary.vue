// [PureVue-Ignore-Length]
<script setup>
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

defineProps({
  missionsRemaining: { type: Number, default: 0 },
  missionSprites: { type: Array, default: () => [] },
  gymRematches: { type: Number, default: 0 },
  gymSprites: { type: Array, default: () => [] },
  eggCount: { type: Number, default: 0 },
  rivalEventActive: { type: Boolean, default: true },
  rivalEventText: { type: String, default: 'Doble chance de encuentro con El Rival durante todo el día' },
  rivalEventIcon: { type: String, default: '⚡' },
  isReady: { type: Boolean, default: false }
})

const emit = defineEmits(['openTab', 'openCenter', 'openEvent'])

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
        @click.stop="emit('openCenter')"
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
          :style="{ '--card-seed': 0.2 }"
          @click.stop="rivalEventActive && emit('openEvent')"
        >
          <div class="pc-banner-icon">
            {{ rivalEventIcon }}
          </div>
          <div class="pc-banner-content-wrapper">
            <div class="pc-banner-title">
              EVENTO
            </div>
            <div class="pc-banner-inner-flex">
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
        </div>

        <!-- 2. Guardería -->
        <div
          class="pc-banner"
          @click.stop="emit('openTab', 'daycare')"
        >
          <div class="pc-banner-icon">
            📜
          </div>
          <div class="pc-banner-content-wrapper">
            <div class="pc-banner-title">
              GUARDERÍA
            </div>
            <div class="pc-banner-inner-flex">
              <div class="pc-banner-text">
                ¡Tenés <span>{{ missionsRemaining }}</span> misiones por hacer!
              </div>
              <div
                v-if="missionSprites.length"
                class="pc-banner-spawns"
              >
                <!-- Limit to 3 sprites + counter if more -->
                <div
                  v-for="(spriteId, i) in missionSprites.slice(0, 3)"
                  :key="i"
                  class="sprite-container"
                >
                  <img
                    :src="getAssetUrl(ASSET_TYPES.TRAINER, spriteId)"
                    class="pixelated"
                    @error="$event.target.style.display = 'none'; $event.target.nextSibling.style.display = 'flex'"
                  >
                  <div
                    class="sprite-fallback"
                    style="display: none;"
                  >
                    👤
                  </div>
                </div>
                <div 
                  v-if="missionSprites.length > 3" 
                  class="sprite-counter"
                >
                  +{{ missionSprites.length - 3 }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Gimnasios -->
        <div
          class="pc-banner"
          @click.stop="emit('openTab', 'gyms')"
        >
          <div class="pc-banner-icon">
            🏆
          </div>
          <div class="pc-banner-content-wrapper">
            <div class="pc-banner-title">
              GIMNASIOS
            </div>
            <div class="pc-banner-inner-flex">
              <div class="pc-banner-text">
                Tenés <span>{{ gymRematches }}</span> gimnasios por derrotar
              </div>
              <div
                v-if="gymSprites.length"
                class="pc-banner-spawns"
              >
                <!-- Limit to 4 sprites + counter -->
                <img
                  v-for="(spriteId, i) in gymSprites.slice(0, 4)"
                  :key="i"
                  :src="getAssetUrl(ASSET_TYPES.TRAINER, spriteId)"
                  class="pixelated"
                  @error="e => e.target.style.display = 'none'"
                >
                <div 
                  v-if="gymSprites.length > 4" 
                  class="sprite-counter"
                >
                  +{{ gymSprites.length - 4 }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Crianza -->
        <div
          class="pc-banner"
          @click.stop="emit('openTab', 'daycare')"
        >
          <div class="pc-banner-icon">
            🥚
          </div>
          <div class="pc-banner-content-wrapper">
            <div class="pc-banner-title">
              CRIANZA
            </div>
            <div class="pc-banner-inner-flex">
              <div class="pc-banner-text">
                Tenés <span>{{ eggCount }}</span> huevos esperando
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.map-view-container {
  padding: 0 0 10px;
  width: 100%;
}

.pc-split-container {
  display: flex;
  gap: 16px;
  margin-bottom: 10px;
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
  box-shadow: 0 10px 40px Rgba(0,0,0,0.6), inset 0 0 15px Rgba(0,0,0,0.5);
  border: 4px solid Rgba(255, 0, 127, 1) !important;
  overflow: hidden; // Crucial para que la imagen siga la curva
  
  .banner-bg {
    position: absolute;
    inset: -5px; // Sangrado profundo para asegurar que cubra debajo del marco
    background-size: cover;
    background-position: center center;
    z-index: calc(var(--z-base) + 1);
    border-radius: 16px; // Ajustado para curva interna (20px - 4px)
    @include pixelated;
    image-rendering: pixelated;
  }


  &::after {
    content: '';
    position: absolute;
    inset: -5px; // Sangrado profundo
    background: Linear-Gradient(to top, $black 0%, Rgba(0,0,0,0.6) 30%, transparent 55%);
    z-index: calc(var(--z-base) + 2);
    pointer-events: none;
    border-radius: 16px;
  }

  &:hover {
    transform: translateY(-6px);
    border-color: var(--yellow) !important;
    box-shadow: 
      0 20px 50px Rgba(0, 0, 0, 0.7), 
      0 0 30px Rgba(255, 214, 10, 0.5);
  }
}

.banner-overlay {
  position: absolute;
  bottom: -2px; // Sangrado leve hacia abajo
  left: -2px;
  right: -2px;
  padding: 24px;
  text-align: left;
  z-index: calc(var(--z-base) + 3);
  border-radius: 0 0 16px 16px;
  background: Linear-Gradient(to top, Rgba(0,0,0,0.4), transparent);
}

.banner-title {
  @include pixelated;
  font-size: 24px;
  font-weight: 700; // Keep titles bold
  color: white;
  margin-bottom: 4px;
  text-shadow: 0 4px 12px Rgba(0,0,0,1);
}

.banner-desc {
  @include pixelated;
  font-size: 8px;
  font-weight: 400 !important; // Remove bold
  color: Rgba(255,255,255,0.8);
  max-width: 90%;
}

.banner-tag {
  position: absolute;
  top: 15px;
  right: 15px;
  background: Rgba(255, 51, 51, 1);
  color: var(--white);
  padding: 6px 12px;
  border-radius: 10px;
  @include pixelated;
  font-size: 8px;
  box-shadow: 0 4px 10px Rgba(255,51,51,0.3);
  z-index: calc(var(--z-base) + 4);
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
  @include glass-solid(Rgba(15, 23, 42, 0.95));
  border-radius: 16px;
  padding: 12px 16px; // Reduced vertical padding
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 85px;
  
  border: 1px solid Rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 8px 30px Rgba(0, 0, 0, 0.5), 
    inset 0 1px 1px Rgba(255, 255, 255, 0.12),
    inset 0 -1px 2px Rgba(0, 0, 0, 0.3);
  
  transform: TranslateZ(0);
  backface-visibility: hidden;
  will-change: transform, background;

  &:hover {
    background: Rgba(255, 255, 255, 0.12);
    border-color: var(--yellow);
    box-shadow: 
      0 0 0 1px var(--yellow), 
      0 12px 30px Rgba(0, 0, 0, 0.6), 
      0 0 20px Rgba(255, 214, 10, 0.4);
    transform: translateY(-4px);
    z-index: calc(var(--z-base) + 5);
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: Linear-Gradient(180deg, Rgba(255,255,255,0.08), Rgba(255,255,255,0.01));
    -webkit-mask: Linear-Gradient(var(--white) 0 0) content-box, Linear-Gradient(var(--white) 0 0);
    mask: Linear-Gradient(var(--white) 0 0) content-box, Linear-Gradient(var(--white) 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
}

.pc-banner-icon {
  width: 44px;
  height: 44px;
  @include flex-center;
  background: Rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  font-size: 24px;
  flex-shrink: 0;
  box-shadow: inset 0 0 10px Rgba(0,0,0,0.3);
}

.pc-banner-content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.pc-banner-title {
  @include pixelated;
  font-size: 8px;
  font-weight: 700; // Keep titles bold
  color: var(--gray);
  text-transform: uppercase;
  @include pixelated;
  letter-spacing: 1px;
  white-space: normal; // Allow wrapping if extremely tight
}

.pc-banner-inner-flex {
  display: flex;
  flex-wrap: wrap; // CRITICAL FOR FLUID LAYOUT
  align-items: center;
  gap: 8px;
  width: 100%;
}

.pc-banner-text {
  @include pixelated;
  font-size: 8px;
  font-weight: 400 !important; // Remove bold
  line-height: 1.4;
  color: var(--white);
  flex: 1 1 180px; 
  min-width: 0;
  white-space: normal; // Ensure wrapping
  word-break: break-word;
  
  span { 
    color: var(--yellow);
    font-weight: normal !important;
  }
  
  .text-highlight { 
    color: var(--yellow); 
    @include pixelated;
    font-size: 8px !important; // Match base text size
    font-weight: normal !important;
    display: block;
    margin-bottom: 4px;
    white-space: normal;
  }
}

.pc-banner-spawns {
  display: flex;
  align-items: center;
  margin-left: auto; // Push to right if sharing row
  min-height: 32px;
  flex-shrink: 0;
  gap: 8px;

  .sprite-container {
    position: relative;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    filter: Drop-Shadow(0 4px 6px Rgba(0,0,0,0.4));
  }

  img {
    width: 32px; 
    height: 32px;
    object-fit: contain;
    @include sprite-render;
    transition: none !important;
    transform: TranslateZ(0);
  }

  .sprite-fallback {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    background: Rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    color: $muted;
  }

  .sprite-counter {
    margin-left: 4px;
    @include pixelated;
    font-size: 8px;
    color: var(--yellow);
    background: Rgba(0, 0, 0, 0.4);
    padding: 4px 6px;
    border-radius: 6px;
    border: 1px solid Rgba(255, 217, 61, 0.2);
    @include pixelated;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
  }
}

.event-banner {
  &.active {
    background: Linear-Gradient(135deg, 
      Rgba(255, 214, 10, 0.2) 0%, 
      Rgba(15, 23, 42, 0.95) 100%
    ) !important;
    border-color: Rgba(255, 214, 10, 0.8) !important;
    box-shadow: 
      0 10px 30px Rgba(0, 0, 0, 0.6),
      0 0 20px Rgba(255, 214, 10, 0.25);
    
    .pc-banner-title { color: var(--yellow); opacity: 1; }
    .pc-banner-icon { 
      background: Rgba(255, 214, 10, 0.3);
      color: var(--yellow); 
      box-shadow: 0 0 15px Rgba(255, 214, 10, 0.4);
    }

    &::after {
      background: Linear-Gradient(180deg, Rgba(255, 214, 10, 0.3), Rgba(255, 214, 10, 0.05));
    }

    &:hover {
      background: Linear-Gradient(135deg, 
        Rgba(255, 214, 10, 0.3) 0%, 
        Rgba(30, 41, 59, 0.95) 100%
      ) !important;
      border-color: var(--yellow) !important;
      box-shadow: 
        0 0 0 2px var(--yellow), 
        0 15px 40px Rgba(0, 0, 0, 0.7), 
        0 0 35px Rgba(255, 214, 10, 0.6);
    }
  }
}

.pixelated { 
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  image-rendering: -webkit-optimize-contrast;
  -ms-interpolation-mode: nearest-neighbor;
}

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
