import { describe, it, expect, vi } from 'vitest'
import { executeHealingItemUsage } from '@/logic/battle/battleHealingItemProcessor'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { AudioStore } from '@/types/system/stores'

describe('battleHealingItemProcessor', () => {
  it('logs failure if healing item has no effect on full hp pokemon', async () => {
    const fullHpPoke = {
      id: 'pikachu',
      name: 'Pikachu',
      hp: 100,
      maxHp: 100,
      status: '',
      moves: [],
    } as unknown as Pokemon

    const logs: string[] = []
    const consumeItem = vi.fn()
    const mockAudio = { play: vi.fn() } as unknown as AudioStore

    const res = await executeHealingItemUsage('potion', fullHpPoke, {
      addLog: (msg) => { logs.push(String(msg)) },
      audio: mockAudio,
      consumeItem,
    })

    expect(res.action).toBe('fail')
    expect(consumeItem).not.toHaveBeenCalled()
    expect(logs).toContain('No tuvo efecto.')
  })
})
