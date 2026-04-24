<script setup>
/**
 * BattleSwitchModal
 * Standardized modal for switching pokemon during battle.
 */
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle'
import { useLivePvPStore } from '@/stores/livePvP'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { useBattleVisuals } from '@/composables/useBattleVisuals'
import BaseModal from '@/components/common/BaseModal.vue'

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const gameStore = useGameStore()
const battleStore = useBattleStore()
const livePvP = useLivePvPStore()
const uiStore = useUIStore()
const { getHpColor } = useBattleVisuals()

const isForced = computed(() => uiStore.isBattleSwitchForced || livePvP.battleState.phase === 'faint_switch')
const team = computed(() => gameStore.state.team || [])
const activePoke = computed(() => {
  if (livePvP.battleState.active) {
    return livePvP.battleState.myTeam[livePvP.battleState.myActiveIdx]
  }
  return battleStore.activeBattle?.player
})

const close = () => {
  if (isForced.value) return // Cant close if forced to switch
  emit('close')
}

const handleSwitch = async (index) => {
  if (livePvP.battleState.active) {
    livePvP._commitPick({ type: 'switch', switchIndex: index })
  } else {
    await battleStore.executeSwitch(index, isForced.value)
  }
  emit('close')
  uiStore.isBattleSwitchForced = false
}
</script>

<template>
  <BaseModal
    :show="show"
    :title="isForced ? '¡ELIGE UN POKÉMON!' : 'CAMBIAR POKÉMON'"
    title-color="var(--purple-light)"
    header-background="#1a1c2e"
    max-width="440px"
    variant="retro"
    :prevent-close="isForced"
    :show-close-button="!isForced"
    @close="close"
  >
    <div class="switch-modal-body">
      <p class="switch-help">
        {{ isForced ? 'Tu Pokémon ha caído. ¡Elige al siguiente!' : '¿A quién quieres enviar al combate?' }}
      </p>

      <div class="team-list custom-scrollbar-vicio">
        <template
          v-for="(p, index) in team"
          :key="p.uid || index"
        >
          <div 
            v-if="p.uid !== activePoke?.uid && p.hp > 0"
            class="target-row-vicio"
            @click="handleSwitch(index)"
          >
            <div class="poke-sprite-box">
              <img
                :src="getAssetUrl(ASSET_TYPES.POKEMON, p.id, { shiny: p.isShiny })"
                :alt="p.name"
                @error="e => e.target.style.display = 'none'"
              >
            </div>
            
            <div class="poke-info">
              <div class="name-line">
                <span class="p-name">{{ p.name }}</span>
                <span class="p-lv">Nv.{{ p.level }}</span>
              </div>
              
              <div class="hp-bar-container">
                <div 
                  class="hp-bar-fill" 
                  :style="{ 
                    width: (p.hp / p.maxHp * 100) + '%',
                    backgroundColor: getHpColor(p.hp / p.maxHp * 100)
                  }"
                />
              </div>
              
              <div class="hp-text">
                {{ p.hp }} / {{ p.maxHp }} HP
              </div>
            </div>

            <div class="select-hint">
              ¡IR!
            </div>
          </div>
        </template>
      </div>
    </div>

    <template #footer>
      <button
        v-if="!isForced"
        class="btn-vicio-secondary btn-vicio-full"
        @click="close"
      >
        CANCELAR
      </button>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.switch-modal-body {
  padding: 8px 0;
}

.switch-help {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  line-height: 1.5;
  margin-bottom: 24px;
}

.team-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
  padding-right: 4px;
  @include smooth-scroll;
}

.target-row-vicio {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  &:hover {
    background: rgba(157, 78, 221, 0.1);
    border-color: var(--purple-light);
    transform: translateX(4px);
    
    .p-name { color: var(--purple-light); }
    .select-hint { opacity: 1; }
  }
}

.poke-sprite-box {
  width: 52px;
  height: 52px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  img {
    width: 48px;
    height: 48px;
    @include sprite-render;
  }
}

.poke-info { flex: 1; }

.name-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.p-name {
  font-family: 'Press Start 2P', cursive;
  font-size: 10px;
  color: $white;
  transition: color 0.2s;
  @include pixelated;
}

.p-lv {
  font-size: 8px;
  color: var(--gray);
  font-family: 'Press Start 2P', cursive;
  @include pixelated;
}

.hp-bar-container {
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.hp-bar-fill {
  height: 100%;
  transition: width 0.5s ease;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.hp-text {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.3);
  font-family: monospace;
}

.select-hint {
  font-family: 'Press Start 2P', cursive;
  font-size: 7px;
  color: var(--purple-light);
  opacity: 0;
  transition: opacity 0.2s;
  @include pixelated;
}
</style>
