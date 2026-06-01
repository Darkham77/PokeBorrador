<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBreedingStore } from '@/stores/breeding'
import { useGameStore } from '@/stores/game'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { calculateCloningCost, calculateCloningShinyChance } from '@/logic/minigames/minigameMath'
import EggSprite from '@/components/common/EggSprite.vue'

const breedingStore = useBreedingStore()
const gameStore = useGameStore()

// Fossil definitions
const FOSSILS = [
  { name: 'Fósil Domo', sprite: 'dome-fossil', pokemon: 'Kabuto' },
  { name: 'Fósil Hélix', sprite: 'helix-fossil', pokemon: 'Omanyte' },
  { name: 'Ámbar Viejo', sprite: 'old-amber', pokemon: 'Aerodactyl' }
]

const defaultFossil = { name: 'Fósil Domo', sprite: 'dome-fossil', pokemon: 'Kabuto' }
const selectedFossilIndex = ref(0)
const extraSacrifices = ref(0)

const activeFossil = computed<{ name: string; sprite: string; pokemon: string }>(() => {
  const f = FOSSILS[selectedFossilIndex.value]
  return f ? f : defaultFossil
})

const ownedCount = computed(() => {
  if (!gameStore.state?.inventory) return 0
  return gameStore.state.inventory[activeFossil.value.name] || 0
})

const selectFossil = (idx: number) => {
  selectedFossilIndex.value = idx
  extraSacrifices.value = 0
}

const selectSacrifices = (val: number) => {
  extraSacrifices.value = val
}

const cost = computed(() => calculateCloningCost(extraSacrifices.value))
const requiredFossils = computed(() => 1 + extraSacrifices.value)

const hasEnoughFossils = computed(() => ownedCount.value >= requiredFossils.value)
const hasEnoughMoney = computed(() => gameStore.state.money >= cost.value)

const canClone = computed(() => {
  return hasEnoughFossils.value && hasEnoughMoney.value
})

const handleClone = () => {
  if (!canClone.value) return
  breedingStore.cloneFossil(activeFossil.value.name, extraSacrifices.value)
  extraSacrifices.value = 0 // Reset
}

// Data table helper
const CLONING_TIERS = Array.from({ length: 6 }, (_, N) => {
  const c = calculateCloningCost(N)
  const baseRolls = 1 + Math.floor(N / 2)
  const isOdd = N % 2 !== 0
  const rollsText = isOdd ? `${baseRolls}-${baseRolls + 1}` : `${baseRolls}`
  const shinyRate = calculateCloningShinyChance(N)
  const mult = 1 + 0.25 * N
  return {
    N,
    cost: c,
    rolls: rollsText,
    shinyPercent: (shinyRate * 100).toFixed(4),
    multiplier: `${mult.toFixed(2)}x`
  }
})
</script>

<template>
  <div class="fossil-cloning">
    <header class="cloning-header">
      <div class="info">
        <h3>Almacén de Arqueología</h3>
        <p>Combina múltiples fósiles del mismo tipo para obtener variantes de calidad genética superior</p>
      </div>
    </header>

    <div class="cloning-body">
      <!-- Top: Fossil Selection -->
      <div class="fossil-selector">
        <span class="section-label">1. SELECCIONAR FÓSIL BASE</span>
        <div class="fossil-cards">
          <div
            v-for="(fossil, idx) in FOSSILS"
            :key="fossil.name"
            class="fossil-card"
            :class="{ active: selectedFossilIndex === idx }"
            @click="selectFossil(idx)"
          >
            <div class="fossil-icon-wrapper">
              <img
                :src="getAssetUrl(ASSET_TYPES.ITEM, fossil.sprite)"
                :alt="fossil.name"
                class="fossil-sprite"
              >
              <div 
                class="fossil-count"
                :class="{ empty: !((gameStore.state?.inventory?.[fossil.name] || 0) > 0) }"
              >
                {{ gameStore.state?.inventory?.[fossil.name] || 0 }}
              </div>
            </div>
            <div class="fossil-info">
              <div class="fossil-title">
                {{ fossil.name }}
              </div>
              <div class="fossil-result">
                ADN: {{ fossil.pokemon }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Configurations & Interactive Matrix Table -->
      <div class="cloning-panel">
        <span class="section-label">2. CONFIGURAR MEZCLA GENÉTICA (SELECCIONAR FILA)</span>
        
        <!-- Preview Target -->
        <div class="cloning-target-preview">
          <div class="egg-preview-box">
            <EggSprite
              tint="rgba(139, 90, 43, 0.7)"
              size="48"
            />
          </div>
          <div class="preview-text">
            <h4>Huevo Ancestral de {{ activeFossil.pokemon }}</h4>
            <p>Huevo marrón especial con genes prehistóricos modificados.</p>
          </div>
        </div>

        <!-- Data Matrix Table -->
        <div class="matrix-table-container custom-scrollbar-vicio">
          <table class="matrix-table">
            <thead>
              <tr>
                <th>Fósiles</th>
                <th>Intentos IVs</th>
                <th>Prob. Shiny</th>
                <th>Costo (₽)</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="tier in CLONING_TIERS"
                :key="tier.N"
                class="matrix-row"
                :class="{ 
                  active: extraSacrifices === tier.N,
                  disabled: ownedCount < (1 + tier.N)
                }"
                @click="selectSacrifices(tier.N)"
              >
                <td class="font-pixel">
                  {{ 1 + tier.N }}
                </td>
                <td class="font-pixel text-center">
                  {{ tier.rolls }}
                </td>
                <td class="font-pixel shiny-cell">
                  {{ tier.shinyPercent }}% <span class="mult-label">{{ tier.multiplier }}</span>
                </td>
                <td class="font-pixel cost-cell">
                  ₽{{ tier.cost.toLocaleString() }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Status & Validation Details -->
        <div class="status-summary-bar">
          <div class="status-item">
            <span class="lbl">Fósiles requeridos:</span>
            <span
              class="val font-pixel"
              :class="{ 'error-text': !hasEnoughFossils }"
            >
              {{ requiredFossils }} / {{ ownedCount }}
            </span>
          </div>
          <div class="status-item">
            <span class="lbl">Costo total:</span>
            <span
              class="val font-pixel"
              :class="{ 'error-text': !hasEnoughMoney }"
            >
              ₽{{ cost.toLocaleString() }} / ₽{{ gameStore.state.money.toLocaleString() }}
            </span>
          </div>
        </div>

        <!-- Action Button -->
        <button
          class="btn-clone"
          :disabled="!canClone"
          @click="handleClone"
        >
          <span v-if="!hasEnoughFossils"><span class="icon">❌</span> FÓSILES INSUFICIENTES</span>
          <span v-else-if="!hasEnoughMoney"><span class="icon">💰</span> DINERO INSUFICIENTE</span>
          <span v-else><span class="icon">🧬</span> INICIAR CLONACIÓN GENÉTICA</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.fossil-cloning {
  padding: 10px 0;
}

.cloning-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
  
  h3 {
    @include pixelated;
    font-size: 10px;
    color: var(--daycare-pink, #ff3366);
    margin-bottom: 6px;
  }
  p {
    font-size: 12px;
    color: var(--gray, #94a3b8);
    max-width: 500px;
    line-height: 1.4;
  }
}

.cloning-body {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.section-label {
  font-family: var(--font-pixel);
  font-size: 8px;
  color: var(--gray);
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  display: block;
  text-transform: uppercase;
}

.fossil-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fossil-card {
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: Rgba(255, 255, 255, 0.04);
    border-color: Rgba(202, 138, 4, 0.3);
    transform: Translatey(-2px);
  }

  &.active {
    background: Rgba(202, 138, 4, 0.08);
    border-color: Rgba(202, 138, 4, 0.5);
    box-shadow: 0 0 12px Rgba(202, 138, 4, 0.15);
  }
}

.fossil-icon-wrapper {
  position: relative;
  width: 52px;
  height: 52px;
  background: Rgba(0, 0, 0, 0.25);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .fossil-sprite {
    width: 32px;
    height: 32px;
    object-fit: contain;
    @include sprite-render;
  }

  .fossil-count {
    position: absolute;
    bottom: -4px;
    right: -4px;
    background: #ca8a04;
    color: #fff;
    font-family: var(--font-pixel);
    font-size: 7px;
    padding: 2px 5px;
    border-radius: 4px;
    line-height: 1;
    border: 1px solid Rgba(0, 0, 0, 0.5);

    &.empty {
      background: #475569;
    }
  }
}

.fossil-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  white-space: nowrap;

  .fossil-title {
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
  }

  .fossil-result {
    font-size: 11px;
    color: var(--gray);
    white-space: nowrap;
  }
}

.cloning-panel {
  background: Rgba(0, 0, 0, 0.15);
  border: 1px solid Rgba(255, 255, 255, 0.04);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cloning-target-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 14px;

  .egg-preview-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    filter: Drop-Shadow(0 4px 6px Rgba(0, 0, 0, 0.35));
  }

  .preview-text {
    h4 {
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 4px;
    }
    p {
      font-size: 11px;
      color: var(--gray);
    }
  }
}

/* Interactive Matrix Table */
.matrix-table-container {
  border: 1px solid Rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  overflow: hidden;
  background: Rgba(0, 0, 0, 0.2);
}

.matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  table-layout: fixed;

  th {
    background: Rgba(255, 255, 255, 0.03);
    color: var(--gray);
    font-family: var(--font-pixel);
    font-size: 8px;
    padding: 12px 14px;
    border-bottom: 1px solid Rgba(255, 255, 255, 0.06);
    text-transform: uppercase;
    white-space: nowrap;

    &:nth-child(1) { width: 15%; text-align: left; }
    &:nth-child(2) { width: 25%; text-align: center; }
    &:nth-child(3) { width: 35%; text-align: center; }
    &:nth-child(4) { width: 25%; text-align: right; }
  }

  td {
    padding: 12px 14px;
    border-bottom: 1px solid Rgba(255, 255, 255, 0.03);
    color: #fff;
    white-space: nowrap;
    vertical-align: middle;

    &:nth-child(1) { text-align: left; }
    &:nth-child(2) { text-align: center; }
    &:nth-child(3) { text-align: center; }
    &:nth-child(4) { text-align: right; }
  }
}

.matrix-row {
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(.disabled) {
    background: Rgba(255, 255, 255, 0.03);
  }

  &.active {
    background: Rgba(202, 138, 4, 0.12) !important;
    box-shadow: inset 3px 0 0 #ca8a04;

    td {
      color: #fff;
      font-weight: 700;
    }

    .mult-label {
      background: Rgba(191, 90, 242, 0.25);
      color: #bf5af2;
    }

    .cost-cell {
      color: #ffd60a;
    }
  }

  &.disabled {
    opacity: 0.35;
    background: Rgba(0, 0, 0, 0.1);

    .cost-cell {
      color: var(--gray);
    }
  }
}

.shiny-cell {
  color: #bf5af2;

  .mult-label {
    font-size: 8px;
    background: Rgba(255, 255, 255, 0.05);
    padding: 2px 4px;
    border-radius: 4px;
    margin-left: 6px;
    color: var(--gray);
    display: inline-block;
  }
}

.cost-cell {
  color: #ca8a04;
}

/* Status summary & verification details */
.status-summary-bar {
  display: flex;
  justify-content: space-between;
  background: Rgba(0, 0, 0, 0.2);
  border: 1px dashed Rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 16px;

  .status-item {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .lbl {
      font-size: 10px;
      color: var(--gray);
      text-transform: uppercase;
      font-family: var(--font-pixel);
      font-size: 7px;
    }

    .val {
      font-size: 14px;
      font-weight: 700;
      color: #fff;

      &.error-text {
        color: #ff453a;
        text-shadow: 0 0 6px Rgba(255, 69, 58, 0.2);
      }
    }
  }
}

.btn-clone {
  @include btn-vicio('primary', 'md', true);
}
</style>
