<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import BaseModal from '@/components/common/BaseModal.vue'

const uiStore = useUIStore()
const gameStore = useGameStore()

const abilityPokemon = computed(() => uiStore.activePokemonForAbility)
const availableAbilities = computed(() => {
  if (!abilityPokemon.value) return []
  return pokemonDataProvider.getSpeciesAbilities(abilityPokemon.value.id)
})

const handleApplyAbility = (ability) => {
  if (!abilityPokemon.value) return
  if (abilityPokemon.value.ability === ability) {
    uiStore.notify('Ya tiene esa habilidad.', '⚠️')
    return
  }
  
  const old = abilityPokemon.value.ability
  abilityPokemon.value.ability = ability
  uiStore.notify(`¡Habilidad cambiada: ${old} → ${ability}!`, '💊')
  uiStore.isAbilityPillOpen = false
  uiStore.activePokemonForAbility = null
  gameStore.save()
}

const close = () => {
  uiStore.isAbilityPillOpen = false
}
</script>

<template>
  <BaseModal
    :show="true"
    title="PÍLDORA DE HABILIDAD"
    max-width="400px"
    variant="retro"
    @close="close"
  >
    <div class="ability-modal-inner">
      <p class="target-info">
        Cambia la habilidad de <strong>{{ abilityPokemon?.name }}</strong>
      </p>
      
      <div class="ability-list">
        <button 
          v-for="a in availableAbilities" 
          :key="a" 
          class="ability-btn"
          :class="{ active: abilityPokemon?.ability === a }"
          @click="handleApplyAbility(a)"
        >
          <span class="a-name">{{ a }}</span>
          <span
            v-if="abilityPokemon?.ability === a"
            class="a-current"
          >(Actual)</span>
        </button>
        
        <div
          v-if="availableAbilities.length <= 1"
          class="no-options"
        >
          Este Pokémon no tiene habilidades alternativas disponibles.
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.ability-modal-inner {
  padding: 8px 0;
}

.target-info {
  font-size: 13px;
  color: var(--gray);
  text-align: center;
  margin-bottom: 24px;
}

.ability-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ability-btn {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s;
  color: #fff;

  &:hover { 
    background: rgba(255,255,255,0.08); 
    transform: translateX(4px);
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  &.active { 
    border-color: var(--yellow);
    background: rgba(255, 214, 10, 0.05);
  }

  .a-name { font-weight: 800; font-size: 15px; }
  .a-current { 
    font-size: 8px; 
    color: var(--yellow); 
    font-family: 'Press Start 2P', cursive;
  }
}

.no-options {
  text-align: center;
  font-size: 12px;
  color: rgba(255,255,255,0.2);
  padding: 40px 20px;
  background: rgba(0,0,0,0.2);
  border-radius: 16px;
  border: 1px dashed rgba(255,255,255,0.05);
}
</style>
