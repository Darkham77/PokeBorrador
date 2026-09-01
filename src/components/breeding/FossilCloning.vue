<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useBreedingStore } from '@/stores/breeding'
import { useGameStore } from '@/stores/game'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { calculateCloningCost, calculateCloningShinyChance } from '@/logic/minigames/minigameMath'
import EggSprite from '@/components/common/EggSprite.vue'
import { gsap } from 'gsap'
import { getItemName, type ItemId } from '@/data/inventory/items'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

const breedingStore = useBreedingStore()
const gameStore = useGameStore()

interface FossilDef {
  id: ItemId
  pokemonId: PokemonSpeciesId
}

// Fossil definitions
const FOSSILS: readonly FossilDef[] = [
  { id: 'domefossil', pokemonId: 'kabuto' },
  { id: 'helixfossil', pokemonId: 'omanyte' },
  { id: 'oldamber', pokemonId: 'aerodactyl' }
] as const

const defaultFossil: FossilDef = { id: 'domefossil', pokemonId: 'kabuto' }
const selectedFossilIndex = ref(0)
const extraSacrifices = ref(0)

const renderedFossils = computed(() => {
  return FOSSILS.map(f => ({
    id: f.id,
    name: getItemName(f.id),
    pokemon: pokemonDataProvider.getPokemonData(f.pokemonId)?.name || f.pokemonId
  }))
})

const activeFossil = computed<{ name: string; id: ItemId; pokemon: string }>(() => {
  const f = renderedFossils.value[selectedFossilIndex.value]
  if (f) return f
  const base = defaultFossil
  return {
    id: base.id,
    name: getItemName(base.id),
    pokemon: pokemonDataProvider.getPokemonData(base.pokemonId)?.name || base.pokemonId
  }
})

const ownedCount = computed(() => {
  if (!gameStore.state?.inventory) return 0
  return gameStore.state.inventory[activeFossil.value.id] || 0
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

const showFailureTooltip = ref(false)

const handleClone = () => {
  if (!canClone.value) return
  const success = breedingStore.cloneFossil(activeFossil.value.id, extraSacrifices.value)
  if (!success) {
    showFailureTooltip.value = true
    gsap.killTweensOf(showFailureTooltip)
    gsap.delayedCall(3, () => {
      showFailureTooltip.value = false
    })
  } else {
    showFailureTooltip.value = false
  }
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
    multiplier: `${mult.toFixed(2)}x`,
    successPercent: 5 * (1 + N)
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

const GSAP_HOVER_ROW_DURATION_SEC = 0.15

// GSAP Hover Handlers for Matrix Rows
const onRowMouseEnter = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  if (!el.classList.contains('active') && !el.classList.contains('disabled')) {
    gsap.to(el, {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      duration: GSAP_HOVER_ROW_DURATION_SEC,
      overwrite: 'auto'
    })
  }
}

const onRowMouseLeave = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  if (!el.classList.contains('active') && !el.classList.contains('disabled')) {
    gsap.to(el, {
      backgroundColor: 'rgba(255, 255, 255, 0)',
      duration: GSAP_HOVER_ROW_DURATION_SEC,
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
            v-for="(fossil, idx) in renderedFossils"
            :key="fossil.id"
            class="fossil-card"
            :class="{ active: selectedFossilIndex === idx }"
            @click="selectFossil(idx)"
            @mouseenter="onCardMouseEnter"
            @mouseleave="onCardMouseLeave"
          >
            <div class="fossil-icon-wrapper">
              <img
                :src="getAssetUrl(ASSET_TYPES.ITEM, fossil.id)"
                :alt="fossil.name"
                class="fossil-sprite"
              >
              <div 
                class="fossil-count"
                :class="{ empty: !((gameStore.state?.inventory?.[fossil.id] || 0) > 0) }"
              >
                {{ gameStore.state?.inventory?.[fossil.id] || 0 }}
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
                <th>Éxito</th>
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
                <td class="font-pixel text-center">
                  {{ tier.successPercent }}%
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
        <div class="action-wrapper">
          <div
            v-if="showFailureTooltip"
            class="failure-tooltip font-pixel"
          >
            <span class="emoji">⚠️</span> ¡EXTRACCIÓN FALLIDA! Recursos consumidos.
          </div>
          <button
            class="btn-clone"
            :disabled="!canClone"
            @click="handleClone"
          >
            <span v-if="!hasEnoughFossils"><span class="emoji">❌</span> FÓSILES INSUFICIENTES</span>
            <span v-else-if="!hasEnoughMoney"><span class="emoji">💰</span> DINERO INSUFICIENTE</span>
            <span v-else><span class="emoji">🧬</span> INICIAR CLONACIÓN GENÉTICA</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style src="./FossilCloning.styles.scss" scoped lang="scss"></style>
