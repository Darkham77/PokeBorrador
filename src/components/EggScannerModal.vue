<script setup lang="ts">
import { sleep } from '@/logic/timeUtils'

import { ref, computed } from 'vue'
import { POKEMON_DB } from '@/data/pokemonDB'
import { useGameStore } from '@/stores/game'
import { useBreedingStore } from '@/stores/breeding'
import type { DaycareEgg } from '@/types/breeding'
import type { PokemonEgg, PokemonIVs } from '@/types/pokemon'

interface IVs extends PokemonIVs {
  [key: string]: number | boolean | undefined
}

// Extensión de PokemonEgg para soportar campos de escaneo del inventario
interface ScannedPokemonEgg extends PokemonEgg {
  scanned?: boolean
  predictedInfo?: {
    name: string
    ivTotal: number
  }
}

type EggItem = {
  type: 'inventory'
  data: ScannedPokemonEgg 
  id: number
  species: string
} | {
  type: 'daycare'
  data: DaycareEgg
  id: string
  species: string
}

type ScanningResult = EggItem & {
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
    data: e as ScannedPokemonEgg, 
    id: idx,
    species: e.id || ''
  }))
  
  const daycareEggs = (breedingStore.warehouseEggs || []).map((e: DaycareEgg) => {
    return { 
      type: 'daycare' as const, 
      data: e, 
      id: e.id,
      species: e.species
    }
  })
  
  return [...inventoryEggs, ...daycareEggs]
})

const scanEgg = async (egg: EggItem) => {
  isScanning.value = true
  // Simulate scanning delay
  await sleep(800)
  
  const ivs = (egg.data.ivs || {}) as IVs
  const totalIV = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)
  
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
    const eggs = (gameStore.state.eggs || []) as ScannedPokemonEgg[]
    const egg = eggs[res.id as number]
    if (egg) {
      egg.scanned = true
      egg.predictedInfo = { 
          name: (POKEMON_DB as Record<string, { name: string }>)[res.species]?.name || res.species, 
          ivTotal: res.totalIV 
      }
    }
    await gameStore.scheduleSave()
  } else {
    const newIvs = { ...res.ivs, _scanned: true, _predictedTotalIV: res.totalIV }
    await breedingStore.updateEggIvs(String(res.id), newIvs)
  }
  
  const win = window as unknown as { __VITE_DEBUG__?: boolean }
  if (win.__VITE_DEBUG__) console.log('Egg scanned and saved', res)
  
  scanningResult.value = null
}

const handleSell = async () => {
  if (!scanningResult.value) return
  if (!confirm('¿Seguro que quieres vender este huevo?')) return
  
  const res = scanningResult.value
  if (res.type === 'inventory') {
    const eggs = (gameStore.state.eggs || [])
    eggs.splice(res.id as number, 1)
  } else {
    await breedingStore.deleteEgg(String(res.id))
  }
  
  gameStore.state.money += res.sellPrice
  await gameStore.scheduleSave()
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
          <div class="egg-list custom-scrollbar">
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
                  {{ (POKEMON_DB as Record<string, { name: string }>)[egg.species]?.name || 'Huevo' }}
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
                {{ (POKEMON_DB as Record<string, { name: string }>)[scanningResult.species]?.name }} 
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

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.scanner-overlay {
  position: fixed;
  inset: 0;
  background: Rgba(0, 0, 0, 0.85);
  backdrop-filter: Blur(8px);
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
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
  h3 {
    @include pixelated;
    font-size: 11px; color: #a855f7; margin: 0;
  }
}

.close-btn { background: none; border: none; color: Rgba(255, 255, 255, 0.4); font-size: 20px; cursor: pointer; }

.scanner-body { padding: 24px; position: relative; }

.guide-text { font-size: 11px; color: Rgba(255, 255, 255, 0.4); margin-bottom: 20px; text-align: center; }

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
  &:hover { background: Rgba(168, 85, 247, 0.1); border-color: Rgba(168, 85, 247, 0.3); }
}

.egg-icon { font-size: 24px; }
.egg-info { flex: 1; }
.egg-name { font-size: 12px; font-weight: 800; color: white; display: flex; align-items: center; gap: 8px; }
.egg-status { font-size: 9px; color: Rgba(255, 255, 255, 0.4); margin-top: 4px; }

.badge { font-size: 8px; padding: 2px 6px; border-radius: 4px; color: white; }
.badge.inventory { background: var(--blue); }
.badge.daycare { background: var(--purple); }

.result-view { animation: fadeIn 0.3s ease; display: flex; flex-direction: column; gap: 20px; }

.result-header { text-align: center; }
.big-egg { font-size: 48px; margin-bottom: 12px; }
.result-title { font-size: 18px; font-weight: 900; color: white; }

.stats-card {
  background: Rgba(0,0,0,0.3);
  border: 1px solid Rgba(255,255,255,0.1);
  border-radius: 16px; padding: 15px;
}

.iv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
.iv-item { font-size: 10px; color: white; font-family: monospace; span { color: Rgba(255, 255, 255, 0.4); } }

.total-bar {
  border-top: 1px solid Rgba(255,255,255,0.1);
  padding-top: 12px;
  display: flex; justify-content: space-between; align-items: center;
  .label { font-size: 9px; color: Rgba(255, 255, 255, 0.4); font-weight: 700; }
  .value { font-size: 14px; font-weight: 900; color: #22c55e; }
}

.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.keep-btn {
  @include btn-vicio('success', 'md');
}

.sell-btn {
  @include btn-vicio('warning', 'md');
}

.back-link {
  background: none; border: none; color: Rgba(255, 255, 255, 0.4); 
  font-size: 10px; cursor: pointer; text-decoration: underline; margin-top: 10px;
}

.loading-overlay {
  position: absolute; inset: 0; background: Rgba(26, 26, 46, 0.95);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px;
  span { font-size: 10px; @include pixelated; color: #a855f7; }
}

.loader {
  width: 40px; height: 40px; border: 4px solid Rgba(168, 85, 247, 0.1);
  border-top: 4px solid #a855f7; border-radius: 50%; animation: spin 1s linear infinite;
}

@keyframes spin { 100% { transform: Rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; transform: Translatey(10px); } to { opacity: 1; transform: Translatey(0); } }

.empty-state { text-align: center; padding: 40px; color: Rgba(255, 255, 255, 0.4); font-size: 12px; }
</style>
