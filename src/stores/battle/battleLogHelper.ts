import { gsapSleep } from '@/logic/utils/gsapHelpers'
import type { BattleLog, BattleSource, BattleState, BattleSide } from '@/types/battle/battle'
import { formatBattleLog } from '@/logic/battle/battleLogger'
import type { Pokemon } from '@/types/pokemon/pokemon'

const LOG_PROCESSING_POLL_INTERVAL_MS = 100;

const MAX_BATTLE_LOG_ENTRIES = 1000;
const BATCH_SIZE_HIGH = 3;
const BATCH_SIZE_MED = 2;
const BATCH_SIZE_LOW = 1;
const DELAY_DRAINING_MS = 100;
const DELAY_FINAL_MS = 350;

function resolveLogBatchSize(queueLength: number): number {
  if (queueLength > 6) return BATCH_SIZE_HIGH;
  if (queueLength > 3) return BATCH_SIZE_MED;
  return BATCH_SIZE_LOW;
}

function drainSingleLogBatch(
  queue: BattleLog[],
  logs: BattleLog[],
  maxEntries: number
): void {
  const batchSize = resolveLogBatchSize(queue.length);
  for (let i = 0; i < batchSize; i++) {
    if (queue.length === 0) break;
    const nextItem = queue.shift();
    if (nextItem) {
      logs.push(nextItem);
      if (logs.length > maxEntries) logs.shift();
    }
  }
}

export function createBattleLoggerHelper(
  gs: { state: { playerClass: string | null; avatar_style?: string | null; team: Pokemon[] } },
  activeBattle: { value: unknown },
  attackerSide: { value: BattleSide | null },
  battleLogs: { value: BattleLog[] },
  logQueue: { value: BattleLog[] },
  isProcessingLogs: { value: boolean },
  playerStages: { value: unknown },
  enemyStages: { value: unknown },
  activeMove: { value: unknown },
  initialStages: Record<string, number>
) {
  const addLog = (msg: string, type = 'log-info', source: BattleSource | null = null, sideOverride: BattleSide | null = null) => {
    const ctx = {
      gs,
      activeBattle: activeBattle.value as BattleState | null,
      attackerSide: attackerSide.value
    }
    
    const logItem = formatBattleLog(msg, type, source as BattleSource, ctx)
    if (sideOverride) logItem.side = sideOverride

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('battle-log-added', { detail: logItem }))
    }

    logQueue.value.push(logItem)
    if (!isProcessingLogs.value) processNextLog()
  }

  const processNextLog = async () => {
    if (isProcessingLogs.value) return 
    isProcessingLogs.value = true

    while (logQueue.value.length > 0) {
      drainSingleLogBatch(logQueue.value, battleLogs.value, MAX_BATTLE_LOG_ENTRIES)
      const delay = logQueue.value.length > 0 ? DELAY_DRAINING_MS : DELAY_FINAL_MS
      await gsapSleep(delay)
    }

    isProcessingLogs.value = false
  }

  const clearLogs = () => {
    battleLogs.value = []
    logQueue.value = []
    isProcessingLogs.value = false
    playerStages.value = { ...initialStages }
    enemyStages.value = { ...initialStages }
    activeMove.value = null
    attackerSide.value = null
  }

  const waitForLogs = async () => {
    while (isProcessingLogs.value || logQueue.value.length > 0) {
      await gsapSleep(LOG_PROCESSING_POLL_INTERVAL_MS)
    }
  }

  return {
    addLog,
    clearLogs,
    waitForLogs
  }
}
