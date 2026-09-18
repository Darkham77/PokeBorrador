/**
 * tests/unit/pokemon/pokemon_evolution_and_breeding_suite.spec.ts
 * Cohesive domain suite consolidating Pokemon breeding engine, evolution store & logic,
 * legendary vigor daycare restrictions & migrations, and Ditto transformation capture preservation.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { 
  checkCompatibility, 
  calculateInheritance, 
  getBreedingBaseId, 
  getFirstEvolution, 
  getEggSpecies, 
  inheritMoves, 
  inheritAbility, 
  calculateShinyChance, 
  getGeneticsForecast 
} from '@/logic/breeding/breedingEngine'
import { useEvolutionStore } from '@/stores/evolution'
import { useBreedingStore } from '@/stores/breeding'
import { useGameStore } from '@/stores/game'
import { SPECIAL_ACTIONS } from '@/logic/battle/actions/specialActions'
import { toPokemonType } from '@/data/battle/types'
import { toNatureId } from '@/data/battle/natures'
import { LEGENDARIES, legacyItemMap, legacyAbilityMap, legacyMoveMap } from '../../helpers/legacyDataMocks.ts'
import type { Pokemon } from '@/types/pokemon/pokemon'

vi.mock('@/logic/db/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) }))
    }))
  }
}))

vi.mock('@/logic/db/sqliteEngine', () => ({
  initSQLite: vi.fn().mockResolvedValue(true)
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { id: 'test-user', db_version: 2 },
    sessionMode: 'offline'
  })
}))

vi.mock('@/logic/evolution/evolutionLogic', () => ({
  evolvePokemonData: vi.fn((pokemon: { id: string; name: string }, targetId: string) => {
    const fromId = pokemon.id
    pokemon.id = targetId
    pokemon.name = targetId.toUpperCase()
    return { pendingMoves: [], fromId, toId: targetId }
  }),
  checkLevelUpEvolution: vi.fn(),
  checkStoneEvolution: vi.fn()
}))

vi.mock('@/logic/providers/pokemonDataProvider', () => ({
  pokemonDataProvider: {
    getPokemonData: vi.fn((id: string) => ({ id, name: id.toUpperCase() }))
  }
}))

describe('Pokemon Evolution & Breeding Domain Suite', () => {
  describe('Breeding Engine - Compatibility & Inheritance', () => {
    describe('getBreedingBaseId', () => {
      it('should require canonical species ids', () => {
        expect(() => getBreedingBaseId('pikachu_m')).toThrow()
        expect(getBreedingBaseId('nidoranf')).toBe('nidoranf')
        expect(getBreedingBaseId('bulbasaur')).toBe('bulbasaur')
      })
    })

    describe('getFirstEvolution', () => {
      it('should find the base form of an evolution line', () => {
        expect(getFirstEvolution('charizard')).toBe('charmander')
        expect(getFirstEvolution('raichu')).toBe('pichu')
        expect(getFirstEvolution('alakazam')).toBe('abra')
      })
    })

    describe('getEggSpecies', () => {
      it('should return baby form if enabled', () => {
        expect(getEggSpecies('pikachu')).toBe('pichu')
        expect(getEggSpecies('raichu')).toBe('pichu')
      })

      it('should return base form if no baby exists', () => {
        expect(getEggSpecies('charmeleon')).toBe('charmander')
      })
    })

    describe('checkCompatibility', () => {
      it('should detect incompatible legendary pokemon', () => {
        const pA = { id: 'mewtwo', gender: null } as unknown as Pokemon
        const pB = { id: 'mew', gender: null } as unknown as Pokemon
        const res = checkCompatibility(pA, pB)
        expect(res.level).toBe(0)
      })

      it('should detect compatible same-species pokemon', () => {
        const pA = { id: 'bulbasaur', gender: 'f' } as unknown as Pokemon
        const pB = { id: 'bulbasaur', gender: 'm' } as unknown as Pokemon
        const res = checkCompatibility(pA, pB)
        expect(res.level).toBe(3)
        expect(res.eggSpecies).toBe('bulbasaur')
      })

      it('should detect compatible different-species same egg-group', () => {
        const pA = { id: 'bulbasaur', gender: 'f' } as unknown as Pokemon
        const pB = { id: 'charmander', gender: 'm' } as unknown as Pokemon
        const res = checkCompatibility(pA, pB)
        expect(res.level).toBe(2)
        expect(res.eggSpecies).toBe('bulbasaur')
      })

      it('should allow breeding with Ditto', () => {
        const pA = { id: 'ditto', gender: null } as unknown as Pokemon
        const pB = { id: 'pikachu', gender: 'm' } as unknown as Pokemon
        const res = checkCompatibility(pA, pB)
        expect(res.level).toBe(2)
        expect(res.eggSpecies).toBe('pichu')
      })
    })

    describe('calculateInheritance', () => {
      it('should inherit forced IV from Power Item', () => {
        const pA = { id: 'pA', ivs: { hp: 31, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 } } as unknown as Pokemon
        const pB = { id: 'pB', ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 } } as unknown as Pokemon
        const res = calculateInheritance(pA, pB, 'powerweight', '')
        expect(res.hp).toBe(31)
      })
    })

    describe('inheritMoves', () => {
      it('should inherit Egg Moves if parents know them', () => {
        const pA = { id: 'charizard', moves: [{ id: 'dragondance', name: 'Dragon Dance', pp: 20, maxPP: 20 }] } as unknown as Pokemon
        const pB = { id: 'charizard', moves: [] } as unknown as Pokemon
        const res = inheritMoves(pA, pB, 'charmander')
        expect(res).toContain('dragondance')
      })

      it('should not inherit moves that are not egg moves', () => {
        const pA = { id: 'charizard', moves: [{ id: 'tackle', name: 'Tackle', pp: 35, maxPP: 35 }] } as unknown as Pokemon
        const pB = { id: 'charizard', moves: [] } as unknown as Pokemon
        const res = inheritMoves(pA, pB, 'charmander')
        expect(res).not.toContain('tackle')
      })
    })

    describe('inheritAbility', () => {
      it('should inherit ability from the mother', () => {
        const pA = { id: 'bulbasaur', gender: 'f', ability: 'chlorophyll' } as unknown as Pokemon
        const pB = { id: 'charmander', gender: 'm', ability: 'blaze' } as unknown as Pokemon
        inheritAbility(pA, pB)
      })
    })

    describe('calculateShinyChance', () => {
      it('should apply Masuda multiplier if parents are foreign', () => {
        const pA = { region: 'US', ot_id: '123' } as unknown as Pokemon
        const pB = { region: 'JP', ot_id: '456' } as unknown as Pokemon
        const chance = calculateShinyChance(pA, pB)
        expect(chance).toBeGreaterThan(1/4096)
      })
    })

    describe('getGeneticsForecast', () => {
      it('should return correct summary for UI', () => {
        const pA = { id: 'pikachu', gender: 'f', moves: [{ id: 'volttackle', name: 'Volt Tackle', pp: 15, maxPP: 15 }], heldItem: 'everstone' } as unknown as Pokemon
        const pB = { id: 'pikachu', gender: 'm', moves: [] } as unknown as Pokemon
        const res = getGeneticsForecast(pA, pB, '')
        expect(res.natureGuaranteed).toBe(true)
        expect(res.eggMovesCount).toBe(1)
        expect(res.ivsInherited).toBe(3)
      })
    })

    describe('getEggSpecies (Hatch Species Guarantee)', () => {
      it('should resolve evolved forms to baby or basic versions for hatching', () => {
        expect(getEggSpecies('raticate')).toBe('rattata')
        expect(getEggSpecies('raichu')).toBe('pichu')
        expect(getEggSpecies('gyarados')).toBe('magikarp')
        expect(getEggSpecies('dragonite')).toBe('dratini')
        expect(getEggSpecies('venusaur')).toBe('bulbasaur')
        expect(getEggSpecies('charizard')).toBe('charmander')
        expect(getEggSpecies('blastoise')).toBe('squirtle')
      })

      it('should ALWAYS resolve to the baby Pokemon for any species in a line with baby form', () => {
        expect(getEggSpecies('roselia')).toBe('budew')
        expect(getEggSpecies('roserade')).toBe('budew')
        expect(getEggSpecies('budew')).toBe('budew')

        expect(getEggSpecies('marill')).toBe('azurill')
        expect(getEggSpecies('azumarill')).toBe('azurill')
        expect(getEggSpecies('azurill')).toBe('azurill')

        expect(getEggSpecies('chansey')).toBe('happiny')
        expect(getEggSpecies('blissey')).toBe('happiny')

        expect(getEggSpecies('snorlax')).toBe('munchlax')

        expect(getEggSpecies('pikachu')).toBe('pichu')
        expect(getEggSpecies('raichu')).toBe('pichu')

        expect(getEggSpecies('clefairy')).toBe('cleffa')
        expect(getEggSpecies('clefable')).toBe('cleffa')

        expect(getEggSpecies('jigglypuff')).toBe('igglybuff')
        expect(getEggSpecies('wigglytuff')).toBe('igglybuff')

        expect(getEggSpecies('electabuzz')).toBe('elekid')
        expect(getEggSpecies('electivire')).toBe('elekid')
        expect(getEggSpecies('magmar')).toBe('magby')
        expect(getEggSpecies('magmortar')).toBe('magby')

        expect(getEggSpecies('hitmonlee')).toBe('tyrogue')
        expect(getEggSpecies('hitmonchan')).toBe('tyrogue')
        expect(getEggSpecies('hitmontop')).toBe('tyrogue')

        expect(getEggSpecies('jynx')).toBe('smoochum')
        expect(getEggSpecies('sudowoodo')).toBe('bonsly')
        expect(getEggSpecies('chimecho')).toBe('chingling')
        expect(getEggSpecies('mantine')).toBe('mantyke')
        expect(getEggSpecies('lucario')).toBe('riolu')
        expect(getEggSpecies('wobbuffet')).toBe('wynaut')
        expect(getEggSpecies('mrmime')).toBe('mimejr')
        expect(getEggSpecies('togetic')).toBe('togepi')
        expect(getEggSpecies('togekiss')).toBe('togepi')
        expect(getEggSpecies('toxtricity')).toBe('toxel')
      })
    })
  })

  describe('Evolution System Store', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      vi.clearAllMocks()
    })

    it('debe iniciar la secuencia de evolución correctamente', () => {
      const evoStore = useEvolutionStore()
      const p = { id: 'bulbasaur', name: 'Bulba' } as unknown as Pokemon
      
      evoStore.startEvolution(p, 'ivysaur')
      
      expect(evoStore.isEvolving).toBe(true)
      expect(evoStore.sourcePokemon).toStrictEqual(p)
      expect(evoStore.targetId).toBe('ivysaur')
    })

    it('debe transformar al pokémon y registrarlo en la Pokedex', () => {
      const evoStore = useEvolutionStore()
      const gameStore = useGameStore()
      const p = { id: 'bulbasaur', name: 'Bulba' } as unknown as Pokemon
      
      evoStore.startEvolution(p, 'ivysaur')
      evoStore.evolve()
      
      expect(p.id).toBe('ivysaur')
      expect(p.name).toBe('IVYSAUR')
      expect(gameStore.state.pokedex).toContain('ivysaur')
    })

    it('debe limpiar el estado al finalizar', () => {
      const evoStore = useEvolutionStore()
      const p = { id: 'bulbasaur', name: 'Bulba' } as unknown as Pokemon
      
      evoStore.startEvolution(p, 'ivysaur')
      evoStore.finishEvolution()
      
      expect(evoStore.isEvolving).toBe(false)
      expect(evoStore.sourcePokemon).toBeNull()
    })
  })

  describe('Legendary Vigor Daycare Block & DB Migration', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('should prevent legendary pokemon from being deposited in daycare', async () => {
      const breedingStore = useBreedingStore()
      const legendaryMock: Pokemon = {
        uid: 'mewtwo-test',
        id: 'mewtwo',
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
            vigor: 12,
            ability: 'synchronize',
            moves: []
          }
        ],
        box: [
          {
            uid: 'zapdos-test',
            id: 'zapdos',
            name: 'Zapdos',
            vigor: 8,
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
        
        if (p.id && legendaries.has(p.id.toLowerCase())) {
          p.vigor = 0
        }
        
        if (p.heldItem) {
          const itemKey = p.heldItem.toLowerCase().trim()
          if (legacyItemMap[itemKey]) {
            p.heldItem = legacyItemMap[itemKey]!
          }
        }
        
        if (p.ability) {
          const abKey = p.ability.toLowerCase().trim()
          if (legacyAbilityMap[abKey]) {
            p.ability = legacyAbilityMap[abKey]!
          }
        }
        
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

      mockSaveData.team.forEach(migratePoke)
      mockSaveData.box.forEach(migratePoke)

      const mew = mockSaveData.team.find(p => p.id === 'mew')
      expect(mew?.vigor).toBe(0)

      const pikachu = mockSaveData.team.find(p => p.id === 'pikachu')
      expect(pikachu?.vigor).toBe(20)

      const zapdos = mockSaveData.box.find(p => p.id.toLowerCase() === 'zapdos')
      expect(zapdos?.vigor).toBe(0)

      const bulbasaur = mockSaveData.box.find(p => p.id === 'bulbasaur')
      expect(bulbasaur?.vigor).toBe(20)

      expect(pikachu?.heldItem).toBe('potion')
      expect(pikachu?.ability).toBe('runaway')
      expect(pikachu?.moves?.[0]?.id).toBe('sleeppowder')

      expect(bulbasaur?.heldItem).toBe('vigorcandy')
      expect(bulbasaur?.ability).toBe('healer')
      expect(bulbasaur?.moves?.[0]?.id).toBe('bulletseed')
    })
  })

  describe('Ditto Pre-Transformation Capture Preservation', () => {
    it('should transform Ditto, store its original stats, and restore them upon capture', async () => {
      const ditto: Pokemon = {
        uid: 'ditto-test',
        id: 'ditto',
        name: 'Ditto',
        level: 30,
        vigor: 20,
        status: '',
        type: 'normal',
        hp: 80,
        maxHp: 80,
        atk: 48,
        def: 48,
        spa: 48,
        spd: 48,
        spe: 48,
        moves: [
          { id: 'transform', name: 'Transformación', pp: 10, maxPP: 10 }
        ],
        ivs: { hp: 31, atk: 25, def: 20, spa: 15, spd: 10, spe: 5 },
        nature: 'hardy',
        ability: 'limber',
        isShiny: true,
        exp: 0,
        expNeeded: 1000
      }

      const pikachu: Pokemon = {
        uid: 'pikachu-test',
        id: 'pikachu',
        name: 'Pikachu',
        level: 25,
        vigor: 20,
        status: '',
        isShiny: false,
        type: 'electric',
        hp: 60,
        maxHp: 60,
        atk: 55,
        def: 40,
        spa: 50,
        spd: 40,
        spe: 90,
        moves: [
          { id: 'thunderbolt', name: 'Rayo', pp: 15, maxPP: 15 }
        ],
        ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
        nature: 'jolly',
        ability: 'static',
        exp: 0,
        expNeeded: 500
      }

      const logs: string[] = []
      const addLogFn = (msg: string) => { logs.push(msg) }

      const dummyStages = {
        atk: 0,
        def: 0,
        spa: 0,
        spd: 0,
        spe: 0,
        accuracy: 0,
        evasion: 0,
        reflect: 0,
        lightScreen: 0,
        safeguard: 0,
        mist: 0,
        spikes: 0
      }
      SPECIAL_ACTIONS.transform!(ditto, pikachu, dummyStages, dummyStages, addLogFn)

      expect(ditto.isTransformed).toBe(true)
      expect(ditto.id).toBe('pikachu')
      expect(ditto.name).toBe('Pikachu')
      expect(ditto.level).toBe(30)
      
      const dittoAny = ditto as unknown as Record<string, unknown>
      expect(dittoAny.originalDitto).toBeDefined()
      const origDitto = dittoAny.originalDitto as Record<string, unknown>
      expect(origDitto.id).toBe('ditto')
      expect(origDitto.isShiny).toBe(true)
      const origIvs = origDitto.ivs as Record<string, unknown>
      expect(origIvs.hp).toBe(31)

      const e = ditto
      const eAny = e as unknown as Record<string, unknown>
      if (e.isTransformed && eAny.originalDitto) {
        const orig = eAny.originalDitto as Record<string, unknown>
        e.id = orig.id as Pokemon['id']
        e.name = orig.name as string
        e.type = toPokemonType(orig.type as string)
        e.type2 = orig.type2 ? toPokemonType(orig.type2 as string) : undefined
        e.atk = orig.atk as number
        e.def = orig.def as number
        e.spa = orig.spa as number
        e.spd = orig.spd as number
        e.spe = orig.spe as number
        e.moves = orig.moves as unknown as (import('@/types/pokemon/pokemon').Move | null)[]
        e.ivs = orig.ivs as unknown as import('@/types/pokemon/pokemon').PokemonIVs
        e.isShiny = orig.isShiny as boolean
        e.level = orig.level as number
        e.nature = toNatureId(orig.nature as string)
        e.ability = orig.ability as Pokemon['ability']
        e.hp = orig.hp as number
        e.maxHp = orig.maxHp as number
        e.isTransformed = false
        delete eAny.originalDitto
      }

      expect(ditto.isTransformed).toBe(false)
      expect(ditto.id).toBe('ditto')
      expect(ditto.name).toBe('Ditto')
      expect(ditto.level).toBe(30)
      expect(ditto.isShiny).toBe(true)
      expect(ditto.ivs?.hp).toBe(31)
      expect(ditto.ivs?.spe).toBe(5)
    })
  })
})
