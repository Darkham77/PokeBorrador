import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import '../../helpers/battleMockSetup'
import { decideEnemyMove } from '@/logic/battle/ai/battleAI'
import { useBattleStore } from '@/stores/battle/battle'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleStages } from '@/types/battle/battle'

describe('Enemy AI - Disabled Moves Filtering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should choose the best move under normal circumstances when no request is present', () => {
    const enemy = {
      uid: 'enemy-1',
      name: 'Gengar',
      hp: 100,
      maxHp: 100,
      moves: [
        { id: 'shadowpunch', name: 'Shadow Punch', pp: 20, maxPp: 20, power: 60, type: 'ghost', cat: 'physical' },
        { id: 'belch', name: 'Belch', pp: 10, maxPp: 10, power: 120, type: 'poison', cat: 'special' }
      ]
    } as unknown as Pokemon

    const player = {
      uid: 'player-1',
      name: 'Pikachu',
      hp: 100,
      maxHp: 100
    } as unknown as Pokemon

    const playerStages: BattleStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }

    // The AI should choose one of the valid moves
    const chosenMove = decideEnemyMove(enemy, player, playerStages, false)
    expect(chosenMove).not.toBeNull()
    expect(['shadowpunch', 'belch']).toContain(chosenMove!.id)
  })

  it('should filter out moves that are reported as disabled in the Showdown enemyRequest', () => {
    const enemy = {
      uid: 'enemy-1',
      name: 'Gengar',
      hp: 100,
      maxHp: 100,
      moves: [
        { id: 'shadowpunch', name: 'Shadow Punch', pp: 20, maxPp: 20, power: 60, type: 'ghost', cat: 'physical' },
        { id: 'belch', name: 'Belch', pp: 10, maxPp: 10, power: 120, type: 'poison', cat: 'special' }
      ]
    } as unknown as Pokemon

    const player = {
      uid: 'player-1',
      name: 'Pikachu',
      hp: 100,
      maxHp: 100
    } as unknown as Pokemon

    const playerStages: BattleStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }

    // Mock the activeBattle state to supply the request with Belch disabled (because no berry was eaten)
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
    } as any

    // The AI should now filter out Belch and choose Shadow Punch instead
    const chosenMove = decideEnemyMove(enemy, player, playerStages, false)
    expect(chosenMove).not.toBeNull()
    expect(chosenMove!.id).toBe('shadowpunch')
  })

  it('should return null (struggle fallback trigger) if all moves are disabled in the request', () => {
    const enemy = {
      uid: 'enemy-1',
      name: 'Gengar',
      hp: 100,
      maxHp: 100,
      moves: [
        { id: 'shadowpunch', name: 'Shadow Punch', pp: 20, maxPp: 20, power: 60, type: 'ghost', cat: 'physical' },
        { id: 'belch', name: 'Belch', pp: 10, maxPp: 10, power: 120, type: 'poison', cat: 'special' }
      ]
    } as unknown as Pokemon

    const player = {
      uid: 'player-1',
      name: 'Pikachu',
      hp: 100,
      maxHp: 100
    } as unknown as Pokemon

    const playerStages: BattleStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }

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
    } as any

    const chosenMove = decideEnemyMove(enemy, player, playerStages, false)
    expect(chosenMove).toBeNull()
  })
})
