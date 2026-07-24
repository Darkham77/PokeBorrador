import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import '../../helpers/battleMockSetup'
import { decideEnemyMove } from '@/logic/battle/ai/battleAI'
import { useBattleStore } from '@/stores/battle/battle'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleStages, BattleState } from '@/types/battle/battle'

describe('Enemy AI - Disabled Moves Filtering', () => {
  let enemy: Pokemon;
  let player: Pokemon;
  let playerStages: BattleStages;

  beforeEach(() => {
    setActivePinia(createPinia())

    enemy = {
      id: 'gengar',
      name: 'Gengar',
      level: 50,
      moves: [
        { id: 'shadowpunch', name: 'Shadow Punch', pp: 10, maxPP: 10 },
        { id: 'belch', name: 'Belch', pp: 5, maxPP: 5 }
      ]
    } as unknown as Pokemon

    player = {
      id: 'mew',
      name: 'Mew',
      level: 50,
      moves: []
    } as unknown as Pokemon

    playerStages = {
      atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0,
      reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
    }
  })

  it('should choose the best move under normal circumstances when no request is present', () => {
    // The AI should choose one of the valid moves
    const chosenMove = decideEnemyMove(enemy, player, playerStages, false)
    expect(chosenMove).not.toBeNull()
    expect(['shadowpunch', 'belch']).toContain(chosenMove!.id)
  })

  it('should filter out moves disabled by Showdown activeRequest', () => {
    const battleStore = useBattleStore()
    battleStore.state = {
      enemyRequest: {
        active: [
          {
            moves: [
              { id: 'shadowpunch', disabled: false },
              { id: 'belch', disabled: true } // Belch is disabled!
            ]
          }
        ]
      }
    } as unknown as BattleState

    // The AI should now filter out Belch and choose Shadow Punch instead
    const chosenMove = decideEnemyMove(enemy, player, playerStages, false)
    expect(chosenMove).not.toBeNull()
    expect(chosenMove!.id).toBe('shadowpunch')
  })

  it('should return null (struggle fallback trigger) if all moves are disabled in the request', () => {
    const battleStore = useBattleStore()
    battleStore.state = {
      enemyRequest: {
        active: [
          {
            moves: [
              { id: 'shadowpunch', disabled: true },
              { id: 'belch', disabled: true }
            ]
          }
        ]
      }
    } as unknown as BattleState

    const chosenMove = decideEnemyMove(enemy, player, playerStages, false)
    expect(chosenMove).toBeNull()
  })
})
