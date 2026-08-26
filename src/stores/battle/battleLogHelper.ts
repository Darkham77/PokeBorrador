import { gsapSleep } from '@/logic/utils/gsapHelpers'
import type { BattleLog, BattleSource, BattleState, BattleSide } from '@/types/battle/battle'
import { formatBattleLog } from '@/logic/battle/battleLogger'
import type { Pokemon } from '@/types/pokemon/pokemon'

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

    logQueue.value.push(logItem)
    if (!isProcessingLogs.value) processNextLog()
  }

  const processNextLog = async () => {
    if (isProcessingLogs.value) return 
    isProcessingLogs.value = true

    while (true) {
      if (logQueue.value.length === 0) {
        isProcessingLogs.value = false
        if (logQueue.value.length > 0) {
          isProcessingLogs.value = true
          continue
        }
        break
      }

      const batchSize = logQueue.value.length > 6 ? 3 : (logQueue.value.length > 3 ? 2 : 1)
      const MAX_BATTLE_LOG_ENTRIES = 30
      
      for (let i = 0; i < batchSize; i++) {
        if (logQueue.value.length === 0) break
        const nextItem = logQueue.value.shift()
        if (nextItem) {
          battleLogs.value.push(nextItem)
          if (battleLogs.value.length > MAX_BATTLE_LOG_ENTRIES) battleLogs.value.shift()
        }
      }

      const delay = logQueue.value.length > 0 ? 100 : 350
      await gsapSleep(delay)
    }
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
      await gsapSleep(100)
    }
  }

  return {
    addLog,
    clearLogs,
    waitForLogs
  }
}
