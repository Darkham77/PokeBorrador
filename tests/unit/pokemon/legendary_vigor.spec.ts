/**
 * tests/unit/legendary_vigor.spec.ts
 * Verifies that legendary pokemon are sanitized to 0 vigor, correctly blocked from daycare,
 * and that legacy database properties are cleanly patched using the database migration rules.
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useBreedingStore } from '@/stores/breeding'
import { createPinia, setActivePinia } from 'pinia'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { LEGENDARIES, legacyItemMap, legacyAbilityMap, legacyMoveMap } from '../../helpers/legacyDataMocks.ts'

describe('Legendary Vigor Daycare Block & DB Migration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should prevent legendary pokemon from being deposited in daycare', async () => {
    const breedingStore = useBreedingStore()
    const legendaryMock: Pokemon = {
      uid: 'mewtwo-test',
      id: 'mewtwo',
      species: 'mewtwo',
      name: 'Mewtwo',
      level: 70,
      vigor: 0,
      status: '',
      isShiny: false,
      type: 'psychic',
      hp: 200,
      maxHp: 200,
      atk: 150,
      def: 120,
      spa: 180,
      spd: 120,
      spe: 150,
      moves: [],
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      nature: 'modest',
      ability: 'pressure',
      exp: 0,
      expNeeded: 1000
    }

    const result = await breedingStore.deposit(legendaryMock, 0)
    expect(result).toBe(false)
  })

  it('should run database migration simulator and fix legendaries, moves, items, and abilities', () => {
    const mockSaveData = {
      trainer: 'TestTrainer',
      team: [
        {
          uid: 'pikachu-test',
          id: 'pikachu',
          name: 'Pikachu',
          vigor: 20,
          heldItem: 'potion',
          ability: 'runaway',
          moves: [
            { id: 'somnifera', name: 'Somnífera' },
            { id: 'tackle', name: 'Placaje' }
          ]
        },
        {
          uid: 'mew-test',
          id: 'mew',
          name: 'Mew',
          vigor: 12, // Legendary: should be coerced to 0
          ability: 'synchronize',
          moves: []
        }
      ],
      box: [
        {
          uid: 'zapdos-test',
          id: 'zapdos',
          name: 'Zapdos',
          vigor: 8, // Legendary: should be coerced to 0
          ability: 'pressure',
          moves: []
        },
        {
          uid: 'bulbasaur-test',
          id: 'bulbasaur',
          name: 'Bulbasaur',
          vigor: 20,
          heldItem: 'caramelo_vigor',
          ability: 'healer',
          moves: [
            { id: 'recurrente', name: 'Recurrente' }
          ]
        }
      ]
    }

    // JS simulator of the PostgreSQL migration rules
    const legendaries = LEGENDARIES

    interface MockPoke {
      id?: string
      vigor?: number
      heldItem?: string
      ability?: string
      moves?: { id: string; name: string }[]
    }

    const migratePoke = (p: MockPoke) => {
      if (!p) return
      
      // 1. Force legendary vigor to 0
      if (p.id && legendaries.has(p.id.toLowerCase())) {
        p.vigor = 0
      }
      
      // 2. Map held items
      if (p.heldItem) {
        const itemKey = p.heldItem.toLowerCase().trim()
        if (legacyItemMap[itemKey]) {
          p.heldItem = legacyItemMap[itemKey]!
        }
      }
      
      // 3. Map abilities
      if (p.ability) {
        const abKey = p.ability.toLowerCase().trim()
        if (legacyAbilityMap[abKey]) {
          p.ability = legacyAbilityMap[abKey]!
        }
      }
      
      // 4. Map moves
      if (p.moves && Array.isArray(p.moves)) {
        p.moves.forEach((m: { id: string; name: string }) => {
          if (m && m.id) {
            const moveKey = m.id.toLowerCase().replace(/[\s_-]+/g, '_').trim()
            if (legacyMoveMap[moveKey]) {
              m.id = legacyMoveMap[moveKey]!
            }
          }
        })
      }
    }

    // Apply migration rules to mock database team and box
    mockSaveData.team.forEach(migratePoke)
    mockSaveData.box.forEach(migratePoke)

    // Verification: Legendaries Vigor
    const mew = mockSaveData.team.find(p => p.id === 'mew')
    expect(mew?.vigor).toBe(0)

    const pikachu = mockSaveData.team.find(p => p.id === 'pikachu')
    expect(pikachu?.vigor).toBe(20)

    const zapdos = mockSaveData.box.find(p => p.id.toLowerCase() === 'zapdos')
    expect(zapdos?.vigor).toBe(0)

    const bulbasaur = mockSaveData.box.find(p => p.id === 'bulbasaur')
    expect(bulbasaur?.vigor).toBe(20)

    // Verification: Mapped legacy properties (Pikachu)
    expect(pikachu?.heldItem).toBe('potion')
    expect(pikachu?.ability).toBe('runaway')
    expect(pikachu?.moves?.[0]?.id).toBe('sleeppowder')

    // Verification: Mapped legacy properties (Bulbasaur)
    expect(bulbasaur?.heldItem).toBe('vigorcandy')
    expect(bulbasaur?.ability).toBe('healer')
    expect(bulbasaur?.moves?.[0]?.id).toBe('bulletseed')
  })
})
