<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { NATURES, NATURE_DATA } from '@/data/battle/natures'
import BaseModal from '@/components/common/BaseModal.vue'
import gsap from 'gsap'

const uiStore = useUIStore()
const gameStore = useGameStore()
const inventoryStore = useInventoryStore()

const naturePokemon = computed(() => {
  const target = uiStore.activePokemonForNature
  if (!target) return null
  const list = target.context === 'team' ? gameStore.state.team : gameStore.state.box
  return list[target.index] ?? null
})
const sortedNatures = [...NATURES].sort()

const handleApplyNature = (nature: string) => {
  if (!naturePokemon.value) return
  naturePokemon.value.nature = nature
  
  // Recalc stats
  import('@/logic/pokemon/pokemonFactory').then(({ recalcPokemonStats }) => {
    if (naturePokemon.value) {
      recalcPokemonStats(naturePokemon.value)
      const translatedNature = NATURE_DATA[nature]?.name || nature
      uiStore.notify(`¡La naturaleza de ${naturePokemon.value.name} cambió a ${translatedNature}!`, '✨')
    }
    // Consume only after confirming
    inventoryStore.removeItem('nature_patch', 1)
    uiStore.isNaturePatchOpen = false
    uiStore.activePokemonForNature = null
    gameStore.save()
  })
}


const onBtnEnter = (event: MouseEvent) => {
  const el = event.currentTarget as HTMLElement
  gsap.to(el, {
    y: -4,
    scale: 1.02,
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
    y: 0,
    scale: 1,
    backgroundColor: isActive ? 'rgba(255, 214, 10, 0.05)' : 'rgba(255, 255, 255, 0.03)',
    borderColor: isActive ? 'var(--yellow)' : 'rgba(255, 255, 255, 0.08)',
    duration: 0.2,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const close = () => {
  uiStore.isNaturePatchOpen = false
  uiStore.activePokemonForNature = null
}
</script>

<template>
  <BaseModal
    :show="true"
    title="PARCHE DE NATURALEZA"
    title-color="rgba(74, 222, 128, 1)"
    header-background="rgba(26, 26, 46, 1)"
    variant="retro"
    padding="raw"
    accent-color="var(--green)"
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
          @mouseenter="onBtnEnter"
          @mouseleave="onBtnLeave($event, naturePokemon?.nature === n)"
          @click.stop="handleApplyNature(n)"
        >
          <span class="n-name">{{ NATURE_DATA[n]?.name || n }}</span>
          <div class="n-effects">
            <template v-if="NATURE_DATA[n]?.up">
              <span class="stat-mod mod-up">
                <span class="indicator-icon">▲</span>
                <span>+10% {{ NATURE_DATA[n]?.up }}</span>
              </span>
              <span class="stat-mod mod-down">
                <span class="indicator-icon">▼</span>
                <span>-10% {{ NATURE_DATA[n]?.down }}</span>
              </span>
            </template>
            <template v-else>
              <span class="stat-mod mod-neutral">Sin cambios</span>
            </template>
          </div>
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
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  min-height: 0;
  padding: 8px 12px;

  .nature-btn {
    background: Rgba(255,255,255,0.03);
    border: 1px solid Rgba(255,255,255,0.08);
    border-radius: 14px;
    padding: 14px;
    text-align: left;
    cursor: pointer;
    will-change: transform;
    
    &.active { 
      border-color: var(--yellow); 
      background: Rgba(255, 214, 10, 0.05);
      .n-name { color: var(--yellow); }
    }

    .n-name { display: block; font-weight: 800; color: var(--white); font-size: 14px; }
    
    .n-effects {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-top: 6px;
    }

    .stat-mod {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      font-weight: bold;
      
      .indicator-icon {
        font-size: 9px;
        line-height: 1;
        display: inline-block;
      }
      
      &.mod-up {
        color: #32d74b;
      }
      
      &.mod-down {
        color: #ff453a;
      }

      &.mod-neutral {
        color: var(--gray);
        font-weight: normal;
      }
    }
  }
}
</style>
