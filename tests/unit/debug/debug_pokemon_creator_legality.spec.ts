import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import DebugPokemonCreator from '@/components/admin/debug/DebugPokemonCreator.vue'
import { validatePokemonLegality, type PokemonConfig } from '@/components/admin/debug/useDebugPokemonCreator.ts'

describe('Debug Pokemon Creator Legality Guard & Modal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('detects illegal moves for a species and returns explicit reasons', () => {
    const illegalConfig: PokemonConfig = {
      id: 'gengar',
      level: 50,
      isShiny: false,
      isGuardian: false,
      nature: 'timid',
      ability: 'cursedbody',
      gender: 'm' as const,
      nickname: '',
      friendship: 70,
      heldItem: '',
      mapId: 'route1',
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      moves: ['lastresort', 'copycat'], // Eevee moves, illegal for Gengar
      protocol: 'catch'
    }

    const result = validatePokemonLegality(illegalConfig)
    expect(result.valid).toBe(false)
    expect(result.issues.length).toBeGreaterThanOrEqual(2)
    expect(result.issues.some(i => i.includes('lastresort') || i.includes('Última Baza'))).toBe(true)
  })

  it('detects illegal abilities for a species', () => {
    const illegalAbilityConfig: PokemonConfig = {
      id: 'pikachu',
      level: 25,
      isShiny: false,
      isGuardian: false,
      nature: 'jolly',
      ability: 'hugepower', // Huge power is Azumarill/Diggersby, illegal for Pikachu
      gender: 'm' as const,
      nickname: '',
      friendship: 70,
      heldItem: '',
      mapId: 'route1',
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      moves: ['thunderbolt', 'quickattack'],
      protocol: 'catch'
    }

    const result = validatePokemonLegality(illegalAbilityConfig)
    expect(result.valid).toBe(false)
    expect(result.issues.some(i => i.includes('hugepower') && i.includes('ilegal'))).toBe(true)
  })

  it('validates a completely legal Pokemon successfully with zero issues', () => {
    const legalConfig: PokemonConfig = {
      id: 'gengar',
      level: 50,
      isShiny: false,
      isGuardian: false,
      nature: 'timid',
      ability: 'cursedbody',
      gender: 'm' as const,
      nickname: '',
      friendship: 70,
      heldItem: '',
      mapId: 'route1',
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      moves: ['shadowball', 'sludgebomb', 'thunderbolt', 'focusblast'],
      protocol: 'catch'
    }

    const result = validatePokemonLegality(legalConfig)
    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('displays the illegal pokemon warning modal in the UI when attempting to create an invalid pokemon', async () => {
    let debugCreated = false
    window.__VITE_DEBUG__ = {
      createPokemon: async () => {
        debugCreated = true
      }
    } as any

    const wrapper = mount(DebugPokemonCreator)

    // Set illegal move directly in component state
    const vm = wrapper.vm as any
    vm.config.id = 'gengar'
    vm.config.ability = 'cursedbody'
    vm.config.moves = ['lastresort']

    // Attempt to click create button
    const catchBtn = wrapper.find('#debug-btn-catch')
    if (catchBtn.exists()) {
      await catchBtn.trigger('click')
    } else {
      // Direct call to executeAction
      await vm.executeAction('catch')
    }

    await wrapper.vm.$nextTick()

    // The creation must be blocked
    expect(debugCreated).toBe(false)

    // The modal must be visible with the reasons
    const modal = wrapper.find('#debug-illegal-pokemon-modal')
    expect(modal.exists()).toBe(true)
    expect(modal.text()).toContain('POKÉMON ILEGAL DETECTADO')
    expect(modal.text()).toContain('lastresort')

    // Click close button
    const closeBtn = wrapper.find('#debug-illegal-modal-close-btn')
    expect(closeBtn.exists()).toBe(true)
    await closeBtn.trigger('click')

    await wrapper.vm.$nextTick()
    expect(wrapper.find('#debug-illegal-pokemon-modal').exists()).toBe(false)
  })

  it('generates only legal moves for Unown and Cosmog and leaves remaining slots null', async () => {
    const { getRandomLegalMoves } = await import('@/logic/pokemon/pokemonFactory')
    
    // Unown only learns Hidden Power (1 move total)
    const unownMoves = getRandomLegalMoves('unown', 1)
    expect(unownMoves).toHaveLength(4)
    const unownActive = unownMoves.filter((m): m is NonNullable<typeof m> => !!m)
    expect(unownActive).toHaveLength(1)
    expect(unownActive[0]).toBe('hiddenpower')
    expect(unownMoves[1]).toBeNull()
    expect(unownMoves[2]).toBeNull()
    expect(unownMoves[3]).toBeNull()

    // Cosmog only learns Splash and Teleport (2 moves total)
    const cosmogMoves = getRandomLegalMoves('cosmog', 1)
    expect(cosmogMoves).toHaveLength(4)
    const cosmogActive = cosmogMoves.filter((m): m is NonNullable<typeof m> => !!m)
    expect(cosmogActive).toHaveLength(2)
    expect(cosmogMoves[2]).toBeNull()
    expect(cosmogMoves[3]).toBeNull()

    const config: PokemonConfig = {
      id: 'unown',
      level: 1,
      isShiny: false,
      isGuardian: false,
      nature: 'hardy',
      ability: 'levitate',
      gender: 'm' as const,
      nickname: '',
      friendship: 70,
      heldItem: '',
      mapId: 'route1',
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      moves: unownMoves,
      protocol: 'catch'
    }
    const result = validatePokemonLegality(config)
    expect(result.valid).toBe(true)
  })

  it('generates the exact legal count of moves for Bulbasaur at Level 2 and Level 10', async () => {
    const { getRandomLegalMoves, canLearnMove } = await import('@/logic/pokemon/pokemonFactory')
    
    // At level 2, Bulbasaur only knows 2 moves naturally (Tackle, Growl)
    const movesLv2 = getRandomLegalMoves('bulbasaur', 2)
    const activeMovesLv2 = movesLv2.filter((m): m is NonNullable<typeof m> => !!m)
    expect(activeMovesLv2).toHaveLength(2)
    expect(movesLv2[2]).toBeNull()
    expect(movesLv2[3]).toBeNull()

    // At level 10, Bulbasaur has learned 4 moves (Tackle, Growl, Leech Seed, Vine Whip)
    const movesLv10 = getRandomLegalMoves('bulbasaur', 10)
    const activeMovesLv10 = movesLv10.filter((m): m is NonNullable<typeof m> => !!m)
    expect(activeMovesLv10).toHaveLength(4)

    // Ensure zero duplicates
    const unique = new Set(activeMovesLv10)
    expect(unique.size).toBe(4)

    // Ensure all moves can be legally learned at Lv 10
    for (const m of activeMovesLv10) {
      expect(canLearnMove('bulbasaur', m, 10)).toBe(true)
    }

    const config: PokemonConfig = {
      id: 'bulbasaur',
      level: 10,
      isShiny: false,
      isGuardian: false,
      nature: 'modest',
      ability: 'overgrow',
      gender: 'm' as const,
      nickname: '',
      friendship: 70,
      heldItem: '',
      mapId: 'route1',
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      moves: movesLv10,
      protocol: 'catch'
    }
    const result = validatePokemonLegality(config)
    expect(result.valid).toBe(true)
  })

  it('rejects a level 2 Pokemon having 4 moves and blocks catch in the UI', async () => {
    let debugCreated = false
    window.__VITE_DEBUG__ = {
      createPokemon: async () => {
        debugCreated = true
      }
    } as any

    const illegalLevel2Config: PokemonConfig = {
      id: 'tangela',
      level: 2,
      isShiny: false,
      isGuardian: false,
      nature: 'modest',
      ability: 'chlorophyll',
      gender: 'm' as const,
      nickname: '',
      friendship: 70,
      heldItem: '',
      mapId: 'route1',
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      moves: ['bind', 'absorb', 'leechseed', 'growth'], // 4 moves at lv 2 is illegal
      protocol: 'catch'
    }

    const validation = validatePokemonLegality(illegalLevel2Config)
    expect(validation.valid).toBe(false)
    expect(validation.issues.some(i => i.includes('solo puede conocer hasta'))).toBe(true)

    const wrapper = mount(DebugPokemonCreator)
    const vm = wrapper.vm as any
    vm.config.id = 'tangela'
    vm.config.level = 2
    vm.config.moves = ['bind', 'absorb', 'leechseed', 'growth']

    const catchBtn = wrapper.find('#debug-btn-catch')
    if (catchBtn.exists()) {
      await catchBtn.trigger('click')
    } else {
      await vm.executeAction('catch')
    }

    await wrapper.vm.$nextTick()

    // Must block creation and show modal
    expect(debugCreated).toBe(false)
    const modal = wrapper.find('#debug-illegal-pokemon-modal')
    expect(modal.exists()).toBe(true)
    expect(modal.text()).toContain('solo puede conocer hasta')
  })

  it('verifies 50 random iterations across diverse species and levels yield 100% legal moves without duplicates', async () => {
    const { getRandomLegalMoves, canLearnMove } = await import('@/logic/pokemon/pokemonFactory')
    const testSpecies = ['charmander', 'squirtle', 'pikachu', 'gengar', 'snorlax', 'dragonite', 'eevee'] as const satisfies readonly import('@/data/pokemon/pokedex').PokemonSpeciesId[]
    
    for (let i = 0; i < 50; i++) {
      const sp = testSpecies[i % testSpecies.length] || 'bulbasaur'
      const lv = Math.floor(Math.random() * 100) + 1
      const moves = getRandomLegalMoves(sp, lv)
      expect(moves).toHaveLength(4)
      const activeMoves = moves.filter((m): m is NonNullable<typeof m> => !!m)
      expect(activeMoves.length).toBeGreaterThan(0)
      
      const unique = new Set(activeMoves)
      expect(unique.size).toBe(activeMoves.length)

      for (const m of activeMoves) {
        expect(canLearnMove(sp, m, lv)).toBe(true)
      }
    }
  })

  it('displays the illegal team modal in DebugTrainersTab when attempting combat with an invalid pokemon', async () => {
    const DebugTrainersTab = (await import('@/components/admin/debug/DebugTrainersTab.vue')).default
    const wrapper = mount(DebugTrainersTab)
    const vm = wrapper.vm as any

    // Inject an illegal move into first enemy poke
    if (vm.enemyTeam.length > 0) {
      vm.enemyTeam[0].moves = [{ id: 'spore', name: 'Espora', pp: 15, maxPP: 15 }] // Illegal for default youngster pokes like Rattata
    }

    const startBtn = wrapper.find('#debug-battle-start-btn')
    if (startBtn.exists()) {
      await startBtn.trigger('click')
    } else {
      await vm.startCombat()
    }

    await wrapper.vm.$nextTick()

    // Modal must be visible
    const modal = wrapper.find('#debug-illegal-pokemon-modal')
    expect(modal.exists()).toBe(true)
    expect(modal.text()).toContain('EQUIPO ILEGAL DETECTADO')

    // Close button
    const closeBtn = wrapper.find('#debug-illegal-modal-close-btn')
    expect(closeBtn.exists()).toBe(true)
    await closeBtn.trigger('click')

    await wrapper.vm.$nextTick()
    expect(wrapper.find('#debug-illegal-pokemon-modal').exists()).toBe(false)
  })
})
