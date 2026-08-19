import { BATTLE_STATES, BATTLE_SUBSTATES, type BattleStateName, type BattleSubStateName } from '../battleStateMachine.ts'

interface BattleCompletionReadinessInput {
  hasActiveBattle: boolean
  isOver: boolean
  fsmState: BattleStateName
  fsmSubState: BattleSubStateName | null
}

export function isBattleCompletionReady({ hasActiveBattle, isOver, fsmState, fsmSubState }: BattleCompletionReadinessInput): boolean {
  if (!hasActiveBattle) return false
  const isRewardsComplete = fsmState === BATTLE_STATES.REWARDS_PHASE && fsmSubState === BATTLE_SUBSTATES.EMPTY_WAIT
  const isTerminalState = fsmState === BATTLE_STATES.SEARCH_PHASE || fsmState === BATTLE_STATES.EXIT_BATTLE
  return isOver && (isTerminalState || isRewardsComplete)
}

export { BATTLE_STATES }
