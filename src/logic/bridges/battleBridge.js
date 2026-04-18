import { useBattleStore } from '@/stores/battle'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'

/**
 * Connects legacy battle functions with the BattleStore.
 */
export function initBattleBridge() {
  if (typeof window === 'undefined') return

  const battleStore = useBattleStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()

  window.startBattle = (pokemon, isTrainer, trainerData, locationId) => {
    battleStore.initBattle({ pokemon, isTrainer, trainerData, locationId })
  }

  window.endBattle = (won) => {
    battleStore.endBattle(won)
  }

  window.addBattleLog = (msg, type) => {
    battleStore.addLog(msg, type)
  }

  window.updateBattleState = () => {
    battleStore.syncFromLegacy(window.state.battle)
  }

  console.log('[BattleBridge] Battle logic connected to BattleStore.')
}
