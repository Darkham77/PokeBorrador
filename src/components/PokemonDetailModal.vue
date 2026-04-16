<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'

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
    if (p.value.tags) {
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
</script>

<template>
  <Transition name="fade">
    <div 
      v-if="isOpen && p" 
      class="modal-overlay"
      @click.self="uiStore.closePokemonDetail()"
    >
      <div 
        class="modal-content glass-card"
        :style="{ '--accent-color': TYPE_COLORS[p.type.toLowerCase()] || '#aaa' }"
      >
        <PokemonDetailHeader 
          :pokemon="p" 
          @close="uiStore.closePokemonDetail()"
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
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(10px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-content {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 32px;
  padding: 28px;
  border-top: 4px solid var(--accent-color);
  box-shadow: 0 30px 60px rgba(0,0,0,0.7);
  position: relative;
}

.obedience-warning {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid var(--red);
  padding: 12px;
  border-radius: 12px;
  font-size: 11px;
  color: #fca5a5;
  margin-bottom: 20px;
  font-weight: bold;
}

/* Animations */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
