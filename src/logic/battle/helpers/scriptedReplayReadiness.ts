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
    && readiness.hasPendingPlayerAction !== false
    && !readiness.isProcessing
    && (requiresSwitchSelection || !readiness.isIntroAnimating)
    && (requiresSwitchSelection || !readiness.hasPendingSwitch)
}
