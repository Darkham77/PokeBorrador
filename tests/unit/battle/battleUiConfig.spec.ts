import { describe, it, expect } from 'vitest'
import {
  BATTLE_MODES,
  createBattleUiConfig
} from '@/types/battle/battleConfig'

describe('BattleUiConfig', () => {
  it('defines the canonical tuple of battle modes', () => {
    expect(BATTLE_MODES).toEqual([
      'wild',
      'trainer',
      'gym',
      'faction_war',
      'pvp_casual',
      'pvp_ranked',
      'pvp_spectator',
      'replay'
    ])
  })

  it('generates correct UI config for wild battles', () => {
    const config = createBattleUiConfig('wild')
    expect(config.mode).toBe('wild')
    expect(config.showTurnTimer).toBe(false)
    expect(config.allowBag).toBe(true)
    expect(config.allowCatch).toBe(true)
    expect(config.allowFlee).toBe(true)
    expect(config.allowForfeit).toBe(false)
    expect(config.showTeamPreview).toBe(false)
    expect(config.showLeaderDialogue).toBe(false)
    expect(config.enableContinuousSearch).toBe(true)
    expect(config.showActionButtons).toBe(true)
    expect(config.showSpectatorBadge).toBe(false)
    expect(config.showReplayControls).toBe(false)
  })

  it('generates correct UI config for trainer battles', () => {
    const config = createBattleUiConfig('trainer')
    expect(config.mode).toBe('trainer')
    expect(config.showTurnTimer).toBe(false)
    expect(config.allowBag).toBe(true)
    expect(config.allowCatch).toBe(false)
    expect(config.allowFlee).toBe(false)
    expect(config.allowForfeit).toBe(false)
    expect(config.showLeaderDialogue).toBe(false)
    expect(config.enableContinuousSearch).toBe(false)
  })

  it('generates correct UI config for gym battles', () => {
    const config = createBattleUiConfig('gym')
    expect(config.mode).toBe('gym')
    expect(config.showTurnTimer).toBe(false)
    expect(config.allowBag).toBe(true)
    expect(config.allowCatch).toBe(false)
    expect(config.allowFlee).toBe(false)
    expect(config.allowForfeit).toBe(false)
    expect(config.showLeaderDialogue).toBe(true)
    expect(config.enableContinuousSearch).toBe(false)
  })

  it('generates correct UI config for casual and ranked PvP battles', () => {
    const casual = createBattleUiConfig('pvp_casual')
    expect(casual.mode).toBe('pvp_casual')
    expect(casual.showTurnTimer).toBe(true)
    expect(casual.allowBag).toBe(false)
    expect(casual.allowCatch).toBe(false)
    expect(casual.allowFlee).toBe(false)
    expect(casual.allowForfeit).toBe(true)
    expect(casual.showTeamPreview).toBe(true)
    expect(casual.showLeaderDialogue).toBe(false)
    expect(casual.enableContinuousSearch).toBe(false)
    expect(casual.showActionButtons).toBe(true)
    expect(casual.showSpectatorBadge).toBe(false)
    expect(casual.showReplayControls).toBe(false)

    const ranked = createBattleUiConfig('pvp_ranked')
    expect(ranked.mode).toBe('pvp_ranked')
    expect(ranked.showTurnTimer).toBe(true)
    expect(ranked.allowBag).toBe(false)
    expect(ranked.allowCatch).toBe(false)
    expect(ranked.allowFlee).toBe(false)
    expect(ranked.allowForfeit).toBe(true)
    expect(ranked.showTeamPreview).toBe(true)
  })

  it('generates correct UI config for live spectator mode', () => {
    const config = createBattleUiConfig('pvp_spectator')
    expect(config.mode).toBe('pvp_spectator')
    expect(config.showTurnTimer).toBe(true)
    expect(config.allowBag).toBe(false)
    expect(config.allowCatch).toBe(false)
    expect(config.allowFlee).toBe(false)
    expect(config.allowForfeit).toBe(false)
    expect(config.showActionButtons).toBe(false)
    expect(config.showSpectatorBadge).toBe(true)
    expect(config.showReplayControls).toBe(false)
  })

  it('generates correct UI config for replay mode', () => {
    const config = createBattleUiConfig('replay')
    expect(config.mode).toBe('replay')
    expect(config.showTurnTimer).toBe(false)
    expect(config.allowBag).toBe(false)
    expect(config.allowCatch).toBe(false)
    expect(config.allowFlee).toBe(false)
    expect(config.allowForfeit).toBe(false)
    expect(config.showActionButtons).toBe(false)
    expect(config.showSpectatorBadge).toBe(false)
    expect(config.showReplayControls).toBe(true)
  })

  it('allows overriding specific flags via options parameter', () => {
    const custom = createBattleUiConfig('wild', { allowCatch: false, enableContinuousSearch: false })
    expect(custom.allowCatch).toBe(false)
    expect(custom.enableContinuousSearch).toBe(false)
    expect(custom.allowFlee).toBe(true)
  })
})
