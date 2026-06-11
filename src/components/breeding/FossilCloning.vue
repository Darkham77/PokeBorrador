<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useBreedingStore } from '@/stores/breeding'
import { useGameStore } from '@/stores/game'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { calculateCloningCost, calculateCloningShinyChance } from '@/logic/minigames/minigameMath'
import EggSprite from '@/components/common/EggSprite.vue'
import { gsap } from 'gsap'

const breedingStore = useBreedingStore()
const gameStore = useGameStore()

// Fossil definitions
const FOSSILS = [
  { name: 'Fósil Domo', sprite: 'dome_fossil', pokemon: 'Kabuto' },
  { name: 'Fósil Hélix', sprite: 'helix_fossil', pokemon: 'Omanyte' },
  { name: 'Ámbar Viejo', sprite: 'old_amber', pokemon: 'Aerodactyl' }
]

const defaultFossil = { name: 'Fósil Domo', sprite: 'dome_fossil', pokemon: 'Kabuto' }
const selectedFossilIndex = ref(0)
const extraSacrifices = ref(0)

const activeFossil = computed<{ name: string; sprite: string; pokemon: string }>(() => {
  const f = FOSSILS[selectedFossilIndex.value]
  return f ? f : defaultFossil
})

const ownedCount = computed(() => {
  if (!gameStore.state?.inventory) return 0
  return gameStore.state.inventory[activeFossil.value.sprite] || 0
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
  breedingStore.cloneFossil(activeFossil.value.sprite, extraSacrifices.value)
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

// GSAP Hover Handlers for Fossil Cards
const onCardMouseEnter = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  if (!el.classList.contains('active')) {
    gsap.to(el, {
      y: -2,
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      borderColor: 'rgba(202, 138, 4, 0.3)',
      duration: 0.2,
      overwrite: 'auto'
    })
  }
}

const onCardMouseLeave = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  if (!el.classList.contains('active')) {
    gsap.to(el, {
      y: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      borderColor: 'rgba(255, 255, 255, 0.06)',
      duration: 0.2,
      overwrite: 'auto'
    })
  }
}

// GSAP Hover Handlers for Matrix Rows
const onRowMouseEnter = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  if (!el.classList.contains('active') && !el.classList.contains('disabled')) {
    gsap.to(el, {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      duration: 0.15,
      overwrite: 'auto'
    })
  }
}

const onRowMouseLeave = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  if (!el.classList.contains('active') && !el.classList.contains('disabled')) {
    gsap.to(el, {
      backgroundColor: 'rgba(255, 255, 255, 0)',
      duration: 0.15,
      overwrite: 'auto'
    })
  }
}

watch(selectedFossilIndex, () => {
  const cards = document.querySelectorAll('.fossil-card')
  cards.forEach(card => {
    gsap.killTweensOf(card)
    gsap.set(card, { clearProps: 'y,backgroundColor,borderColor' })
  })
})

watch(extraSacrifices, () => {
  const rows = document.querySelectorAll('.matrix-row')
  rows.forEach(row => {
    gsap.killTweensOf(row)
    gsap.set(row, { clearProps: 'backgroundColor' })
  })
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
            @mouseenter="onCardMouseEnter"
            @mouseleave="onCardMouseLeave"
          >
            <div class="fossil-icon-wrapper">
              <img
                :src="getAssetUrl(ASSET_TYPES.ITEM, fossil.sprite)"
                :alt="fossil.name"
                class="fossil-sprite"
              >
              <div 
                class="fossil-count"
                :class="{ empty: !((gameStore.state?.inventory?.[fossil.sprite] || 0) > 0) }"
              >
                {{ gameStore.state?.inventory?.[fossil.sprite] || 0 }}
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
                @mouseenter="onRowMouseEnter"
                @mouseleave="onRowMouseLeave"
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

<style src="./FossilCloning.styles.scss" scoped lang="scss"></style>
