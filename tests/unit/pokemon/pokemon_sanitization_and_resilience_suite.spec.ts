/**
 * tests/unit/pokemon/pokemon_sanitization_and_resilience_suite.spec.ts
 * Cohesive domain suite consolidating Pokemon resilience, save sanitization safeguards,
 * disabled/unreleased species purging, stats recalculation, and buff timer clamps.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { checkPokemonLegality, repairPokemonLegality } from '@/logic/pokemon/pokemonLegality'
import { validateAndSanitize } from '@/logic/auth/saveSanitizer'
import { filterAndSortPokemon } from '@/logic/pokemon/pokemonSelectionFilter'
import { auditAndRepairSaveData } from '../../../scripts/maintenance/repair_account_legality.ts'
import { recalcPokemonStats } from '@/logic/pokemon/pokemonFactory'
import { BUFF_FIELDS, getMaxBuffDuration } from '@/data/inventory/items'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { SaveDataDto } from '@/logic/validation/schemas'

function createTestSave(team: Pokemon[]): SaveDataDto {
  return {
    trainer: 'Ash',
    gender: 'h',
    badges: 0,
    balls: 5,
    money: 1000,
    battleCoins: 0,
    trainerLevel: 1,
    trainerExp: 0,
    trainerExpNeeded: 100,
    inventory: {},
    team: team as any,
    box: [],
    eggs: [],
    pokedex: [],
    seenPokedex: [],
    defeatedGyms: [],
    starterChosen: true,
    eloRating: 1000,
    pvpStats: { wins: 0, losses: 0, draws: 0 },
    rankedMaxElo: 1000,
    passiveTeamActive: false,
    daycare_mission_refreshes: 3,
    boxCount: 4,
    classLevel: 1,
    classXP: 0,
    classData: {
      captureStreak: 0,
      longestStreak: 0,
      reputation: 0,
      blackMarketSales: 0,
      criminality: 0
    },
    warCoins: 0,
    warCoinsSpent: 0,
    lastPokemonCenterHeal: 0,
    playtime: 0
  }
}

describe('Pokemon Sanitization & Resilience Domain Suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Pokemon Resilience & Save Safeguards', () => {
    it('sanitizes a save with illegal pokemon gracefully by marking isIllegal without crashing save load', () => {
      const mockMon: Pokemon = {
        uid: 'test-poke-corrupt',
        id: 'rayquazamega',
        species: 'rayquazamega',
        name: 'Rayquaza',
        level: 50,
        exp: 0,
        expNeeded: 100,
        hp: 100,
        maxHp: 100,
        atk: 100,
        def: 100,
        spa: 100,
        spd: 100,
        spe: 100,
        type: 'dragon',
        status: '',
        isShiny: false,
        vigor: 100,
        maxVigor: 100,
        moves: [{ id: 'spore' as any, name: 'Espora', pp: 15, maxPP: 15 }],
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        nature: 'adamant',
        ability: 'deltastream' as any
      } as unknown as Pokemon

      const mockSave = createTestSave([mockMon])

      const result = validateAndSanitize(mockSave)
      expect(result.valid).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.team[0]?.isIllegal).toBe(true)
      expect(result.data?.team[0]?.illegalReasons?.length).toBeGreaterThan(0)
    })

    it('allows volatile search in battle switch mode without persisting', () => {
      const p1 = {
        uid: 'p-1',
        id: 'pikachu',
        name: 'Pikachu',
        hp: 100,
        maxHp: 100,
        level: 25,
        type: 'electric',
        moves: []
      } as unknown as Pokemon

      const p2 = {
        uid: 'p-2',
        id: 'bulbasaur',
        name: 'Bulbasaur',
        hp: 100,
        maxHp: 100,
        level: 25,
        type: 'grass',
        moves: []
      } as unknown as Pokemon

      const candidates = [
        { pokemon: p1, _source: 'team' as const, index: 0 },
        { pokemon: p2, _source: 'team' as const, index: 1 }
      ]

      const filtered = filterAndSortPokemon(candidates, {
        searchQuery: 'bulba',
        sortBy: 'recent',
        sortOrder: 'desc',
        activeTags: []
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0]?.pokemon.id).toBe('bulbasaur')
    })

    it('heals illegal moves and abilities during repairPokemonLegality', () => {
      const corrupted: Pokemon = {
        uid: 'test-heal-1',
        id: 'charizard',
        species: 'charizard',
        name: 'Charizard',
        level: 50,
        exp: 0,
        expNeeded: 100,
        hp: 150,
        maxHp: 150,
        atk: 100,
        def: 100,
        spa: 120,
        spd: 100,
        spe: 110,
        type: 'fire',
        status: '',
        isShiny: false,
        vigor: 100,
        maxVigor: 100,
        ability: 'wonderguard' as any,
        moves: [
          { id: 'aeroblast' as any, name: 'Aerochorro', pp: 5, maxPP: 5 },
          { id: 'flamethrower', name: 'Lanzallamas', pp: 15, maxPP: 15 }
        ],
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        nature: 'timid'
      } as unknown as Pokemon

      const preCheck = checkPokemonLegality(corrupted)
      expect(preCheck.isLegal).toBe(false)

      const repairReport = repairPokemonLegality(corrupted)
      expect(repairReport.repaired).toBe(true)

      const postCheck = checkPokemonLegality(corrupted)
      expect(postCheck.isLegal).toBe(true)
      expect(corrupted.ability).toBe('blaze')
      expect(corrupted.moves.some(m => m?.id === 'aeroblast')).toBe(false)
    })
  })

  describe('Disabled Species & Eggs Sanitization Tests', () => {
    it('identifies unreleased / disabled species as illegal in checkPokemonLegality unless allowUnreleased is true', () => {
      const sunflora = {
        uid: 'sunflora-1',
        id: 'sunflora',
        name: 'Sunflora',
        level: 25,
        moves: [{ id: 'absorb', name: 'Absorber' }]
      } as unknown as Pokemon

      const report = checkPokemonLegality(sunflora)
      expect(report.isLegal).toBe(false)
      expect(report.issues.some(i => i.includes('whitelist global'))).toBe(true)

      const debugReport = checkPokemonLegality(sunflora, { allowUnreleased: true })
      expect(debugReport.isLegal).toBe(true)
    })

    it('purges disabled pokemon from box and daycareWarehouse, and purges disabled eggs', () => {
      const fakeSave = {
        trainer: 'TestTrainer',
        badges: 8,
        balls: 50,
        money: 10000,
        battleCoins: 100,
        trainerLevel: 25,
        trainerExp: 500,
        trainerExpNeeded: 1000,
        inventory: {},
        team: [
          {
            uid: 'pika-1',
            id: 'pikachu',
            name: 'Pikachu',
            level: 50,
            hp: 100,
            maxHp: 100,
            atk: 55,
            def: 40,
            spa: 50,
            spd: 50,
            spe: 90,
            type: 'electric',
            isShiny: false,
            exp: 1000,
            expNeeded: 2000,
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            moves: [{ id: 'thunderbolt', name: 'Rayo' }]
          } as unknown as Pokemon
        ],
        box: [
          {
            uid: 'sunflora-box',
            id: 'sunflora',
            name: 'Sunflora',
            level: 20,
            moves: [{ id: 'absorb', name: 'Absorber' }]
          } as unknown as Pokemon,
          {
            uid: 'char-box',
            id: 'charmander',
            name: 'Charmander',
            level: 15,
            hp: 50,
            maxHp: 50,
            atk: 52,
            def: 43,
            spa: 60,
            spd: 50,
            spe: 65,
            type: 'fire',
            isShiny: false,
            exp: 500,
            expNeeded: 1000,
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            moves: [{ id: 'scratch', name: 'Arañazo' }]
          } as unknown as Pokemon
        ],
        eggs: [
          {
            uid: 'egg-sunflora',
            id: 'sunflora',
            steps: 100,
            ready: false
          },
          {
            uid: 'egg-pichu',
            id: 'pichu',
            steps: 200,
            ready: false
          }
        ],
        daycareWarehouse: [
          {
            uid: 'sunflora-warehouse',
            id: 'sunflora',
            name: 'Sunflora'
          } as unknown as Pokemon,
          {
            uid: 'squirtle-warehouse',
            id: 'squirtle',
            name: 'Squirtle',
            level: 10,
            hp: 44,
            maxHp: 44,
            atk: 48,
            def: 65,
            spa: 50,
            spd: 64,
            spe: 43,
            type: 'water',
            isShiny: false,
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            moves: [{ id: 'watergun', name: 'Pistola Agua' }]
          } as unknown as Pokemon
        ],
        pokedex: ['pikachu'],
        seenPokedex: ['pikachu'],
        defeatedGyms: [],
        starterChosen: true,
        eloRating: 1000,
        pvpStats: { wins: 0, losses: 0, draws: 0 },
        rankedMaxElo: 1000,
        passiveTeamActive: false,
        daycare_mission_refreshes: 0,
        boxCount: 1,
        classLevel: 1,
        classXP: 0,
        classData: {
          captureStreak: 0,
          longestStreak: 0,
          reputation: 0,
          blackMarketSales: 0,
          criminality: 0
        },
        warCoins: 0,
        warCoinsSpent: 0,
        lastPokemonCenterHeal: 0,
        playtime: 100
      } as unknown as SaveDataDto

      const result = auditAndRepairSaveData(fakeSave, true)
      expect(result.modified).toBe(true)

      expect(fakeSave.box.some((p: any) => p?.id === 'sunflora')).toBe(false)
      expect(fakeSave.box.some((p: any) => p?.id === 'charmander')).toBe(true)

      expect(fakeSave.eggs?.some(e => e?.id === 'sunflora')).toBe(false)
      expect(fakeSave.eggs?.some(e => e?.id === 'pichu')).toBe(true)

      const warehouse = (fakeSave as any).daycareWarehouse
      expect(warehouse.some((p: any) => p?.id === 'sunflora')).toBe(false)
      expect(warehouse.some((p: any) => p?.id === 'squirtle')).toBe(true)
    })

    it('preserves Save Shield: promotes a legal pokemon from box if all team members are illegal/disabled', () => {
      const fakeSave = {
        trainer: 'TestTrainer',
        badges: 1,
        balls: 10,
        money: 1000,
        battleCoins: 0,
        trainerLevel: 5,
        trainerExp: 0,
        trainerExpNeeded: 100,
        inventory: {},
        team: [
          {
            uid: 'sunflora-team',
            id: 'sunflora',
            name: 'Sunflora',
            level: 20,
            moves: [{ id: 'absorb', name: 'Absorber' }]
          } as unknown as Pokemon
        ],
        box: [
          {
            uid: 'squirtle-box',
            id: 'squirtle',
            name: 'Squirtle',
            level: 10,
            hp: 44,
            maxHp: 44,
            atk: 48,
            def: 65,
            spa: 50,
            spd: 64,
            spe: 43,
            type: 'water',
            isShiny: false,
            exp: 200,
            expNeeded: 500,
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            moves: [{ id: 'watergun', name: 'Pistola Agua' }]
          } as unknown as Pokemon
        ],
        eggs: [],
        pokedex: [],
        seenPokedex: [],
        defeatedGyms: [],
        starterChosen: true,
        eloRating: 1000,
        pvpStats: { wins: 0, losses: 0, draws: 0 },
        rankedMaxElo: 1000,
        passiveTeamActive: false,
        daycare_mission_refreshes: 0,
        boxCount: 1,
        classLevel: 1,
        classXP: 0,
        classData: {
          captureStreak: 0,
          longestStreak: 0,
          reputation: 0,
          blackMarketSales: 0,
          criminality: 0
        },
        warCoins: 0,
        warCoinsSpent: 0,
        lastPokemonCenterHeal: 0,
        playtime: 10
      }

      const result = auditAndRepairSaveData(fakeSave as unknown as SaveDataDto, true)
      expect(result.modified).toBe(true)

      // Squirtle must be promoted to team to prevent empty team
      expect(fakeSave.team.length).toBe(1)
      expect(fakeSave.team[0]?.id).toBe('squirtle')
      expect(fakeSave.box.length).toBe(0)
    })

    it('preserves Save Shield: creates a legal rescue starter if entire account had only disabled pokemon', () => {
      const fakeSave = {
        trainer: 'TestTrainer',
        badges: 1,
        balls: 10,
        money: 1000,
        battleCoins: 0,
        trainerLevel: 5,
        trainerExp: 0,
        trainerExpNeeded: 100,
        inventory: {},
        team: [
          {
            uid: 'sunflora-only',
            id: 'sunflora',
            name: 'Sunflora',
            level: 20,
            moves: [{ id: 'absorb', name: 'Absorber' }]
          } as unknown as Pokemon
        ],
        box: [],
        eggs: [],
        pokedex: [],
        seenPokedex: [],
        defeatedGyms: [],
        starterChosen: true,
        eloRating: 1000,
        pvpStats: { wins: 0, losses: 0, draws: 0 },
        rankedMaxElo: 1000,
        passiveTeamActive: false,
        daycare_mission_refreshes: 0,
        boxCount: 1,
        classLevel: 1,
        classXP: 0,
        classData: {
          captureStreak: 0,
          longestStreak: 0,
          reputation: 0,
          blackMarketSales: 0,
          criminality: 0
        },
        warCoins: 0,
        warCoinsSpent: 0,
        lastPokemonCenterHeal: 0,
        playtime: 10
      }

      const result = auditAndRepairSaveData(fakeSave as unknown as SaveDataDto, true)
      expect(result.modified).toBe(true)

      // Team must have at least 1 legal Pokémon (Bulbasaur fallback)
      expect(fakeSave.team.length).toBe(1)
      expect(fakeSave.team[0]?.id).toBe('bulbasaur')
      expect(checkPokemonLegality(fakeSave.team[0] as unknown as Pokemon).isLegal).toBe(true)
    })
  })

  describe('Pokemon Stats Recalculation & Buff Duration Sanitization', () => {
    it('should fix missing stats in recalcPokemonStats on a valid structure', () => {
      const p = {
        uid: 'test-uid-charizard',
        id: 'charizard',
        ability: 'blaze',
        nature: 'hardy',
        level: 50,
        gender: 'M',
        vigor: 100,
        maxVigor: 100,
        hp: 5,
        maxHp: 100,
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: [{ id: 'scratch', name: 'Arañazo' }]
      } as unknown as Pokemon

      recalcPokemonStats(p)

      expect(p.maxHp).toBeGreaterThan(0)
      expect(p.atk).toBeGreaterThan(0)
    })

    it('should handle corrupt stats (NaN) during recalculation', () => {
      const p = {
        uid: 'test-uid-zubat',
        id: 'zubat',
        ability: 'innerfocus',
        nature: 'hardy',
        level: 10,
        gender: 'M',
        vigor: 100,
        maxVigor: 100,
        hp: 5,
        ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
        moves: [{ id: 'wingattack', name: 'Ataque Ala' }],
        atk: NaN
      } as unknown as Pokemon

      p.maxHp = undefined as unknown as number

      recalcPokemonStats(p)

      expect(isNaN(p.atk)).toBe(false)
      expect(p.atk).toBeGreaterThan(0)
      expect(p.maxHp).toBeGreaterThan(0)
    })

    it('should sanitize active buff timers that exceed the maximum limit of the database item descriptions', () => {
      const state: Record<string, unknown> = {
        repelSecs: 99999,
        luckyEggSecs: 1500,
        amuletCoinSecs: 88888,
        shinyBoostSecs: 0,
        team: [],
        box: [],
        eggs: []
      }

      const buffFields = BUFF_FIELDS.filter(field => state[field] !== undefined)
      
      buffFields.forEach(field => {
        const val = state[field]
        if (val !== undefined && typeof val === 'number') {
          const maxAllowedSecs = getMaxBuffDuration(field)
          if (val > maxAllowedSecs) {
            (state as Record<string, number>)[field] = maxAllowedSecs
          }
        }
      })

      expect(state.repelSecs).toBe(1800)
      expect(state.amuletCoinSecs).toBe(3600)
      expect(state.luckyEggSecs).toBe(1500)
      expect(state.shinyBoostSecs).toBe(0)
    })
  })
})
