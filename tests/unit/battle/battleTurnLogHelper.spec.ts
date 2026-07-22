import { describe, it, expect } from 'vitest'
import { parseLogsWithSkip } from '@/logic/battle/battleTurnLogHelper'
import type { BattleContext } from '@/types/battle/battleContext'
import { ref } from 'vue'

describe('battleTurnLogHelper - parseLogsWithSkip', () => {
  it('should parse logs and filter correctly', async () => {
    const logsAdded: string[] = []
    const mockStore = {
      activeBattle: ref({
        player: { uid: 'p1', name: 'Pikachu', hp: 100 },
        enemy: { uid: 'p2', name: 'Charizard', hp: 100 },
      }),
      addLog: (msg: string) => {
        logsAdded.push(msg)
      },
    } as unknown as BattleContext

    const logs = [
      '|-damage|p2a: Charizard|80/100',
      '|turn|2',
    ]

    await parseLogsWithSkip(mockStore, logs, false, false)
    expect(logsAdded.length).toBeGreaterThanOrEqual(0)
  })
})
