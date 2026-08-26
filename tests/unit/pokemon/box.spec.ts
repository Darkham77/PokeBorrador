/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBoxStore } from '@/stores/box'
import { useGameStore } from '@/stores/game'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('BoxStore Modernization', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const gs = useGameStore()
    Object.assign(gs.state, {
      money: 1000,
      box: [
        { id: 'pidgey', name: 'Pidgey', level: 10, ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }, maxHp: 30, hp: 10, ability: 'keeneye', moves: [{ id: 'tackle', name: 'Tackle', pp: 0, maxPP: 35 }] },
        { id: 'rattata', name: 'Rattata', level: 5, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, maxHp: 20, hp: 20, ability: 'runaway', moves: [{ id: 'tackle', name: 'Tackle', pp: 35, maxPP: 35 }] }
      ],
      team: [
        { id: 'bulbasaur', name: 'Bulbasaur', level: 5, maxHp: 20, hp: 5, ability: 'overgrow', moves: [{ id: 'tackle', name: 'Tackle', pp: 0, maxPP: 35 }] },
        { id: 'pidgey-team', name: 'Pidgey', level: 5, maxHp: 20, hp: 20, ability: 'keeneye', moves: [{ id: 'tackle', name: 'Tackle', pp: 35, maxPP: 35 }] }
      ],
      boxCount: 4,
      starterChosen: true,
      playerClass: 'rocket'
    })
    gs.save = vi.fn()
  })

  it('should toggle tags correctly', () => {
    const box = useBoxStore()
    const gs = useGameStore()
    
    box.togglePokeTag(0, 'fav')
    const poke1 = gs.state.box[0] as Pokemon
    expect(poke1.tags).toContain('fav')
    
    box.togglePokeTag(0, 'fav')
    const poke2 = gs.state.box[0] as Pokemon
    expect(poke2.tags).not.toContain('fav')
  })

  it('should calculate Rocket Sell value with legacy formula', () => {
    const box = useBoxStore()
    box.boxRocketSelected = [0] // Pidgey Lv 10, IV Total 60
    
    // Formula: floor((10 * 50 + (60 / 186) * 500) * 0.8)
    // 60/186 = 0.3225
    // 0.3225 * 500 = 161.29
    // 500 + 161.29 = 661.29
    // 661.29 * 0.8 = 529.03 -> 529
    const val = box.getRocketSellValue()
    expect(val).toBe(529)
  })

  it('should not heal pokemon when sent to box', () => {
    const gs = useGameStore()
    const bulbasaur = gs.state.team[0] as Pokemon
    
    // Bulbasaur has 5/20 HP and 0 PP
    gs.sendToBox(0)
    
    expect(bulbasaur.hp).toBe(5)
    expect(bulbasaur.moves![0]!.pp).toBe(0)
    expect(gs.state.box).toContain(bulbasaur)
  })

  it('should move pokemon between boxes', () => {
    const box = useBoxStore()
    const gs = useGameStore()
    
    // Reset box
    gs.state.box = [
      { id: 'pidgey', name: 'Pidgey', level: 10, ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }, moves: [{ name: 'Tackle', pp: 35, maxPP: 35 }] } as unknown as Pokemon
    ]
    
    box.movePokemonToBox(0, 1) // Move Pidgey to Box 2 (start index 50)
    
    const pidgeyBox = gs.state.box[50] as Pokemon
    expect(pidgeyBox.name).toBe('Pidgey')
    expect(gs.state.box[0]).toBeNull()
  })

  it('should block selection of busy Pokémon for release and black market sale', () => {
    const box = useBoxStore()
    const gs = useGameStore()

    // Add busy status flags to box Pokémon
    gs.state.box = [
      { id: 'pidgey', name: 'Pidgey', level: 10, inDaycare: true, ability: 'keeneye', moves: [{ id: 'tackle', name: 'Tackle', pp: 35, maxPP: 35 }] } as unknown as Pokemon,
      { id: 'rattata', name: 'Rattata', level: 5, onMission: true, ability: 'runaway', moves: [{ id: 'tackle', name: 'Tackle', pp: 35, maxPP: 35 }] } as unknown as Pokemon,
      { id: 'ekans', name: 'Ekans', level: 8, onDefense: true, ability: 'intimidate', moves: [{ id: 'wrap', name: 'Wrap', pp: 20, maxPP: 20 }] } as unknown as Pokemon,
      { id: 'zubat', name: 'Zubat', level: 7, ability: 'innerfocus', moves: [{ id: 'leechlife', name: 'Leech Life', pp: 15, maxPP: 15 }] } as unknown as Pokemon // Available
    ]

    // Attempting to select busy Pokémon should be ignored
    box.toggleBoxReleaseSelect(0)
    box.toggleBoxReleaseSelect(1)
    box.toggleBoxReleaseSelect(2)
    box.toggleBoxReleaseSelect(3) // OK
    expect(box.boxReleaseSelected).toEqual([3])

    box.boxReleaseSelected = []

    box.toggleBoxRocketSelect(0)
    box.toggleBoxRocketSelect(1)
    box.toggleBoxRocketSelect(2)
    box.toggleBoxRocketSelect(3) // OK
    expect(box.boxRocketSelected).toEqual([3])
  })

  it('should ignore/skip busy Pokémon during release and black market sale processing', () => {
    const box = useBoxStore()
    const gs = useGameStore()

    // Force selection of busy Pokémon directly (e.g. testing store logic robustness)
    gs.state.box = [
      { id: 'pidgey', name: 'Pidgey', level: 10, inDaycare: true, ability: 'keeneye', moves: [{ id: 'tackle', name: 'Tackle', pp: 35, maxPP: 35 }] } as unknown as Pokemon,
      { id: 'zubat', name: 'Zubat', level: 7, ability: 'innerfocus', moves: [{ id: 'leechlife', name: 'Leech Life', pp: 15, maxPP: 15 }] } as unknown as Pokemon
    ]

    // Force indexes 0 and 1 into selections
    box.boxReleaseSelected = [0, 1]
    const released = box.doBoxRelease()
    
    // Pidgey (0) should have been skipped, Zubat (1) released
    expect(released).toEqual(['Zubat'])
    expect(gs.state.box[0]?.id).toBe('pidgey') // Pidgey still in box
    expect(gs.state.box.length).toBe(1)

    // Reset box and try with black market sale
    gs.state.box = [
      { id: 'pidgey', name: 'Pidgey', level: 10, inDaycare: true, ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }, ability: 'keeneye', moves: [{ id: 'tackle', name: 'Tackle', pp: 35, maxPP: 35 }] } as unknown as Pokemon,
      { id: 'zubat', name: 'Zubat', level: 7, ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }, ability: 'innerfocus', moves: [{ id: 'leechlife', name: 'Leech Life', pp: 15, maxPP: 15 }] } as unknown as Pokemon
    ]
    box.boxRocketSelected = [0, 1]
    const val = box.getRocketSellValue()
    // The value should only calculate Zubat's price and ignore busy Pidgey
    const expectedZubatVal = Math.floor((7 * 50 + (60 / 186) * 500) * 0.8)
    expect(val).toBe(expectedZubatVal)

    const sold = box.doBoxRocketSell()
    expect(sold.count).toBe(1)
    expect(gs.state.box[0]?.id).toBe('pidgey') // Pidgey still in box
  })
})
