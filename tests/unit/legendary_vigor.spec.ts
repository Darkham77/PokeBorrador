/**
 * tests/unit/legendary_vigor.spec.ts
 * Verifies that legendary pokemon are sanitized to 0 vigor and correctly blocked from daycare.
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { sanitizePokemon } from '@/logic/pokemonFactory'
import { useBreedingStore } from '@/stores/breeding'
import { createPinia, setActivePinia } from 'pinia'
import type { Pokemon } from '@/types/pokemon'
import { validateAndSanitize } from '@/logic/auth/saveService'
import type { SaveData } from '@/logic/auth/saveService'

describe('Legendary Vigor Sanitation & Daycare Block', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should coerce legendary pokemon vigor to 0 in sanitizePokemon', () => {
    const legendaryMock: Pokemon = {
      uid: 'mewtwo-test',
      id: 'mewtwo',
      name: 'Mewtwo',
      level: 70,
      vigor: 15, // Positive vigor
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
      nature: 'Modest',
      ability: 'Presión',
      exp: 0,
      expNeeded: 1000
    }

    expect(legendaryMock.vigor).toBe(15)

    // Run sanitation
    sanitizePokemon(legendaryMock)

    // Vigor must be coerced to 0
    expect(legendaryMock.vigor).toBe(0)
  })

  it('should prevent legendary pokemon from being deposited in daycare', async () => {
    const breedingStore = useBreedingStore()
    const legendaryMock: Pokemon = {
      uid: 'mewtwo-test',
      id: 'mewtwo',
      name: 'Mewtwo',
      level: 70,
      vigor: 0,
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
      nature: 'Modest',
      ability: 'Presión',
      exp: 0,
      expNeeded: 1000
    }

    const result = await breedingStore.deposit(legendaryMock, 0)
    expect(result).toBe(false)
  })

  it('should run database migration simulator and fix all legendaries in team and box', () => {
    const mockSaveData = {
      trainer: 'TestTrainer',
      team: [
        {
          uid: 'pikachu-test',
          id: 'pikachu',
          name: 'Pikachu',
          vigor: 20
        },
        {
          uid: 'mew-test',
          id: 'mew',
          name: 'Mew',
          vigor: 12 // Legendary: should be coerced to 0
        }
      ],
      box: [
        {
          uid: 'zapdos-test',
          id: 'Zapdos',
          name: 'Zapdos',
          vigor: 8 // Legendary: should be coerced to 0
        },
        {
          uid: 'bulbasaur-test',
          id: 'bulbasaur',
          name: 'Bulbasaur',
          vigor: 20
        }
      ]
    }

    // JS simulator of the PGSQL legendary repair migration
    const legendaries = new Set([
      'articuno', 'zapdos', 'moltres', 'mewtwo', 'mew',
      'raikou', 'entei', 'suicune', 'lugia', 'ho_oh', 'ho-oh', 'celebi'
    ])

    // Update team
    if (mockSaveData.team) {
      mockSaveData.team.forEach(p => {
        if (p && p.id && legendaries.has(p.id.toLowerCase())) {
          p.vigor = 0
        }
      })
    }

    // Update box
    if (mockSaveData.box) {
      mockSaveData.box.forEach(p => {
        if (p && p.id && legendaries.has(p.id.toLowerCase())) {
          p.vigor = 0
        }
      })
    }

    const mew = mockSaveData.team.find(p => p.id === 'mew')
    expect(mew?.vigor).toBe(0)

    const pikachu = mockSaveData.team.find(p => p.id === 'pikachu')
    expect(pikachu?.vigor).toBe(20)

    const zapdos = mockSaveData.box.find(p => p.id.toLowerCase() === 'zapdos')
    expect(zapdos?.vigor).toBe(0)

    const bulbasaur = mockSaveData.box.find(p => p.id === 'bulbasaur')
    expect(bulbasaur?.vigor).toBe(20)
  })

  it('should repair legendary vigor to 0 in memory via validateAndSanitize', () => {
    const mockSave = {
      trainer: 'Ash',
      badges: 8,
      balls: 10,
      money: 5000,
      battleCoins: 100,
      eggs: [],
      trainerLevel: 50,
      trainerExp: 0,
      trainerExpNeeded: 1000,
      inventory: {},
      team: [
        {
          uid: 'mewtwo-test-save',
          id: 'mewtwo',
          name: 'Mewtwo',
          level: 70,
          vigor: 15,
          type: 'psychic',
          hp: 200,
          maxHp: 200,
          atk: 150,
          def: 120,
          spa: 180,
          spd: 120,
          spe: 150,
          moves: [],
          exp: 0,
          expNeeded: 1000,
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          nature: 'Modest',
          ability: 'Presión'
        }
      ],
      box: [
        {
          uid: 'lugia-test-save',
          id: 'lugia',
          name: 'Lugia',
          level: 70,
          vigor: 25,
          type: 'psychic',
          hp: 200,
          maxHp: 200,
          atk: 150,
          def: 120,
          spa: 180,
          spd: 120,
          spe: 150,
          moves: [],
          exp: 0,
          expNeeded: 1000,
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          nature: 'Modest',
          ability: 'Presión'
        }
      ],
      pokedex: [],
      seenPokedex: [],
      defeatedGyms: [],
      gymProgress: {},
      lastGymWins: {},
      lastGymAttempts: {},
      starterChosen: true,
      lastRankedSeason: null,
      nick_style: null,
      avatar_style: null,
      stats: {},
      eloRating: 1000,
      pvpStats: { wins: 0, losses: 0, draws: 0 },
      rankedMaxElo: 1000,
      rankedRewardsClaimed: [],
      passiveTeamUids: [],
      passiveTeamActive: false,
      activeBattle: null,
      daycare_missions: [],
      daycare_mission_refreshes: 3,
      safariTicketSecs: 0,
      ceruleanTicketSecs: 0,
      articunoTicketSecs: 0,
      mewtwoTicketSecs: 0,
      repelSecs: 0,
      fishingRodSecs: 0,
      fishingRodType: null,
      pickaxeSecs: 0,
      pickaxeType: null,
      brushSecs: 0,
      brushType: null,
      shinyBoostSecs: 0,
      amuletCoinSecs: 0,
      luckyEggSecs: 0,
      ivScannerSecs: 0,
      incenseSecs: 0,
      incenseType: null,
      daycare_berry_egg_time: 0,
      boxCount: 4,
      chats: {},
      playerClass: null,
      classLevel: 1,
      classXP: 0,
      classData: {
        captureStreak: 0,
        longestStreak: 0,
        reputation: 0,
        blackMarketSales: 0,
        criminality: 0,
        extortedRouteId: null,
        extortedRouteTimestamp: null,
        lastEggScanDate: null,
        officialRouteId: null,
        kitCaptures: 0
      },
      faction: null,
      warCoins: 0,
      warCoinsSpent: 0,
      warDailyCap: {},
      warDailyCoins: {},
      warMyPtsLocal: {},
      notificationHistory: [],
      marketSoldSeenIds: []
    } as unknown as SaveData

    const { data: sanitized } = validateAndSanitize(mockSave)
    expect(sanitized.team?.[0]?.vigor).toBe(0)
    expect(sanitized.box?.[0]?.vigor).toBe(0)
  })
})
