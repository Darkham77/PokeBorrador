<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import BaseModal from '@/components/common/BaseModal.vue'
import { requireAbilityId, type AbilityId } from '@/data/battle/abilities'
import gsap from 'gsap'

const uiStore = useUIStore()
const gameStore = useGameStore()
const inventoryStore = useInventoryStore()

const abilityPokemon = computed(() => {
  const target = uiStore.activePokemonForAbility
  if (!target) return null
  const list = target.context === 'team' ? gameStore.state.team : gameStore.state.box
  return list[target.index] ?? null
})
const availableAbilities = computed<AbilityId[]>(() => {
  if (!abilityPokemon.value) return []
  return pokemonDataProvider.getSpeciesAbilities(abilityPokemon.value.id).map(requireAbilityId)
})

const handleApplyAbility = (ability: AbilityId) => {
  if (!abilityPokemon.value) return
  if (abilityPokemon.value.ability === ability) {
    uiStore.notify('Ya tiene esa habilidad.', '⚠️')
    return
  }
  
  const old = abilityPokemon.value.ability
  abilityPokemon.value.ability = ability
  // Consume only after confirming
  inventoryStore.removeItem('abilitypill', 1)
  uiStore.notify(`¡Habilidad cambiada: ${old} → ${ability}!`, '💊')
  close()
  gameStore.save()
}

const getAbilityDesc = (ability: AbilityId) => {
  if (!ability) return 'Habilidad especial de este Pokémon.'
  const data = pokemonDataProvider.getAbilityData(ability)
  return data ? data.desc : 'Habilidad especial de este Pokémon.'
}

const getAbilityName = (ability: AbilityId) => {
  if (!ability) return '—'
  const data = pokemonDataProvider.getAbilityData(ability)
  return data ? data.name : ability
}

const onBtnEnter = (event: MouseEvent) => {
  const el = event.currentTarget as HTMLElement
  gsap.to(el, {
    x: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    duration: 0.2,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const onBtnLeave = (event: MouseEvent, isActive: boolean) => {
  const el = event.currentTarget as HTMLElement
  gsap.to(el, {
    x: 0,
    backgroundColor: isActive ? 'rgba(255, 214, 10, 0.05)' : 'rgba(255, 255, 255, 0.03)',
    borderColor: isActive ? 'var(--yellow)' : 'rgba(255, 255, 255, 0.08)',
    duration: 0.2,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

interface Props {
  id?: string
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  id: 'ability-pill-modal',
  show: true
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const close = () => {
  emit('close')
  uiStore.isAbilityPillOpen = false
  uiStore.activePokemonForAbility = null
}
</script>

<template>
  <BaseModal
    :id="id"
    :show="show"
    title="PÍLDORA DE HABILIDAD"
    title-color="rgba(244, 114, 174, 1)"
    header-background="rgba(26, 28, 46, 1)"
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
          @mouseenter="onBtnEnter"
          @mouseleave="onBtnLeave($event, abilityPokemon?.ability === a)"
          @click.stop="handleApplyAbility(a)"
        >
          <div class="a-header">
            <span class="a-name">{{ getAbilityName(a) }}</span>
            <span
              v-if="abilityPokemon?.ability === a"
              class="a-current"
            >(Actual)</span>
          </div>
          <span class="a-desc">{{ getAbilityDesc(a) }}</span>
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
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.ability-modal-inner {
  padding: 8px 12px;
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
  padding: 4px;
}

.ability-btn {
  background: Rgba(255,255,255,0.03);
  border: 1px solid Rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  cursor: pointer;
  will-change: transform;
  color: var(--white);
  gap: 4px;
  
  &.active { 
    border-color: var(--yellow);
    background: Rgba(255, 214, 10, 0.05);
  }

  .a-header {
    display: flex;
    justify-content: space-between;
    width: 100%;
    align-items: center;
  }

  .a-name { font-weight: 800; font-size: 15px; }
  .a-current { 
    font-size: 8px; 
    color: var(--yellow); 
    @include pixelated;
  }
  .a-desc {
    font-size: 11px;
    color: var(--gray);
    line-height: 1.4;
  }
}

.no-options {
  text-align: center;
  font-size: 12px;
  color: Rgba(255,255,255,0.2);
  padding: 40px 20px;
  background: Rgba(0,0,0,0.2);
  border-radius: 16px;
  border: 1px dashed Rgba(255,255,255,0.05);
}
</style>
