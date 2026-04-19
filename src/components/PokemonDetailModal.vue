<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'

// Sub-components
import PokemonDetailHeader from './pokemon-detail/PokemonDetailHeader.vue'
import PokemonStatusSection from './pokemon-detail/PokemonStatusSection.vue'
import PokemonStatsGrid from './pokemon-detail/PokemonStatsGrid.vue'
import PokemonMovesGrid from './pokemon-detail/PokemonMovesGrid.vue'
import PokemonActionFooter from './pokemon-detail/PokemonActionFooter.vue'

const uiStore = useUIStore()

const p = computed(() => uiStore.selectedPokemon)
const isOpen = computed(() => uiStore.isPokemonDetailOpen)

const TYPE_COLORS = {
  grass: '#6BCB77', fire: '#FF3B3B', water: '#3B8BFF', normal: '#aaa', 
  electric: '#FFD93D', psychic: '#C77DFF', rock: '#c8a060', ground: '#c8a060', 
  poison: '#C77DFF', ghost: '#7B2FBE', bug: '#8BC34A', dragon: '#5C16C5',
  steel: '#9E9E9E', fighting: '#FF3B3B', ice: '#7DF9FF', flying: '#89CFF0',
  dark: '#555', fairy: '#FF6EFF'
}

const maxObey = computed(() => {
  if (typeof window.getMaxObeyLevel === 'function') return window.getMaxObeyLevel()
  return 100
})

const needsObedienceWarning = computed(() => {
  return uiStore.pokemonDetailContext === 'team' && p.value?.level > maxObey.value
})

const handleToggleTag = (tag) => {
  const location = uiStore.pokemonDetailContext
  const index = uiStore.pokemonDetailIndex
  if (typeof window.togglePokeTag === 'function') {
    window.togglePokeTag(location, index, tag)
    // Update local ref for reactivity balance with legacy
    if (p.value && p.value.tags) {
       const idx = p.value.tags.indexOf(tag)
       if (idx > -1) p.value.tags.splice(idx, 1)
       else p.value.tags.push(tag)
    }
  }
}

const handleBuy = () => {
  const extra = uiStore.pokemonDetailExtra
  if (extra && typeof window.buyFromMarket === 'function') {
    window.buyFromMarket(extra.offerId, extra.price, extra.type)
    uiStore.closePokemonDetail()
  }
}

const handleEvolve = () => {
  const index = uiStore.pokemonDetailIndex
  if (typeof window.showStonePicker === 'function') {
    uiStore.closePokemonDetail()
    window.showStonePicker(index)
  }
}

const closeDetail = () => {
  uiStore.closePokemonDetail()
}
</script>

<template>
  <BaseModal
    :show="isOpen && !!p"
    :show-close-button="false"
    max-width="480px"
    @close="closeDetail"
  >
    <div 
      v-if="p"
      class="pokemon-detail-container"
      :style="{ '--accent-color': TYPE_COLORS[p.type.toLowerCase()] || '#aaa' }"
    >
      <PokemonDetailHeader 
        :pokemon="p" 
        @close="closeDetail"
        @toggle-tag="handleToggleTag"
      />

      <div
        v-if="needsObedienceWarning"
        class="obedience-warning"
      >
        ⚠️ ¡Nivel demasiado alto! Obediencia hasta Nv. {{ maxObey }}.
      </div>

      <PokemonStatusSection 
        :pokemon="p" 
        :context="uiStore.pokemonDetailContext" 
      />

      <PokemonStatsGrid :pokemon="p" />

      <PokemonMovesGrid 
        :pokemon="p" 
        @show-move="(name) => uiStore.openMoveDetail(name)"
      />

      <PokemonActionFooter 
        :context="uiStore.pokemonDetailContext"
        :extra="uiStore.pokemonDetailExtra"
        @buy="handleBuy"
        @evolve="handleEvolve"
      />
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
.pokemon-detail-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 8px 4px;
}

.obedience-warning {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid var(--red);
  padding: 12px;
  border-radius: 12px;
  font-size: 11px;
  color: #fca5a5;
  margin-bottom: 4px;
  font-weight: bold;
  text-align: center;
}

// Remove original padding and border as it's handled by BaseModal
:deep(.base-modal-card) {
  border-top: 4px solid var(--accent-color) !important;
}
</style>
