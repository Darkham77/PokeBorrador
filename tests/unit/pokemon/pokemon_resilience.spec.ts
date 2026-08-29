import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { checkPokemonLegality, repairPokemonLegality } from '@/logic/pokemon/pokemonLegality'
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

describe('Pokemon Resilience & System Safeguards', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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

  it('prevents adding illegal Pokemon from Box to Team in useBoxStore', async () => {
    const { useBoxStore } = await import('@/stores/box')
    const { useGameStore } = await import('@/stores/game')
    const boxStore = useBoxStore()
    const gameStore = useGameStore()

    const illegalBulbasaur: Pokemon = {
      uid: 'box-illegal-bulba',
      id: 'bulbasaur',
      species: 'bulbasaur',
      name: 'Bulbasaur',
      level: 2,
      hp: 20,
      maxHp: 20,
      atk: 10,
      def: 10,
      spa: 10,
      spd: 10,
      spe: 10,
      type: 'grass',
      isShiny: false,
      vigor: 100,
      maxVigor: 100,
      nature: 'modest',
      ability: 'overgrow' as any,
      moves: [
        { id: 'tackle' as any, name: 'Placaje', pp: 35, maxPP: 35 },
        { id: 'growl' as any, name: 'Gruñido', pp: 40, maxPP: 40 },
        { id: 'leechseed' as any, name: 'Drenadoras', pp: 10, maxPP: 10 },
        { id: 'vinewhip' as any, name: 'Látigo Cepa', pp: 25, maxPP: 25 }
      ], // 4 moves at lv 2 is illegal
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    } as unknown as Pokemon

    gameStore.state.box = [illegalBulbasaur]
    gameStore.state.team = []

    const result = boxStore.moveBoxToTeam(0)
    expect(result.success).toBe(false)
    expect(result.msg).toContain('Pokémon ilegal')
    expect(gameStore.state.team).toHaveLength(0)
  })

  it('blocks startBattleSequence if any player team member is illegal', async () => {
    const { startBattleSequence } = await import('@/logic/battle/orchestrator')
    const { useGameStore } = await import('@/stores/game')
    const { useBattleStore } = await import('@/stores/battle/battle')
    const gameStore = useGameStore()
    const battleStore = useBattleStore()

    const illegalPoke: Pokemon = {
      uid: 'team-illegal-poke',
      id: 'bulbasaur',
      species: 'bulbasaur',
      name: 'Bulbasaur',
      level: 2,
      hp: 20,
      maxHp: 20,
      atk: 10,
      def: 10,
      spa: 10,
      spd: 10,
      spe: 10,
      type: 'grass',
      isShiny: false,
      vigor: 100,
      maxVigor: 100,
      nature: 'modest',
      ability: 'overgrow' as any,
      moves: [
        { id: 'tackle' as any, name: 'Placaje', pp: 35, maxPP: 35 },
        { id: 'growl' as any, name: 'Gruñido', pp: 40, maxPP: 40 },
        { id: 'leechseed' as any, name: 'Drenadoras', pp: 10, maxPP: 10 },
        { id: 'vinewhip' as any, name: 'Látigo Cepa', pp: 25, maxPP: 25 }
      ],
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    } as unknown as Pokemon

    gameStore.state.team = [illegalPoke]
    gameStore.state.map = { currentMap: 'route1' } as any

    const enemyPoke: Pokemon = {
      uid: 'enemy-pidgey',
      id: 'pidgey',
      species: 'pidgey',
      name: 'Pidgey',
      level: 2,
      hp: 20,
      maxHp: 20,
      atk: 10,
      def: 10,
      spa: 10,
      spd: 10,
      spe: 10,
      type: 'normal',
      isShiny: false,
      vigor: 100,
      maxVigor: 100,
      nature: 'hardy',
      ability: 'keeneye' as any,
      moves: [{ id: 'tackle' as any, name: 'Placaje', pp: 35, maxPP: 35 }],
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    } as unknown as Pokemon

    await startBattleSequence(battleStore.getContext(), enemyPoke, { locationId: 'route1' })

    // Battle must NOT have started
    expect(battleStore.isBattleActive).toBe(false)
  })

  it('allows pure release of illegal Pokemon without returning held items', async () => {
    const { useBoxStore } = await import('@/stores/box')
    const { useGameStore } = await import('@/stores/game')
    const boxStore = useBoxStore()
    const gameStore = useGameStore()

    const illegalMon: Pokemon = {
      uid: 'illegal-to-release',
      id: 'bulbasaur',
      species: 'bulbasaur',
      name: 'Bulbasaur',
      level: 2,
      isIllegal: true,
      heldItem: 'leftovers' as any,
      moves: [{ id: 'tackle' as any, name: 'Tackle', pp: 35, maxPP: 35 }]
    } as unknown as Pokemon

    gameStore.state.box = [illegalMon]
    gameStore.state.inventory = {}
    boxStore.toggleBoxReleaseMode()
    boxStore.toggleSelection(0)
    
    const released = boxStore.doBoxRelease()
    expect(released).toEqual(['Bulbasaur'])
    expect(gameStore.state.box).toHaveLength(0)
    // No item returned for illegal pokemon
    expect(gameStore.state.inventory.leftovers).toBeUndefined()
  })

  it('blocks selecting or selling illegal Pokemon via Team Rocket Black Market', async () => {
    const { useBoxStore } = await import('@/stores/box')
    const { useGameStore } = await import('@/stores/game')
    const boxStore = useBoxStore()
    const gameStore = useGameStore()

    const illegalMon: Pokemon = {
      uid: 'illegal-to-sell',
      id: 'bulbasaur',
      species: 'bulbasaur',
      name: 'Bulbasaur',
      level: 2,
      isIllegal: true,
      moves: [{ id: 'tackle' as any, name: 'Tackle', pp: 35, maxPP: 35 }]
    } as unknown as Pokemon

    gameStore.state.playerClass = 'rocket'
    gameStore.state.box = [illegalMon]
    boxStore.toggleBoxRocketMode()
    boxStore.toggleSelection(0)

    expect(boxStore.boxRocketSelected).toHaveLength(0)
    expect(boxStore.getRocketSellValue()).toBe(0)
  })

  it('blocks depositing illegal Pokemon into Daycare / Breeding', async () => {
    const { useBreedingStore } = await import('@/stores/breeding')
    const { useGameStore } = await import('@/stores/game')
    const breedingStore = useBreedingStore()
    const gameStore = useGameStore()

    const illegalMon: Pokemon = {
      uid: 'illegal-daycare',
      id: 'pikachu',
      species: 'pikachu',
      name: 'Pikachu',
      level: 5,
      isIllegal: true,
      gender: 'm',
      moves: []
    } as unknown as Pokemon

    gameStore.state.box = [illegalMon]
    const success = await breedingStore.deposit(illegalMon, 0)
    expect(success).toBe(false)
    expect(breedingStore.slots[0]?.pokemon).toBeFalsy()
  })
})
