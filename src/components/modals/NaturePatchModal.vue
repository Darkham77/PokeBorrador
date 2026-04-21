<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { NATURES } from '@/data/natures'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import BaseModal from '@/components/common/BaseModal.vue'

const uiStore = useUIStore()
const gameStore = useGameStore()

const naturePokemon = computed(() => uiStore.activePokemonForNature)
const sortedNatures = [...NATURES].sort()

const handleApplyNature = (nature) => {
  if (!naturePokemon.value) return
  naturePokemon.value.nature = nature
  
  // Recalc stats
  import('@/logic/pokemonFactory').then(({ recalcPokemonStats }) => {
    recalcPokemonStats(naturePokemon.value)
    uiStore.notify(`¡La naturaleza de ${naturePokemon.value.name} cambió a ${nature}!`, '✨')
    uiStore.isNaturePatchOpen = false
    uiStore.activePokemonForNature = null
    gameStore.save()
  })
}

const getNatureInfo = (nature) => {
  const data = pokemonDataProvider.getNatureData(nature)
  if (!data || !data.up) return 'Sin cambios'
  return `+${data.up} / -${data.down}`
}

const close = () => {
  uiStore.isNaturePatchOpen = false
}
</script>

<template>
  <BaseModal
    :show="true"
    title="PARCHE DE NATURALEZA"
    max-width="400px"
    @close="close"
  >
    <div class="nature-modal-inner">
      <p class="target-info">
        Selecciona la nueva naturaleza para <strong>{{ naturePokemon?.name }}</strong>
      </p>
      
      <div class="nature-grid scrollbar">
        <button 
          v-for="n in sortedNatures" 
          :key="n" 
          class="nature-btn"
          :class="{ active: naturePokemon?.nature === n }"
          @click="handleApplyNature(n)"
        >
          <span class="n-name">{{ n }}</span>
          <span class="n-info">{{ getNatureInfo(n) }}</span>
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.nature-modal-inner {
  padding: 8px 0;
}

.target-info {
  font-size: 13px;
  color: var(--gray);
  text-align: center;
  margin-bottom: 24px;
}

.nature-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
  min-height: 0;
  padding-right: 8px;

  .nature-btn {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    padding: 14px;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;

    &:hover { 
      background: rgba(255,255,255,0.06); 
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.2);
    }
    
    &.active { 
      border-color: var(--yellow); 
      background: rgba(255, 214, 10, 0.05);
      .n-name { color: var(--yellow); }
    }

    .n-name { display: block; font-weight: 800; color: #fff; font-size: 14px; }
    .n-info { display: block; font-size: 10px; color: var(--gray); margin-top: 4px; }
  }
}

</style>
