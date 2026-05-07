<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBreedingStore } from '@/stores/breeding'
import type { PokemonEgg } from '@/types/pokemon'

interface IVs {
  hp: number
  atk: number
  def: number
  spa: number
  spd: number
  spe: number
  [key: string]: number | boolean | undefined
}

interface EggItem {
  type: 'inventory' | 'daycare'
  data: PokemonEgg & { inherited_ivs?: IVs, pokemonId?: string, species?: string, scanned?: boolean, predictedInfo?: { name: string, ivTotal: number } }
  id: string | number
  species: string
}

interface ScanningResult extends EggItem {
  totalIV: number
  sellPrice: number
  ivs: IVs
  isShiny: boolean
}

interface Props {
  isOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()
const breedingStore = useBreedingStore()

const scanningResult = ref<ScanningResult | null>(null)
const isScanning = ref(false)

const allEggs = computed<EggItem[]>(() => {
  const inventoryEggs = (gameStore.state.eggs || []).map((e, idx) => ({ 
    type: 'inventory' as const, 
    data: e as any, 
    id: idx,
    species: e.pokemonId || e.id
  }))
  
  const daycareEggs = (breedingStore.eggs || []).map(e => ({ 
    type: 'daycare' as const, 
    data: e as any, 
    id: e.uid || (e as any).egg_id,
    species: e.id || (e as any).species
  }))
  
  return [...inventoryEggs, ...daycareEggs]
})

const scanEgg = async (egg: EggItem) => {
  isScanning.value = true
  // Simulate scanning delay for "wow" effect
  await new Promise(r => setTimeout(r, 800))
  
  const ivs = (egg.data.inherited_ivs || {}) as IVs
  const totalIV = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)
  
  // Basic calculation for selling price (parity with legacy)
  const sellPrice = 1000 + Math.floor((totalIV / 186) * 4000)
  
  scanningResult.value = {
    ...egg,
    totalIV,
    sellPrice,
    ivs,
    isShiny: !!(egg.data.isShiny)
  }
  isScanning.value = false
}

const handleKeep = async () => {
  if (!scanningResult.value) return
  const res = scanningResult.value
  
  if (res.type === 'inventory') {
    const eggs = gameStore.state.eggs
    const egg = eggs[res.id as number]
    if (egg) {
      (egg as any).scanned = true
      ;(egg as any).predictedInfo = { 
          name: (gameStore as any).POKEMON_DB?.[res.species]?.name || res.species, 
          ivTotal: res.totalIV 
      }
    }
    await gameStore.saveGame(true)
  } else {
    // daycare egg update
    const newIvs = { ...res.ivs, _scanned: true, _predictedTotalIV: res.totalIV }
    await breedingStore.updateEggIvs(res.id as string, newIvs)
  }
  
  ;(window as any).notify?.('Datos registrados.', '📋')
  scanningResult.value = null
}

const handleSell = async () => {
  if (!scanningResult.value) return
  if (!confirm('¿Seguro que quieres vender este huevo?')) return
  
  const res = scanningResult.value
  if (res.type === 'inventory') {
    const eggs = gameStore.state.eggs
    eggs.splice(res.id as number, 1)
  } else {
    await breedingStore.deleteEgg(res.id as string)
  }
  
  gameStore.state.money += res.sellPrice
  ;(window as any).notify?.('Huevo vendido.', '💰')
  await gameStore.saveGame(true)
  scanningResult.value = null
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
          @click.stop="emit('close')"
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
              @click.stop="scanEgg(egg)"
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
                @click.stop="handleKeep"
              >
                REGISTRAR
              </button>
              <button
                class="sell-btn"
                @click.stop="handleSell"
              >
                VENDER (₽{{ scanningResult.sellPrice }})
              </button>
            </div>
            <button
              class="back-link"
              @click.stop="scanningResult = null"
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
@use "@/styles/core/_mixins" as *;
.scanner-overlay {
  position: fixed;
  inset: 0;
  background: Rgba(0, 0, 0, 0.85);
  -webkit-backdrop-filter: Blur(8px);
  backdrop-filter: Blur(8px);
  @include gpu-layer;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  transform: translateZ(0);
}

.scanner-container {
  background: #1a1a2e;
  width: 100%; max-width: 400px;
  border-radius: 24px;
  border: 1px solid Rgba(168, 85, 247, 0.3);
  display: flex; flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 80px Rgba(0,0,0,0.8);
}

.scanner-header {
  padding: 24px;
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid Rgba(168, 85, 247, 0.1);
}

.scanner-header h3 {
  @include pixelated;
  font-size: 11px; color: #a855f7; margin: 0;
}

.close-btn { background: none; border: none; color: var(--gray); font-size: 20px; cursor: pointer; }

.scanner-body { padding: 24px; position: relative; }

.guide-text { font-size: 11px; color: var(--gray); margin-bottom: 20px; text-align: center; }

.egg-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
  min-height: 0;
}

.egg-item {
  background: Rgba(255,255,255,0.04);
  border: 1px solid Rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 12px 16px;
  display: flex; align-items: center; gap: 15px;
  cursor: pointer; transition: 0.2s;
}

.egg-item:hover { background: Rgba(168, 85, 247, 0.1); border-color: Rgba(168, 85, 247, 0.3); }

.egg-icon { font-size: 24px; }
.egg-info { flex: 1; }
.egg-name { font-size: 12px; font-weight: 800; color: $white; display: flex; align-items: center; gap: 8px; }
.egg-status { font-size: 9px; color: var(--gray); margin-top: 4px; }

.badge { font-size: 8px; padding: 2px 6px; border-radius: 4px; color: $white; }
.badge.inventory { background: var(--blue); }
.badge.daycare { background: var(--purple); }

.result-view { animation: fadeIn 0.3s ease; display: flex; flex-direction: column; gap: 20px; }

.result-header { text-align: center; }
.big-egg { font-size: 48px; margin-bottom: 12px; }
.result-title { font-size: 18px; font-weight: 900; color: $white; }

.stats-card {
  background: Rgba(0,0,0,0.3);
  border: 1px solid Rgba(255,255,255,0.1);
  border-radius: 16px; padding: 15px;
}

.iv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
.iv-item { font-size: 10px; color: $white; font-family: monospace; }
.iv-item span { color: var(--gray); }

.total-bar {
  border-top: 1px solid Rgba(255,255,255,0.1);
  padding-top: 12px;
  display: flex; justify-content: space-between; align-items: center;
}
.total-bar .label { font-size: 9px; color: var(--gray); font-weight: 700; }
.total-bar .value { font-size: 14px; font-weight: 900; color: #22c55e; }

.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.keep-btn {
  padding: 14px; background: #22c55e; color: $black; border: none; border-radius: 12px;
  @include pixelated; font-size: 8px; cursor: pointer;
}

.sell-btn {
  padding: 14px; background: Rgba(234, 179, 8, 0.1); color: #eab308; 
  border: 1px solid Rgba(234, 179, 8, 0.3); border-radius: 12px;
  @include pixelated; font-size: 8px; cursor: pointer;
}

.back-link {
  background: none; border: none; color: var(--gray); 
  font-size: 10px; cursor: pointer; text-decoration: underline; margin-top: 10px;
}

.loading-overlay {
  position: absolute; inset: 0; background: Rgba(26, 26, 46, 0.95);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px;
}

.loader {
  width: 40px; height: 40px; border: 4px solid Rgba(168, 85, 247, 0.1);
  border-top: 4px solid #a855f7; border-radius: 50%; animation: spin 1s linear infinite;
}

@keyframes spin { 100% { transform: Rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.empty-state { text-align: center; padding: 40px; color: var(--gray); font-size: 12px; }
</style>