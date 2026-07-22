import { sleep } from '@/logic/utils/timeUtils'
import type { BattleLog, BattleSource, BattleState } from '@/types/battle/battle'
import { formatBattleLog } from '@/logic/battle/battleLogger'
import type { Pokemon } from '@/types/pokemon/pokemon'

export function createBattleLoggerHelper(
  gs: { state: { playerClass: string | null; avatar_style?: string | null; team: Pokemon[] } },
  activeBattle: { value: unknown },
  attackerSide: { value: 'player' | 'enemy' | null },
  battleLogs: { value: BattleLog[] },
  logQueue: { value: BattleLog[] },
  isProcessingLogs: { value: boolean },
  playerStages: { value: unknown },
  enemyStages: { value: unknown },
  activeMove: { value: unknown },
  initialStages: unknown
) {
  const addLog = (msg: string, type = 'log-info', source: BattleSource | null = null, sideOverride: 'player' | 'enemy' | null = null) => {
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
      
      for (let i = 0; i < batchSize; i++) {
        if (logQueue.value.length === 0) break
        const nextItem = logQueue.value.shift()
        if (nextItem) {
          battleLogs.value.push(nextItem)
          if (battleLogs.value.length > 30) battleLogs.value.shift()
        }
      }

      const delay = logQueue.value.length > 0 ? 100 : 350
      await sleep(delay)
    }
  }

  const clearLogs = () => {
    battleLogs.value = []
    logQueue.value = []
    isProcessingLogs.value = false
    playerStages.value = { ...(initialStages as Record<string, number>) }
    enemyStages.value = { ...(initialStages as Record<string, number>) }
    activeMove.value = null
    attackerSide.value = null
  }

  const waitForLogs = async () => {
    while (isProcessingLogs.value || logQueue.value.length > 0) {
      await sleep(100)
    }
  }

  return {
    addLog,
    clearLogs,
    waitForLogs
  }
}
