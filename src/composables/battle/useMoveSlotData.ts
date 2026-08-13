import { computed } from 'vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { useBattleStore } from '@/stores/battle/battle'
import { getCombinedEffectiveness } from '@/logic/pokemon/typeEngine'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import type { MoveCategory } from '@/data/battle/moves'
import {
  getCombatEnvState,
  calculateFinalPower,
  calculateFinalAccuracy,
  calculateMoveModifier
} from '@/logic/battle/moveCalculator'

export function useMoveSlotData(
  moveRef: () => Move | null,
  playerInfoRef: () => Pokemon | null
) {
  const battleStore = useBattleStore()

  const moveData = computed(() => {
    const move = moveRef()
    if (!move) return null
    const md = (move.id ? pokemonDataProvider.getMoveData(move.id) || {} : {}) as { type?: string; power?: number; acc?: number; cat?: string };
    return {
      ...move,
      type: move.type || md.type || 'normal',
      power: move.power !== undefined ? move.power : md.power,
      acc: move.acc !== undefined ? move.acc : md.acc,
      cat: (move.cat || md.cat || 'physical') as MoveCategory
    }
  })

  const finalPower = computed(() => {
    const md = moveData.value
    const attacker = playerInfoRef()
    const defender = battleStore.state?.enemy
    const weather = battleStore.state?.weather
    const isGym = !!battleStore.state?.isGym
    return calculateFinalPower(md, attacker, defender, weather, isGym)
  })

  const finalAccuracy = computed(() => {
    const md = moveData.value
    const attacker = playerInfoRef()
    const defender = battleStore.state?.enemy
    const weather = battleStore.state?.weather
    const isGym = !!battleStore.state?.isGym
    const accStage = battleStore.playerStages?.acc || 0
    const evaStage = battleStore.enemyStages?.eva || 0
    return calculateFinalAccuracy(md, attacker, defender, weather, isGym, accStage, evaStage)
  })

  const moveModifier = computed(() => {
    const md = moveData.value
    const attacker = playerInfoRef()
    const defender = battleStore.state?.enemy
    const weather = battleStore.state?.weather
    const isGym = !!battleStore.state?.isGym
    const env = getCombatEnvState(attacker, defender, weather, isGym)
    return calculateMoveModifier(md, battleStore.isBattleActive, env)
  })

  const effectivenessMultiplier = computed(() => {
    const md = moveData.value
    if (!md) return 1
    const defender = battleStore.state?.enemy
    if (!defender) return 1
    const attacker = playerInfoRef()
    return getCombinedEffectiveness(md.type, defender, attacker)
  })

  return {
    moveData,
    finalPower,
    finalAccuracy,
    moveModifier,
    effectivenessMultiplier
  }
}

