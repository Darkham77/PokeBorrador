<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { SHOP_ITEMS } from '@/data/items'

const uiStore = useUIStore()

const step = ref(0) // 0: initial, 1: glowing, 2: flash, 3: revealed

const fossilData = computed(() => uiStore.activeFossil)
const pokemon = computed(() => fossilData.value?.pokemon)
const itemName = computed(() => fossilData.value?.itemName)

const itemSprite = computed(() => {
  const item = SHOP_ITEMS.find(i => i.name === itemName.value)
  return item ? getAssetUrl(ASSET_TYPES.ITEM, item.sprite) : ''
})

const pokemonSprite = computed(() => {
  if (!pokemon.value) return ''
  return getAssetUrl(ASSET_TYPES.POKEMON, pokemon.value.id, { shiny: pokemon.value.isShiny })
})

onMounted(() => {
  // Sequence Timeline
  setTimeout(() => { step.value = 1 }, 1500)
  
  setTimeout(() => { 
    step.value = 2 // Flash screen
    
    setTimeout(() => {
      step.value = 3 // Reveal!
    }, 400)
    
  }, 4500)
})

function handleClose() {
  uiStore.isFossilRevivalOpen = false
  uiStore.activeFossil = null
}
</script>

<template>
  <div class="fossil-overlay">
    <div class="fossil-stage">
      <div class="header-text">
        RESTAURACIÓN DE ADN
      </div>
      
      <div class="animation-container">
        <!-- Glow Layer -->
        <div 
          class="fossil-glow"
          :class="[
            { 'step-1': step >= 1 },
            { 'revealed': step === 3 },
            { 'is-shiny': step === 3 && pokemon?.isShiny }
          ]"
        />
        
        <!-- Sprite Layer -->
        <img 
          v-if="step < 3"
          :src="itemSprite" 
          class="fossil-img"
          :class="{ 'step-1': step >= 1 }"
          alt="Fossil"
        >
        <img 
          v-else
          :src="pokemonSprite" 
          class="pokemon-img"
          :class="{ 'is-shiny': pokemon?.isShiny }"
          alt="Pokemon"
        >
      </div>

      <!-- Text Status -->
      <div class="fossil-text">
        <template v-if="step === 0">
          Extrayendo secuencia genética de {{ itemName }}...
        </template>
        <template v-else-if="step === 1 || step === 2">
          ¡Estructura molecular estable! Iniciando reconstrucción...
        </template>
        <template v-else-if="step === 3">
          <span class="success-label">¡ÉXITO TOTAL!</span><br>
          <span class="pokemon-name">{{ pokemon?.name.toUpperCase() }} <span v-if="pokemon?.isShiny">✨</span></span>
        </template>
      </div>

      <!-- Stats Card (Only on step 3) -->
      <div
        v-if="step === 3 && pokemon"
        class="stats-card"
      >
        <div class="stat-row nature-row">
          <span class="label">NATURALEZA</span>
          <span class="value">{{ pokemon.nature }}</span>
        </div>
        <div class="stat-row ability-row">
          <span class="label">HABILIDAD</span>
          <span class="value">{{ pokemon.ability }}</span>
        </div>
        
        <div class="ivs-grid">
          <div class="iv-box">
            <span class="iv-lbl">HP</span>
            <span
              class="iv-val"
              :class="{'perfect': pokemon.ivs.hp >= 30, 'good': pokemon.ivs.hp >= 20}"
            >{{ pokemon.ivs.hp }}</span>
          </div>
          <div class="iv-box">
            <span class="iv-lbl">ATK</span>
            <span
              class="iv-val"
              :class="{'perfect': pokemon.ivs.atk >= 30, 'good': pokemon.ivs.atk >= 20}"
            >{{ pokemon.ivs.atk }}</span>
          </div>
          <div class="iv-box">
            <span class="iv-lbl">DEF</span>
            <span
              class="iv-val"
              :class="{'perfect': pokemon.ivs.def >= 30, 'good': pokemon.ivs.def >= 20}"
            >{{ pokemon.ivs.def }}</span>
          </div>
          <div class="iv-box">
            <span class="iv-lbl">SPA</span>
            <span
              class="iv-val"
              :class="{'perfect': pokemon.ivs.spa >= 30, 'good': pokemon.ivs.spa >= 20}"
            >{{ pokemon.ivs.spa }}</span>
          </div>
          <div class="iv-box">
            <span class="iv-lbl">SPD</span>
            <span
              class="iv-val"
              :class="{'perfect': pokemon.ivs.spd >= 30, 'good': pokemon.ivs.spd >= 20}"
            >{{ pokemon.ivs.spd }}</span>
          </div>
          <div class="iv-box">
            <span class="iv-lbl">SPE</span>
            <span
              class="iv-val"
              :class="{'perfect': pokemon.ivs.spe >= 30, 'good': pokemon.ivs.spe >= 20}"
            >{{ pokemon.ivs.spe }}</span>
          </div>
        </div>
        
        <div class="destination-text">
          Enviado a: {{ fossilData.sentTo === 'team' ? 'Equipo' : 'PC' }}
        </div>
        
        <button
          class="continue-btn"
          @click="handleClose"
        >
          CONTINUAR
        </button>
      </div>
    </div>

    <!-- White Flash Layer -->
    <div
      v-if="step === 2"
      class="flash-layer"
    />
  </div>
</template>

<style scoped lang="scss">
.fossil-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(0, 0, 0, 0.96);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.5s ease;
  transform: translateZ(0);
}

.fossil-stage {
  text-align: center;
  transition: all 0.5s;
  max-width: 400px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header-text {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: var(--yellow, #ffd93d);
  margin-bottom: 30px;
  letter-spacing: 2px;
  text-shadow: 0 0 15px rgba(255, 217, 61, 0.5);
}

.animation-container {
  position: relative;
  width: 180px;
  height: 180px;
  margin: 0 auto 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fossil-glow {
  position: absolute;
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, var(--yellow, #ffd93d) 0%, transparent 70%);
  opacity: 0;
  border-radius: 50%;
  filter: blur(15px);
  transition: all 2s ease-in-out;
  
  &.step-1 {
    opacity: 1;
    transform: Scale(3);
  }
  
  &.revealed {
    background: radial-gradient(circle, #fff 0%, transparent 70%);
  }
  
  &.is-shiny {
    background: radial-gradient(circle, gold 0%, transparent 70%);
  }
}

.fossil-img {
  width: 100px;
  height: 100px;
  object-fit: contain;
  image-rendering: pixelated;
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 0 15px rgba(0,0,0,0.8));
  transition: all 1s;
  
  &.step-1 {
    animation: itemPulse 1s infinite alternate;
  }
}

.pokemon-img {
  width: 180px;
  height: 180px;
  object-fit: contain;
  image-rendering: pixelated;
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 0 30px rgba(255,255,255,0.6));
  animation: bounce 2s infinite;
  
  &.is-shiny {
    filter: drop-shadow(0 0 30px gold);
  }
}

.fossil-text {
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  height: 60px;
  line-height: 1.4;
}

.success-label {
  font-size: 11px;
  color: var(--gray, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.pokemon-name {
  font-size: 26px;
  color: var(--yellow, #ffd93d);
  text-shadow: 0 0 20px rgba(255, 217, 61, 0.7);
  font-weight: 900;
}

/* Stats Card */
.stats-card {
  margin-top: 30px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 20px;
  width: 100%;
  animation: slideUp 0.6s cubic-bezier(0.18, 0.89, 0.32, 1.28) backwards;
  backdrop-filter: blur(5px);
}

.stat-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 10px;
  
  .label { color: var(--gray, #9ca3af); font-size: 10px; font-family: 'Press Start 2P'; }
  .value { color: #fff; font-weight: 800; font-size: 14px; }
}

.ivs-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  background: rgba(0,0,0,0.4);
  border-radius: 12px;
  padding: 10px;
  margin-bottom: 15px;
}

.iv-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  
  .iv-lbl { font-size: 9px; color: var(--gray); font-family: 'Press Start 2P'; margin-bottom: 4px; }
  .iv-val { font-size: 14px; font-weight: 800; color: #fff; }
  .perfect { color: #fbbf24; }
  .good { color: #60a5fa; }
}

.destination-text {
  font-size: 12px;
  color: var(--gray);
  margin-bottom: 15px;
  font-style: italic;
}

.continue-btn {
  width: 100%;
  background: var(--blue, #3b82f6);
  color: #fff;
  border: none;
  padding: 14px;
  border-radius: 12px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #2563eb;
    transform: translateY(-2px);
  }
}

.flash-layer {
  position: absolute;
  inset: 0;
  background: #fff;
  z-index: 10;
  animation: flash 0.4s ease-out forwards;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes itemPulse { from { transform: Scale(1); filter: drop-shadow(0 0 15px rgba(255,217,61,0.5)); } to { transform: Scale(1.1); filter: drop-shadow(0 0 25px rgba(255,217,61,0.9)); } }
@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes flash { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 0; } }
@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
