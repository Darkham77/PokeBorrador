<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import BaseModal from '@/components/common/BaseModal.vue'

const uiStore = useUIStore()
const gameStore = useGameStore()

const ppPokemon = computed(() => uiStore.activePokemonForPPUp)

const handleApplyPPUp = (moveIndex) => {
  if (!ppPokemon.value) return
  const move = ppPokemon.value.moves[moveIndex]
  if (!move) return
  
  const moveData = pokemonDataProvider.getMoveData(move.name) || {}
  const basePP = moveData.pp || 35
  const maxPossible = Math.floor(basePP * 1.6)
  
  if (move.maxPP >= maxPossible) {
    uiStore.notify('PP al máximo para este movimiento.', '⚠️')
    return
  }
  
  const increase = Math.floor(basePP * 0.2)
  move.maxPP = Math.min(maxPossible, move.maxPP + increase)
  move.pp = Math.min(move.maxPP, move.pp + increase)
  
  uiStore.notify(`¡Los PP de ${move.name} aumentaron!`, '📈')
  uiStore.isPPUpOpen = false
  uiStore.activePokemonForPPUp = null
  gameStore.save()
}

const close = () => {
  uiStore.isPPUpOpen = false
}
</script>

<template>
  <BaseModal
    :show="true"
    title="SUBIDA DE PP"
    title-color="Rgba(96, 165, 250, 1)"
    header-background="Rgba(26, 26, 46, 1)"
    max-width="400px"
    @close="close"
  >
    <div class="ppup-modal-inner">
      <p class="target-info">
        ¿Qué movimiento de <strong>{{ ppPokemon?.name }}</strong> quieres mejorar?
      </p>
      
      <div class="move-list">
        <button 
          v-for="(m, i) in ppPokemon?.moves" 
          :key="i" 
          class="move-btn"
          @click.stop="handleApplyPPUp(i)"
        >
          <div class="m-main">
            <span class="m-name">{{ m.name }}</span>
            <span class="m-pp">{{ m.pp }}/{{ m.maxPP }} PP</span>
          </div>
          <div class="m-bar">
            <div
              class="m-fill"
              :style="{ width: (m.maxPP / (pokemonDataProvider.getMoveData(m.name)?.pp * 1.6 || 64) * 100) + '%' }"
            />
          </div>
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.ppup-modal-inner {
  padding: 8px 0;
}

.target-info {
  font-size: 13px;
  color: var(--gray);
  text-align: center;
  margin-bottom: 24px;
}

.move-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.move-btn {
  background: Rgba(255,255,255,0.03);
  border: 1px solid Rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 18px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--white);

  &:hover { 
    background: Rgba(255,255,255,0.08); 
    transform: translateX(4px);
    border-color: Rgba(255, 255, 255, 0.2);
  }

  .m-main { display: flex; justify-content: space-between; margin-bottom: 10px; }
  .m-name { font-weight: 800; font-size: 15px; }
  .m-pp { 
    @include pixelated;
    font-size: 8px;
    color: var(--yellow);
  }
  
  .m-bar { height: 6px; background: Rgba(0,0,0,0.3); border-radius: 3px; overflow: hidden; }
  .m-fill { 
    height: 100%; 
    background: linear-gradient(90deg, var(--blue), Rgba(96, 165, 250, 1)); 
    transition: width 0.3s;
    box-shadow: 0 0 10px Rgba(59, 130, 246, 0.3);
  }
}
</style>
