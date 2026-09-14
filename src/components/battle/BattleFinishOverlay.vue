<script setup lang="ts">
import { computed } from 'vue'
import { useBattleStore } from '@/stores/battle/battle'
import { getActiveMinigame } from '@/logic/battle/battleMinigames'

interface Props {
  isRewardsWait: boolean
}

defineProps<Props>()

const battleStore = useBattleStore()

const encounterBtnEmoji = computed(() => {
  const mg = getActiveMinigame(battleStore.state)
  if (mg === 'fishing') return '🎣'
  if (mg === 'archaeology') return '⛏️'
  return '⚔️'
})

const encounterBtnText = computed(() => {
  const mg = getActiveMinigame(battleStore.state)
  if (mg === 'fishing') return '¡PESCAR!'
  if (mg === 'archaeology') return '¡EXCAVAR!'
  return '¡COMBATIR!'
})

const exitButtonConfig = computed(() => {
  const returnTab = battleStore.state?.returnTab
  if (returnTab === 'arena' || battleStore.isPvP) {
    return { type: 'arena', text: 'VOLVER A LA ARENA', emoji: '⚔️' }
  }
  if (returnTab === 'home') {
    return { type: 'home', text: 'VOLVER A CASA', emoji: '🏠' }
  }
  if (returnTab === 'gyms' || battleStore.state?.isGym) {
    return { type: 'gyms', text: 'VOLVER A GIMNASIOS', emoji: '🏆' }
  }
  return { type: 'map', text: 'VOLVER AL MAPA', emoji: '🗺️' }
})
</script>

<template>
  <div
    class="battle-finish-overlay"
    :class="{ 'is-search-mode': battleStore.isSearching }"
  >
    <div class="finish-actions-group">
      <button
        v-if="battleStore.isSearching && (battleStore.state?.wasSearching !== false)"
        id="start-encounter-btn"
        class="continue-btn-final fight-btn"
        @click.stop="battleStore.startEncounter()"
      >
        <span class="emoji">{{ encounterBtnEmoji }}</span>
        <span class="btn-text">{{ encounterBtnText }}</span>
      </button>
      <button
        v-if="(battleStore.isReadyToExit || isRewardsWait) || (battleStore.isSearching && battleStore.state?.wasSearching !== false && battleStore.uiConfig.allowFlee)"
        id="exit-battle-btn"
        class="continue-btn-final map-btn"
        @click.stop="battleStore.completeBattleFlow('map')"
      >
        <span class="emoji">{{ exitButtonConfig.emoji }}</span>
        <span class="btn-text">{{ exitButtonConfig.text }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.battle-finish-overlay {
  position: absolute;
  inset: 0;
  background: Rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-overlay);
  pointer-events: all;
  cursor: pointer;
  -webkit-will-change: transform, opacity;
  will-change: transform, opacity;
  @include gpu-layer;

  &.is-search-mode {
    align-items: flex-end;
    padding-bottom: 20px;
  }
}

.finish-actions-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 20px;
}

.continue-btn-final {
  @include btn-vicio('info', 'md', true);
  max-width: 300px;
  display: flex;
  align-items: center;
  z-index: calc(var(--z-overlay) + 1);
  pointer-events: all;
  cursor: pointer;
  justify-content: flex-start;
  padding-left: 48px;
  gap: 16px;
  text-align: left;
  
  &.map-btn {
    @include btn-vicio('success', 'md', true);
  }

  .emoji {
    width: 32px;
    font-size: 28px; 
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    will-change: transform, filter, opacity;
    filter: Drop-Shadow(0 2px 4px Rgba(0,0,0,0.3));
    flex-shrink: 0;
  }

  .btn-text {
    display: inline-flex;
    align-items: center;
  }
}
</style>
