import { describe, it, expect } from 'vitest'
import { buildActivePlayerItemBuffs, formatEventBonusDescription } from '@/stores/battle/buffsHelper'
import type { GameState } from '@/types/system/game'
import type { Event as GameEvent, EventConfig } from '@/logic/events/eventEngine'

describe('buffsHelper', () => {
  it('builds active player item buffs when timers are active', () => {
    const dummyState = {
      repelSecs: 120,
      fishingRodSecs: 300,
      fishingRodType: 'super',
      shinyBoostSecs: 600,
      amuletCoinSecs: 0,
      luckyEggSecs: 0,
      safariTicketSecs: 0,
      ceruleanTicketSecs: 0,
      articunoTicketSecs: 0,
      mewtwoTicketSecs: 0,
      ivScannerSecs: 0,
      pickaxeSecs: 0,
      brushSecs: 0,
      incenseSecs: 0,
    } as unknown as GameState

    const buffs = buildActivePlayerItemBuffs(dummyState)
    expect(buffs.length).toBe(3)
    expect(buffs.map(b => b.id)).toEqual(['repel', 'fishing-rod', 'shiny'])
  })

  it('formats event bonus description with multiple multipliers', () => {
    const mockConfig: EventConfig = {
      shinyMult: 2,
      expMult: 1.5,
      moneyMult: 2,
    }
    const mockRow: GameEvent = {
      id: 'test_event',
      name: 'Super Event',
      type: 'general',
      icon: '🎉',
      config: JSON.stringify(mockConfig),
    } as unknown as GameEvent

    const desc = formatEventBonusDescription(mockConfig, mockRow, null)
    expect(desc).toContain('✨ x2 Shiny')
    expect(desc).toContain('⚡ x1.5 EXP')
    expect(desc).toContain('💰 x2 Dinero')
  })
})
