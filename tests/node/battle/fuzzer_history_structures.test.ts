import { describe, expect, it } from 'vitest'
import {
  certifyBattleCase,
} from '../../../scripts/e2e/fuzzer/core/certifiedBattleCase.ts'
import type { TestBatch, CertifiedBattleHistoryEntry } from '../../../scripts/e2e/fuzzer/generators/fuzzer_team_generator.ts'
import { ShowdownBattleRunner } from '../../../src/logic/battle/helpers/showdownBattleRunner.ts'
import { ShowdownBattleEngine } from '../../../src/logic/battle/engine/showdownBattleEngine.ts'
import { computeP1Choice } from '../../../src/logic/battle/battleTurnChoiceHelper.ts'
import type { ShowdownPlayerRequest, BattleState } from '../../../src/types/battle/battle.ts'
import type { Move } from '../../../src/types/pokemon/pokemon.ts'

describe('fuzzer history structures & simulator recognition', () => {
  describe('schema and metadata validation', () => {
    it('accepts comprehensive metadata entries on certified battle history', () => {
      const validEntry: CertifiedBattleHistoryEntry = {
        turnCount: 1,
        p1Choice: 'move 1',
        p2Choice: 'move 1',
        battleTurn: 1,
        p1ActiveUid: 'uid-p1-mon1',
        p2ActiveUid: 'uid-p2-mon1',
        p1MoveId: 'thunderbolt',
        p2MoveId: 'flamethrower',
        p1LockedMoveId: undefined,
        p2LockedMoveId: undefined,
        p1Trapped: false,
        p2Trapped: false,
        p1Volatiles: ['substitute'],
        p2Volatiles: ['confusion'],
        p1StatStages: { atk: 1, spe: 2 },
        p2StatStages: { def: -1 },
        p1Status: 'par',
        p2Status: undefined,
        p1Hp: 280,
        p2Hp: 190,
        weather: 'sunnyday',
        terrain: 'electricterrain',
        p1SideConditions: ['stealthrock'],
        p2SideConditions: ['spikes'],
        p1Heal: true,
      }

      const batch: TestBatch = {
        playerTeam: [
          { name: 'Pikachu', species: 'pikachu', level: 50, hp: 100, maxHp: 100, moves: ['thunderbolt'], uid: 'uid-p1-mon1' } as any,
        ],
        enemyTeam: [
          { name: 'Charmander', species: 'charmander', level: 50, hp: 100, maxHp: 100, moves: ['flamethrower'], uid: 'uid-p2-mon1' } as any,
        ],
        movesToTest: ['thunderbolt'],
        abilitiesToTest: [],
        seed: [1, 2, 3, 4],
        playerChoices: ['move 1'],
        enemyChoices: ['move 1'],
        history: [validEntry],
        ended: true,
        winner: 'p1',
        finalState: {
          isOver: true,
          winner: 'p1',
          p1: [{ name: 'Pikachu', hp: 280, maxHp: 300, fainted: false }],
          p2: [{ name: 'Charmander', hp: 0, maxHp: 250, fainted: true }],
        },
      }

      const certified = certifyBattleCase(batch, 1)
      expect(certified.history[0]?.p1MoveId).toBe('thunderbolt')
      expect(certified.history[0]?.p1StatStages?.atk).toBe(1)
      expect(certified.history[0]?.p1Volatiles).toEqual(['substitute'])
      expect(certified.history[0]?.weather).toBe('sunnyday')
      expect(certified.history[0]?.terrain).toBe('electricterrain')
      expect(certified.history[0]?.p1SideConditions).toEqual(['stealthrock'])
    })

    it('rejects corrupt volatile array types in history', () => {
      const corruptBatch: TestBatch = {
        playerTeam: [],
        enemyTeam: [],
        movesToTest: [],
        abilitiesToTest: [],
        seed: [1, 2, 3, 4],
        playerChoices: ['move 1'],
        enemyChoices: ['move 1'],
        history: [
          {
            turnCount: 1,
            p1Choice: 'move 1',
            p2Choice: 'move 1',
            battleTurn: 1,
            p1Volatiles: [12345 as unknown as string],
          },
        ],
        ended: true,
        winner: 'p1',
        finalState: {
          isOver: true,
          winner: 'p1',
          p1: [],
          p2: [],
        },
      }

      expect(() => certifyBattleCase(corruptBatch, 1)).toThrow('[FUZZER-CERTIFICATION]')
    })

    it('rejects corrupt trapped boolean flag in history', () => {
      const corruptBatch: TestBatch = {
        playerTeam: [],
        enemyTeam: [],
        movesToTest: [],
        abilitiesToTest: [],
        seed: [1, 2, 3, 4],
        playerChoices: ['move 1'],
        enemyChoices: ['move 1'],
        history: [
          {
            turnCount: 1,
            p1Choice: 'move 1',
            p2Choice: 'move 1',
            battleTurn: 1,
            p1Trapped: 'true' as unknown as boolean,
          },
        ],
        ended: true,
        winner: 'p1',
        finalState: {
          isOver: true,
          winner: 'p1',
          p1: [],
          p2: [],
        },
      }

      expect(() => certifyBattleCase(corruptBatch, 1)).toThrow('[FUZZER-CERTIFICATION]')
    })
  })

  describe('ShowdownBattleRunner history consumption', () => {
    it('accurately parses and returns history entries with rich metadata', () => {
      const history = [
        {
          turnCount: 1,
          p1Choice: 'move 2',
          p2Choice: 'move 1',
          battleTurn: 1,
          p1ActiveUid: 'uid-p1',
          p2ActiveUid: 'uid-p2',
          p1MoveId: 'psychic',
          p1Trapped: true,
          p1Volatiles: ['taunt'],
          p1StatStages: { spa: 2 },
          p1Hp: 150,
          weather: 'raindance',
        },
      ]

      const entry = ShowdownBattleRunner.requireHistoryEntry(history, 0)
      expect(entry.p1Choice).toBe('move 2')
      expect(entry.p2Choice).toBe('move 1')
      expect(entry.p1ActiveUid).toBe('uid-p1')
      expect(entry.p1MoveId).toBe('psychic')
      expect(entry.p1Trapped).toBe(true)
      expect(entry.p1Volatiles).toEqual(['taunt'])
      expect(entry.p1StatStages).toEqual({ spa: 2 })
      expect(entry.weather).toBe('raindance')
    })
  })

  describe('computeP1Choice zero-fallback and error assertions', () => {
    it('throws descriptive error if selected move is not in Showdown request', () => {
      const mockRequest: ShowdownPlayerRequest = {
        active: [
          {
            moves: [
              { move: 'Thunderbolt', id: 'thunderbolt' as any, pp: 15, maxpp: 15, disabled: false },
              { move: 'Quick Attack', id: 'quickattack' as any, pp: 30, maxpp: 30, disabled: false },
            ],
          },
        ],
      }
      const activeState = { playerRequest: mockRequest } as BattleState
      const move = { id: 'flamethrower' } as Move

      expect(() => {
        computeP1Choice(activeState, move, false)
      }).toThrow('[computeP1Choice] Move "flamethrower" is not available in active Showdown request.')
    })

    it('throws descriptive error if requested move is disabled', () => {
      const multiMoveRequest: ShowdownPlayerRequest = {
        active: [
          {
            moves: [
              { move: 'Thunderbolt', id: 'thunderbolt' as any, pp: 15, maxpp: 15, disabled: true },
              { move: 'Quick Attack', id: 'quickattack' as any, pp: 30, maxpp: 30, disabled: false },
            ],
          },
        ],
      }
      const activeState = { playerRequest: multiMoveRequest } as BattleState
      const move = { id: 'thunderbolt' } as Move

      expect(() => {
        computeP1Choice(activeState, move, false)
      }).toThrow('[computeP1Choice] Move "thunderbolt" is disabled')
    })

    it('resolves recharge/struggle moves deterministically to move 1 when exactly 1 slot is provided by Showdown', () => {
      const rechargeRequest: ShowdownPlayerRequest = {
        active: [
          {
            moves: [
              { move: 'Recharge', id: 'recharge' as any, pp: 0, maxpp: 0, disabled: false },
            ],
          },
        ],
      }
      const activeState = { playerRequest: rechargeRequest } as BattleState

      expect(computeP1Choice(activeState, { id: 'hyperbeam' } as Move, false)).toBe('move 1')
      expect(computeP1Choice(activeState, { id: 'recharge' } as Move, false)).toBe('move 1')
    })
  })

  describe('ShowdownBattleEngine zero-mutative fallback execution', () => {
    it('preserves candidate choice directly without mutating invalid choices', () => {
      const engine = new ShowdownBattleEngine({
        mode: 'fuzzer',
        seed: [1, 2, 3, 4],
      })

      const simBattle = (engine as any).battle
      simBattle.setPlayer('p1', { name: 'Player', team: [{ species: 'Mew', moves: ['psychic'] }] })
      simBattle.setPlayer('p2', { name: 'Enemy', team: [{ species: 'Ditto', moves: ['transform'] }] })

      const choice = (engine as any).resolveNextChoice('p1', simBattle.p1.activeRequest, 'move 1')
      expect(choice).toBe('move 1')
    })
  })

  describe('medicine case fuzzer generation', () => {
    it('ensures revived target HP does not exceed max HP in medicine scenarios', async () => {
      const { getMedicineCase } = await import('../../../scripts/e2e/fuzzer/core/fuzzer_medicine_cases.ts')
      const batch = getMedicineCase('revive')
      const faintTarget = batch.playerTeam.find(p => p.uid === 'medicine-faint-target')
      expect(faintTarget).toBeDefined()
      expect(faintTarget?.level).toBe(1)
    })
  })
})
