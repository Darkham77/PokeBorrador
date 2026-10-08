export { MAX_PER_ACTION_TIMEOUT_MS } from './simulation_config.ts';

export {
  flushE2ELogs,
  logE2EDebug,
  clickResilient,
  type E2EPage
} from './helpers/e2eLogger.ts';

export {
  armBattleFlowCompletion,
  awaitBattleFlowCompletion,
  armBattleReadyForInput,
  awaitBattleReadyForInput,
  armBattleForcedSwitch,
  awaitBattleForcedSwitch,
  armGameStoreReady,
  awaitGameStoreReady,
  armStarterSelectReady,
  awaitStarterSelectReady,
  waitForWaitInput,
  waitForBattleReadyEvent,
  type WindowWithResolver
} from './helpers/battleEventHelpers.ts';

export {
  isCriticalConsoleMessage,
  isTransientNetworkError,
  isTransientNetworkFailure,
  setupE2ESession,
  loginE2ETestUser,
  loginTestUser
} from './helpers/e2eSessionHelper.ts';

export {
  type CertifiedTestBatch,
  type BattleLogEntry,
  type PlayerRequestPokemonSlot,
  type E2EBattleState,
  resolveTargetUidForSlot,
  confirmAndStartBattle,
  executeNativeAutoBattle,
  handleSwitchMenuInput,
  handleMoveChoice,
  handleSwitchChoice,
  handleItemChoice,
  executeSpecificChoice,
  handleBattleInput,
  checkIfChoiceIsInvalid,
  verifyHpParity,
  dispatchReplayChoice,
  checkIfReplayEndingOrOver,
  executeAutoBattle
} from './helpers/e2eAutoBattleHelper.ts';

export {
  waitForStoreReady,
  openDebugTab,
  playSingleFishingNote,
  playFishingMinigameNaturally,
  playArchaeologyMinigameNaturally
} from './helpers/e2eMinigameHelper.ts';
