import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { checkPokemonLegality, repairPokemonLegality, hasIllegalPokemon } from '@/logic/pokemon/pokemonLegality'
import { validateAndSanitize } from '@/logic/auth/saveSanitizer'
import { filterAndSortPokemon } from '@/logic/pokemon/pokemonSelectionFilter'
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

describe('Pokemon Legality, Resilience & Visual Safeguards', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('correctly identifies illegal moves, abilities and levels', () => {
    const illegalMon: Pokemon = {
      uid: 'test-illegal-1',
      id: 'pikachu',
      species: 'pikachu',
      name: 'Pikachu',
      level: 150, // Illegal level (>100)
      hp: 100,
      maxHp: 100,
      atk: 55,
      def: 40,
      spa: 50,
      spd: 50,
      spe: 90,
      type: 'electric',
      vigor: 100,
      maxVigor: 100,
      nature: 'jolly',
      ability: 'hugepower' as any, // Illegal ability for Pikachu
      moves: [
        { id: 'hydrocannon' as any, name: 'Hidrocañón', pp: 5, maxPP: 5 }, // Illegal move for Pikachu
        { id: 'quickattack', name: 'Ataque Rápido', pp: 30, maxPP: 30 }
      ],
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
    } as unknown as Pokemon

    const report = checkPokemonLegality(illegalMon)
    expect(report.isLegal).toBe(false)
    expect(report.issues.some(i => i.includes('Nivel 150'))).toBe(true)
    expect(report.issues.some(i => i.includes('hugepower'))).toBe(true)
    expect(report.issues.some(i => i.includes('hydrocannon') || i.includes('Hidrocañón'))).toBe(true)
    expect(hasIllegalPokemon([illegalMon])).toBe(true)
  })

  it('repairs illegal attributes (clamps level, fixes ability, restores legal moves)', () => {
    const illegalMon: Pokemon = {
      uid: 'test-illegal-2',
      id: 'pikachu',
      species: 'pikachu',
      name: 'Pikachu',
      level: 150,
      hp: 100,
      maxHp: 100,
      atk: 55,
      def: 40,
      spa: 50,
      spd: 50,
      spe: 90,
      type: 'electric',
      vigor: 100,
      maxVigor: 100,
      nature: 'jolly',
      ability: 'hugepower' as any,
      moves: [
        { id: 'hydrocannon' as any, name: 'Hidrocañón', pp: 5, maxPP: 5 }
      ],
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      isIllegal: true,
      illegalReasons: ['Test reason']
    } as unknown as Pokemon

    const repair = repairPokemonLegality(illegalMon)
    expect(repair.repaired).toBe(true)
    expect(illegalMon.level).toBe(100)
    expect(illegalMon.ability).toBe('static')
    expect(illegalMon.isIllegal).toBe(false)
    expect(illegalMon.illegalReasons).toEqual([])
    expect(illegalMon.moves.length).toBeGreaterThan(0)
    expect(illegalMon.moves.every(m => m?.id !== 'hydrocannon')).toBe(true)

    // After repair, checkPokemonLegality must return legal
    const finalCheck = checkPokemonLegality(illegalMon)
    expect(finalCheck.isLegal).toBe(true)
  })

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
      moves: [{ id: 'spore' as any, name: 'Espora', pp: 15, maxPP: 15 }], // Illegal move for Rayquaza
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
      id: 'charizard',
      name: 'Charizard',
      hp: 100,
      maxHp: 100,
      level: 36,
      type: 'fire',
      moves: []
    } as unknown as Pokemon

    const sourceList = [
      { pokemon: p1, _source: 'team' as const, index: 0 },
      { pokemon: p2, _source: 'team' as const, index: 1 }
    ]

    // Searching "pika" volatilely
    const filtered = filterAndSortPokemon(sourceList, {
      searchQuery: 'pika',
      sortBy: 'index',
      sortOrder: 'asc',
      activeTags: [],
      isBattleSwitch: true
    })

    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.pokemon.id).toBe('pikachu')
  })

  it('preserves advanced Pokemon with TM moves and custom EVs across save/F5 and confirms full legality', () => {
    const advancedGengar: Pokemon = {
      uid: 'gengar-comp-1',
      id: 'gengar',
      species: 'gengar',
      name: 'Gengar',
      level: 100,
      exp: 1059860,
      expNeeded: 1059860,
      hp: 262,
      maxHp: 262,
      atk: 149,
      def: 156,
      spa: 359,
      spd: 186,
      spe: 350,
      type: 'ghost',
      isShiny: false,
      vigor: 100,
      maxVigor: 100,
      nature: 'timid',
      ability: 'cursedbody' as any,
      // TM moves: Thunderbolt, Psychic, Shadow Ball, Focus Blast (all legal for Gengar via TM/Tutor)
      moves: [
        { id: 'shadowball', name: 'Bola Sombra', type: 'ghost', cat: 'special', power: 80, acc: 100, pp: 15, maxPP: 15 },
        { id: 'thunderbolt', name: 'Rayo', type: 'electric', cat: 'special', power: 90, acc: 100, pp: 15, maxPP: 15 },
        { id: 'psychic', name: 'Psíquico', type: 'psychic', cat: 'special', power: 90, acc: 100, pp: 10, maxPP: 10 },
        { id: 'focusblast', name: 'Onda Certera', type: 'fighting', cat: 'special', power: 120, acc: 70, pp: 5, maxPP: 5 }
      ],
      ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      heldItem: 'choicescarf' as any
    } as unknown as Pokemon

    // 1. Check legality of advanced TM moves
    const legality = checkPokemonLegality(advancedGengar)
    expect(legality.isLegal).toBe(true)
    expect(legality.issues).toEqual([])

    // 2. Simulate Save Serialization -> F5 Load via validateAndSanitize
    const saveState = createTestSave([advancedGengar])
    const serialized = JSON.stringify(saveState)
    const parsed = JSON.parse(serialized)
    const sanitized = validateAndSanitize(parsed)

    expect(sanitized.valid).toBe(true)
    const loadedGengar = sanitized.data?.team[0] as Pokemon
    expect(loadedGengar).toBeDefined()
    expect(loadedGengar.isIllegal).toBeFalsy()
    expect(loadedGengar.evs).toEqual({ hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 })
    expect(loadedGengar.moves.map(m => m?.id)).toEqual(['shadowball', 'thunderbolt', 'psychic', 'focusblast'])

    // 3. Repair on a legal advanced Pokemon should NOT alter its TM moves or EVs
    const repair = repairPokemonLegality(loadedGengar)
    expect(repair.repaired).toBe(false)
    expect(loadedGengar.moves.map(m => m?.id)).toEqual(['shadowball', 'thunderbolt', 'psychic', 'focusblast'])
    expect(loadedGengar.evs).toEqual({ hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 })
  })

  it('preserves legal TM moves when repairing a Pokemon that has only one illegal move injected', () => {
    const mixedGengar: Pokemon = {
      uid: 'gengar-mixed-1',
      id: 'gengar',
      species: 'gengar',
      name: 'Gengar',
      level: 100,
      hp: 262,
      maxHp: 262,
      atk: 149,
      def: 156,
      spa: 359,
      spd: 186,
      spe: 350,
      type: 'ghost',
      vigor: 100,
      maxVigor: 100,
      nature: 'timid',
      ability: 'cursedbody' as any,
      moves: [
        { id: 'shadowball', name: 'Bola Sombra', pp: 15, maxPP: 15 },
        { id: 'thunderbolt', name: 'Rayo', pp: 15, maxPP: 15 }, // Legal TM
        { id: 'spore' as any, name: 'Espora', pp: 15, maxPP: 15 } // Illegal move
      ],
      ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 }
    } as unknown as Pokemon

    // Legality flags spore, but NOT shadowball or thunderbolt
    const check = checkPokemonLegality(mixedGengar)
    expect(check.isLegal).toBe(false)
    expect(check.issues.some(i => i.includes('spore'))).toBe(true)
    expect(check.issues.some(i => i.includes('thunderbolt'))).toBe(false)
    expect(check.issues.some(i => i.includes('shadowball'))).toBe(false)

    // Repair removes spore, keeps shadowball + thunderbolt, and fills remaining empty slots up to 4 moves with level-up moves
    const repair = repairPokemonLegality(mixedGengar)
    expect(repair.repaired).toBe(true)
    expect(mixedGengar.moves).toHaveLength(4)
    expect(mixedGengar.moves[0]?.id).toBe('shadowball')
    expect(mixedGengar.moves[1]?.id).toBe('thunderbolt')
    expect(mixedGengar.evs).toEqual({ hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 })
    expect(checkPokemonLegality(mixedGengar).isLegal).toBe(true)
  })

  it('completes remaining empty move slots up to 4 for Gengar Lv 55 with Double-Edge', () => {
    const singleMoveGengar: Pokemon = {
      uid: 'gengar-de-1',
      id: 'gengar',
      species: 'gengar',
      name: 'Gengar',
      level: 55,
      hp: 148,
      maxHp: 148,
      atk: 93,
      def: 88,
      spa: 165,
      spd: 104,
      spe: 143,
      type: 'ghost',
      isShiny: false,
      vigor: 100,
      maxVigor: 100,
      nature: 'mild',
      ability: 'cursedbody' as any,
      moves: [
        { id: 'doubleedge', name: 'Doble Filo', pp: 15, maxPP: 15 } // Legal Gen 3 Move Tutor move
      ],
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    } as unknown as Pokemon

    // 1. Confirm Double-Edge is recognized as legal
    const initialCheck = checkPokemonLegality(singleMoveGengar)
    expect(initialCheck.isLegal).toBe(true)

    // 2. Repair complements the 3 missing slots with legal level-55 moves
    const repair = repairPokemonLegality(singleMoveGengar)
    expect(repair.repaired).toBe(true)
    expect(singleMoveGengar.moves).toHaveLength(4)
    expect(singleMoveGengar.moves[0]?.id).toBe('doubleedge')
    expect(singleMoveGengar.moves.every(m => !!m && !!m.id && !!m.name)).toBe(true)
    expect(checkPokemonLegality(singleMoveGengar).isLegal).toBe(true)
  })

  it('intelligently repairs moves scaled to Pokemon level (Level 1 only gets Lv 1 moves, not 4)', () => {
    // Level 1 Magikarp with an illegal move: should only receive Splash (1 move)
    const lv1Magikarp: Pokemon = {
      uid: 'karp-lv1',
      id: 'magikarp',
      species: 'magikarp',
      name: 'Magikarp',
      level: 1,
      hp: 10,
      maxHp: 10,
      atk: 10,
      def: 10,
      spa: 10,
      spd: 10,
      spe: 10,
      type: 'water',
      isShiny: false,
      vigor: 100,
      maxVigor: 100,
      nature: 'hardy',
      ability: 'swiftswim' as any,
      moves: [
        { id: 'spore' as any, name: 'Espora', pp: 15, maxPP: 15 } // Illegal
      ],
      ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    } as unknown as Pokemon

    const repKarp = repairPokemonLegality(lv1Magikarp)
    expect(repKarp.repaired).toBe(true)
    expect(lv1Magikarp.moves).toHaveLength(1) // Only Splash exists at Lv 1
    expect(lv1Magikarp.moves[0]?.id).toBe('splash')
    expect(checkPokemonLegality(lv1Magikarp).isLegal).toBe(true)

    // Level 1 Gastly: only knows Hypnosis and Lick (2 moves at Lv 1)
    const lv1Gastly: Pokemon = {
      uid: 'gastly-lv1',
      id: 'gastly',
      species: 'gastly',
      name: 'Gastly',
      level: 1,
      hp: 15,
      maxHp: 15,
      atk: 10,
      def: 10,
      spa: 20,
      spd: 15,
      spe: 20,
      type: 'ghost',
      isShiny: false,
      vigor: 100,
      maxVigor: 100,
      nature: 'timid',
      ability: 'levitate' as any,
      moves: [
        { id: 'aeroblast' as any, name: 'Aerochorro', pp: 5, maxPP: 5 } // Illegal
      ],
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    } as unknown as Pokemon

    const repGastly = repairPokemonLegality(lv1Gastly)
    expect(repGastly.repaired).toBe(true)
    expect(lv1Gastly.moves).toHaveLength(3) // Confuse Ray, Hypnosis, Lick
    expect(lv1Gastly.moves.map(m => m?.id)).toEqual(['confuseray', 'hypnosis', 'lick'])
    expect(checkPokemonLegality(lv1Gastly).isLegal).toBe(true)
  })
})

