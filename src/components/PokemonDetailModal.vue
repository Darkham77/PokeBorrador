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

const props = defineProps({
  show: { type: Boolean, default: false },
  pokemon: { type: Object, default: null },
  index: { type: Number, default: -1 },
  context: { type: String, default: 'team' },
  extra: { type: Object, default: null }
})

const emit = defineEmits(['close'])

const uiStore = useUIStore()

const p = computed(() => props.pokemon)

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
  return props.context === 'team' && p.value?.level > maxObey.value
})

const handleToggleTag = (tag) => {
  const location = props.context
  const index = props.index
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
  const extra = props.extra
  if (extra && typeof window.buyFromMarket === 'function') {
    window.buyFromMarket(extra.offerId, extra.price, extra.type)
    emit('close')
  }
}

const handleEvolve = () => {
  const index = props.index
  if (typeof window.showStonePicker === 'function') {
    emit('close')
    window.showStonePicker(index)
  }
}
</script>

<template>
  <BaseModal
    :show="show && !!p"
    :show-close-button="false"
    max-width="480px"
    @close="emit('close')"
  >
    <div 
      v-if="p"
      class="pokemon-detail-container"
      :style="{ '--accent-color': TYPE_COLORS[p.type.toLowerCase()] || '#aaa' }"
    >
      <PokemonDetailHeader 
        :pokemon="p" 
        @close="emit('close')"
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
        :context="context" 
      />

      <PokemonStatsGrid :pokemon="p" />

      <PokemonMovesGrid 
        :pokemon="p" 
        @show-move="(name) => uiStore.openMoveDetail(name)"
      />

      <PokemonActionFooter 
        :context="context"
        :extra="extra"
        @buy="handleBuy"
        @evolve="handleEvolve"
      />
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.pokemon-detail-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 8px 4px;
}

.obedience-warning {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid #ef4444;
  padding: 12px;
  border-radius: 12px;
  font-size: 11px;
  color: #fca5a5;
  margin-bottom: 4px;
  font-weight: bold;
  text-align: center;
}

:deep(.base-modal-card) {
  border-top: 4px solid var(--accent-color) !important;
  transition: border-color 0.3s ease;
}
</style>
