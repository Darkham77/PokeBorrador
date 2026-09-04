const SCRIPTED_REPLAY_ACTION_SUBSTATES = [
  'WAIT_INPUT',
  'SWITCH_MENU',
  'ENEMY_REPLACEMENT_SEQ',
] as const

export interface ScriptedReplayReadiness {
  isActiveBattle: boolean
  subState: string | null
  isProcessing: boolean
  isIntroAnimating: boolean
  hasPendingSwitch: boolean
  hasPendingPlayerAction?: boolean
}

export function canExecuteScriptedReplayAction(readiness: ScriptedReplayReadiness): boolean {
  const isActionSubState = SCRIPTED_REPLAY_ACTION_SUBSTATES.some((subState) => subState === readiness.subState)
  const requiresSwitchSelection = readiness.subState === 'SWITCH_MENU'
  return readiness.isActiveBattle
    && isActionSubState
    && !readiness.isProcessing
    && (requiresSwitchSelection || !readiness.isIntroAnimating)
    && (requiresSwitchSelection || !readiness.hasPendingSwitch)
}

export interface ReplaySwitchRequirementCheck {
  subState?: string | null
  hasPendingForceSwitch?: boolean
  hasPlayer?: boolean
  hasEnemy?: boolean
  isBattleActive?: boolean
  isOver?: boolean
}

export function isReplaySwitchRequired(options: ReplaySwitchRequirementCheck): boolean {
  if (options.isOver) return false
  if (options.subState === 'SWITCH_MENU') return true
  if (options.hasPendingForceSwitch) return true
  if (options.isBattleActive && !options.hasPlayer && options.hasEnemy) return true
  return false
}

