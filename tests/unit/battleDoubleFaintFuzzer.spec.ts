import { describe, it, expect, vi } from 'vitest'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { resolvePostTurnSwitchesAndFaints } from '@/logic/battle/helpers/turnActionResolver'
import { processPlayerFaintSequence } from '@/logic/battle/battleFaintSequence'

describe('battleDoubleFaintFuzzer (Perish Song / Double KO Resolution)', () => {
  it('calls handleFaint for enemy as well when both player and enemy faint simultaneously', async () => {
    const handleFaint = vi.fn(async (_side: string) => {})
    const fsm = {
      currentState: { value: 'ACTIVE_BATTLE' },
      transition: vi.fn(async () => {})
    }

    const playerMon: Pokemon = {
      id: 'articuno',
      uid: 'p1_mon',
      name: 'Articuno',
      hp: 0,
      maxHp: 200,
      level: 59,
      fainted: true,
      moves: []
    } as unknown as Pokemon

    const enemyMon: Pokemon = {
      id: 'lapras',
      uid: 'p2_mon',
      name: 'Lapras',
      hp: 0,
      maxHp: 250,
      level: 50,
      fainted: true,
      moves: []
    } as unknown as Pokemon

    const healthyBenchMon: Pokemon = {
      id: 'mewtwo',
      uid: 'p1_mewtwo',
      name: 'Mewtwo',
      hp: 200,
      maxHp: 200,
      level: 63,
      fainted: false,
      moves: []
    } as unknown as Pokemon

    const store = {
      activeBattle: {
        value: {
          player: playerMon,
          enemy: enemyMon,
          playerTeam: [playerMon, healthyBenchMon],
          enemyTeam: [enemyMon],
          isTrainer: false,
          over: true,
          winnerResult: 'player'
        }
      },
      fsm,
      BATTLE_STATES: { ACTIVE_BATTLE: 'ACTIVE_BATTLE', EXIT_BATTLE: 'EXIT_BATTLE' },
      BATTLE_SUBSTATES: {
        PLAYER_FAINT_SEQ: 'PLAYER_FAINT_SEQ',
        ENEMY_REPLACEMENT_SEQ: 'ENEMY_REPLACEMENT_SEQ'
      },
      handleFaint
    } as unknown as BattleContext

    await resolvePostTurnSwitchesAndFaints(store, { isOver: true })

    expect(handleFaint).toHaveBeenCalledWith('player')
    expect(handleFaint).toHaveBeenCalledWith('enemy')
  })

  it('triggers terminateBattle when player faints but wild enemy is also down, even if active.over was already true', async () => {
    const terminateBattle = vi.fn(async () => {})
    const transitions: string[] = []
    const fsm = {
      currentState: { value: 'ACTIVE_BATTLE' },
      transition: vi.fn(async (state: string, substate?: string) => {
        transitions.push(`${state}:${substate || ''}`)
      })
    }

    const playerMon: Pokemon = {
      id: 'articuno',
      uid: 'p1_mon',
      name: 'Articuno',
      hp: 0,
      maxHp: 200,
      level: 59,
      fainted: true,
      moves: []
    } as unknown as Pokemon

    const enemyMon: Pokemon = {
      id: 'lapras',
      uid: 'p2_mon',
      name: 'Lapras',
      hp: 0,
      maxHp: 250,
      level: 50,
      fainted: true,
      moves: []
    } as unknown as Pokemon

    const healthyBenchMon: Pokemon = {
      id: 'mewtwo',
      uid: 'p1_mewtwo',
      name: 'Mewtwo',
      hp: 200,
      maxHp: 200,
      level: 63,
      fainted: false,
      moves: []
    } as unknown as Pokemon

    const ctx = {
      activeBattle: {
        value: {
          player: playerMon,
          enemy: enemyMon,
          playerTeam: [playerMon, healthyBenchMon],
          enemyTeam: [enemyMon],
          isTrainer: false,
          over: true, // Already set to true by Showdown |win|Player
          winnerResult: 'player'
        }
      },
      gs: {
        state: {
          team: [playerMon, healthyBenchMon]
        }
      },
      fsm,
      faintedSides: {
        value: new Set<string>()
      },
      addLog: vi.fn(),
      uiStore: {
        isBattleSwitchForced: false
      },
      isProcessing: { value: true },
      isIntroAnimating: { value: true },
      BATTLE_STATES: { ACTIVE_BATTLE: 'ACTIVE_BATTLE' },
      BATTLE_SUBSTATES: {
        PLAYER_FAINT_SEQ: 'PLAYER_FAINT_SEQ',
        RECALL_FLOW: 'RECALL_FLOW',
        POKEMON_RECALL: 'POKEMON_RECALL',
        RENDER_BALL: 'RENDER_BALL',
        VACATE_SEAT: 'VACATE_SEAT',
        FADEOUT_BALL: 'FADEOUT_BALL',
        CHECK_TEAM: 'CHECK_TEAM',
        ALL_FAINTED: 'ALL_FAINTED',
        DEFEAT_SCREEN: 'DEFEAT_SCREEN',
        HAS_HEALTHY: 'HAS_HEALTHY',
        SWITCH_MENU: 'SWITCH_MENU'
      }
    } as unknown as BattleContext

    await processPlayerFaintSequence(ctx, playerMon, { terminateBattle })

    expect(terminateBattle).toHaveBeenCalledWith(ctx, true)
  })
})
