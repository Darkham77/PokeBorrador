<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBreedingStore } from '@/stores/breeding'

const props = defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['close'])

const gameStore = useGameStore()
const breedingStore = useBreedingStore()

const scanningResult = ref(null)
const isScanning = ref(false)

const allEggs = computed(() => {
  const inventoryEggs = (gameStore.state.eggs || []).map((e, idx) => ({ 
    type: 'inventory', 
    data: e, 
    id: idx,
    species: e.pokemonId || e.species
  }))
  
  const daycareEggs = (breedingStore.eggs || []).map(e => ({ 
    type: 'daycare', 
    data: e, 
    id: e.egg_id,
    species: e.species
  }))
  
  return [...inventoryEggs, ...daycareEggs]
})

const scanEgg = async (egg) => {
  isScanning.value = true
  // Simulate scanning delay for "wow" effect
  await new Promise(r => setTimeout(r, 800))
  
  const ivs = egg.data.inherited_ivs || {}
  const totalIV = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)
  
  // Basic calculation for selling price (parity with legacy)
  const sellPrice = 1000 + Math.floor((totalIV / 186) * 4000)
  
  scanningResult.value = {
    ...egg,
    totalIV,
    sellPrice,
    ivs,
    isShiny: egg.data.isShiny || egg.data.shiny_roll
  }
  isScanning.value = false
}

const handleKeep = async () => {
  if (!scanningResult.value) return
  const res = scanningResult.value
  
  if (res.type === 'inventory') {
    const egg = gameStore.state.eggs[res.id]
    if (egg) {
      egg.scanned = true
      egg.predictedInfo = { 
          name: gameStore.POKEMON_DB?.[res.species]?.name || res.species, 
          ivTotal: res.totalIV 
      }
    }
    await gameStore.saveGame(true)
  } else {
    // daycare egg update
    const newIvs = { ...res.ivs, _scanned: true, _predictedTotalIV: res.totalIV }
    await breedingStore.updateEggIvs(res.id, newIvs)
  }
  
  window.notify?.('Datos registrados.', '📋')
  scanningResult.value = null
}

const handleSell = async () => {
  if (!scanningResult.value) return
  if (!confirm('¿Seguro que quieres vender este huevo?')) return
  
  const res = scanningResult.value
  if (res.type === 'inventory') {
    gameStore.state.eggs.splice(res.id, 1)
  } else {
    await breedingStore.deleteEgg(res.id)
  }
  
  gameStore.state.money += res.sellPrice
  window.notify?.('Huevo vendido.', '💰')
  await gameStore.saveGame(true)
  scanningResult.value = null
}

const getSprite = (id, shiny) => {
  return window.getSpriteUrl?.(id, shiny) || ''
}
</script>

<template>
  <div
    v-if="isOpen"
    class="scanner-overlay"
    @click.self="emit('close')"
  >
    <div class="scanner-container">
      <div class="scanner-header">
        <h3>🔍 ESCÁNER DE HUEVOS</h3>
        <button
          class="close-btn"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <div class="scanner-body">
        <template v-if="!scanningResult">
          <p class="guide-text">
            Elegí un huevo para revelar su potencial:
          </p>
          <div class="egg-list">
            <div 
              v-for="egg in allEggs" 
              :key="egg.type + egg.id" 
              class="egg-item"
              @click="scanEgg(egg)"
            >
              <div class="egg-icon">
                🥚
              </div>
              <div class="egg-info">
                <div class="egg-name">
                  <span
                    class="badge"
                    :class="egg.type"
                  >{{ egg.type === 'inventory' ? '🎒 MOCHILA' : '🏠 GUARDERÍA' }}</span>
                  {{ gameStore.POKEMON_DB?.[egg.species]?.name || 'Huevo' }}
                </div>
                <div class="egg-status">
                  Tocar para escanear
                </div>
              </div>
            </div>
            <div
              v-if="allEggs.length === 0"
              class="empty-state"
            >
              No tienes huevos para escanear.
            </div>
          </div>
        </template>

        <template v-else>
          <div
            class="result-view"
            :class="{ scanning: isScanning }"
          >
            <div class="result-header">
              <div class="big-egg">
                🥚
              </div>
              <div class="result-title">
                {{ gameStore.POKEMON_DB?.[scanningResult.species]?.name }} 
                <span v-if="scanningResult.isShiny">✨</span>
              </div>
            </div>

            <div class="stats-card">
              <div class="iv-grid">
                <div class="iv-item">
                  <span>PS:</span> {{ scanningResult.ivs.hp }}/31
                </div>
                <div class="iv-item">
                  <span>ATK:</span> {{ scanningResult.ivs.atk }}/31
                </div>
                <div class="iv-item">
                  <span>DEF:</span> {{ scanningResult.ivs.def }}/31
                </div>
                <div class="iv-item">
                  <span>SPA:</span> {{ scanningResult.ivs.spa }}/31
                </div>
                <div class="iv-item">
                  <span>SPD:</span> {{ scanningResult.ivs.spd }}/31
                </div>
                <div class="iv-item">
                  <span>SPE:</span> {{ scanningResult.ivs.spe }}/31
                </div>
              </div>
              <div class="total-bar">
                <span class="label">TOTAL GENÉTICO:</span>
                <span class="value">{{ scanningResult.totalIV }}/186</span>
              </div>
            </div>

            <div class="actions">
              <button
                class="keep-btn"
                @click="handleKeep"
              >
                REGISTRAR
              </button>
              <button
                class="sell-btn"
                @click="handleSell"
              >
                VENDER (₽{{ scanningResult.sellPrice }})
              </button>
            </div>
            <button
              class="back-link"
              @click="scanningResult = null"
            >
              Volver a la lista
            </button>
          </div>
        </template>

        <div
          v-if="isScanning"
          class="loading-overlay"
        >
          <div class="loader" />
          <span>ANALIZANDO GENÉTICA...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scanner-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(8px);
  z-index: 10002;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}

.scanner-container {
  background: #1a1a2e;
  width: 100%; max-width: 400px;
  border-radius: 24px;
  border: 1px solid rgba(168, 85, 247, 0.3);
  display: flex; flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 80px rgba(0,0,0,0.8);
}

.scanner-header {
  padding: 24px;
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid rgba(168, 85, 247, 0.1);
}

.scanner-header h3 {
  font-family: 'Press Start 2P', monospace;
  font-size: 11px; color: #a855f7; margin: 0;
}

.close-btn { background: none; border: none; color: var(--gray); font-size: 20px; cursor: pointer; }

.scanner-body { padding: 24px; position: relative; }

.guide-text { font-size: 11px; color: var(--gray); margin-bottom: 20px; text-align: center; }

.egg-list { display: flex; flex-direction: column; gap: 10px; max-height: 300px; overflow-y: auto; }

.egg-item {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 12px 16px;
  display: flex; align-items: center; gap: 15px;
  cursor: pointer; transition: 0.2s;
}

.egg-item:hover { background: rgba(168, 85, 247, 0.1); border-color: rgba(168, 85, 247, 0.3); }

.egg-icon { font-size: 24px; }
.egg-info { flex: 1; }
.egg-name { font-size: 12px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 8px; }
.egg-status { font-size: 9px; color: var(--gray); margin-top: 4px; }

.badge { font-size: 8px; padding: 2px 6px; border-radius: 4px; color: #fff; }
.badge.inventory { background: var(--blue); }
.badge.daycare { background: var(--purple); }

.result-view { animation: fadeIn 0.3s ease; display: flex; flex-direction: column; gap: 20px; }

.result-header { text-align: center; }
.big-egg { font-size: 48px; margin-bottom: 12px; }
.result-title { font-size: 18px; font-weight: 900; color: #fff; }

.stats-card {
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px; padding: 15px;
}

.iv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
.iv-item { font-size: 10px; color: #fff; font-family: monospace; }
.iv-item span { color: var(--gray); }

.total-bar {
  border-top: 1px solid rgba(255,255,255,0.1);
  padding-top: 12px;
  display: flex; justify-content: space-between; align-items: center;
}
.total-bar .label { font-size: 9px; color: var(--gray); font-weight: 700; }
.total-bar .value { font-size: 14px; font-weight: 900; color: #22c55e; }

.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.keep-btn {
  padding: 14px; background: #22c55e; color: #000; border: none; border-radius: 12px;
  font-family: 'Press Start 2P', monospace; font-size: 8px; cursor: pointer;
}

.sell-btn {
  padding: 14px; background: rgba(234, 179, 8, 0.1); color: #eab308; 
  border: 1px solid rgba(234, 179, 8, 0.3); border-radius: 12px;
  font-family: 'Press Start 2P', monospace; font-size: 8px; cursor: pointer;
}

.back-link {
  background: none; border: none; color: var(--gray); 
  font-size: 10px; cursor: pointer; text-decoration: underline; margin-top: 10px;
}

.loading-overlay {
  position: absolute; inset: 0; background: rgba(26, 26, 46, 0.95);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px;
}

.loader {
  width: 40px; height: 40px; border: 4px solid rgba(168, 85, 247, 0.1);
  border-top: 4px solid #a855f7; border-radius: 50%; animation: spin 1s linear infinite;
}

@keyframes spin { 100% { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.empty-state { text-align: center; padding: 40px; color: var(--gray); font-size: 12px; }
</style>
