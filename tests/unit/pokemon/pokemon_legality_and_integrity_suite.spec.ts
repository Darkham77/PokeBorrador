/**
 * tests/unit/pokemon/pokemon_legality_and_integrity_suite.spec.ts
 * Cohesive domain suite consolidating Pokemon legality rules, move/ability repairs,
 * database integrity, stat bounds, Spanish translations, and whitelist constraints.
 */
import { describe, it, expect } from 'vitest'
import { checkPokemonLegality, repairPokemonLegality, hasIllegalPokemon } from '@/logic/pokemon/pokemonLegality'
import { POKEMON_DB } from '@/data/pokemon/pokemonDB'
import { NATURES } from '@/data/battle/natures'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { ACTIVE_GENERATION } from '@/data/system/constants'
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('Pokemon Legality & Integrity Domain Suite', () => {
  describe('Pokemon Legality & Repair Logic', () => {
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

  describe('Pokemon Database Integrity', () => {
    const species = Object.entries(POKEMON_DB)

    it('should have at least the expected number of species for the implemented generation', () => {
      const expectedCounts: Record<number, number> = {
        1: 151,
        2: 251,
        3: 386,
        4: 493,
        5: 649,
        6: 721,
        7: 809,
        8: 905,
        9: 1025
      }
      const minExpected = expectedCounts[ACTIVE_GENERATION] ?? 1025
      expect(species.length).toBeGreaterThanOrEqual(minExpected)
    })

    it('every species must have a valid catchRate', () => {
      species.forEach(([id, data]) => {
        expect(data.catchRate, `Pokemon "${id}" is missing catchRate`).toBeDefined()
        expect(typeof data.catchRate, `Pokemon "${id}" catchRate must be a number`).toBe('number')
        expect(data.catchRate, `Pokemon "${id}" catchRate must be between 3 and 255`).toBeGreaterThanOrEqual(3)
        expect(data.catchRate, `Pokemon "${id}" catchRate must be between 3 and 255`).toBeLessThanOrEqual(255)
      })
    })

    it('every species must have core combat stats', () => {
      const stats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
      species.forEach(([id, data]) => {
        const record = data as unknown as Record<string, unknown>
        stats.forEach(stat => {
          expect(record[stat], `Pokemon "${id}" is missing stat: ${stat}`).toBeDefined()
          expect(typeof record[stat], `Pokemon "${id}" stat ${stat} must be a number`).toBe('number')
          expect(record[stat] as number, `Pokemon "${id}" stat ${stat} must be positive`).toBeGreaterThan(0)
        })
      })
    })

    it('every species must have a valid learnset', () => {
      species.forEach(([id, data]) => {
        // Ignorar megas, gmax, primales, totems, formas de Pikachu y formas de Castform en la validación de learnsets
        if (
          id.includes('mega') || id.includes('primal') || id.includes('totem') || id.endsWith('gmax') || 
          (id.startsWith('pikachu') && id !== 'pikachu') ||
          (id.startsWith('castform') && id !== 'castform')
        ) return

        expect(Array.isArray(data.learnset), `Pokemon "${id}" learnset must be an array`).toBe(true)
        expect(data.learnset.length, `Pokemon "${id}" learnset cannot be empty`).toBeGreaterThan(0)

        interface LearnsetMove {
          lv: number
          id: string
          name: string
          pp: number
        }

        ;(data.learnset as LearnsetMove[]).forEach((move: LearnsetMove, index: number) => {
          expect(move.lv, `Pokemon "${id}" move at index ${index} missing level`).toBeDefined()
          expect(move.name, `Pokemon "${id}" move at index ${index} missing name`).toBeDefined()
          expect(move.pp, `Pokemon "${id}" move at index ${index} missing pp`).toBeDefined()
        })
      })
    })

    it('every species ID (key) must be lowercase and consistent', () => {
      Object.keys(POKEMON_DB).forEach(id => {
        expect(id, `Pokemon ID "${id}" must be lowercase`).toBe(id.toLowerCase())
        expect(id.includes(' '), `Pokemon ID "${id}" should not contain spaces`).toBe(false)
      })
    })

    it('all system natures must have valid Spanish translation data', () => {
      NATURES.forEach((natureId: string) => {
        const data = pokemonDataProvider.getNatureData(natureId)
        expect(data, `Nature "${natureId}" must resolve data`).not.toBeNull()
        if (!data) return
        expect(data.name, `Nature "${natureId}" must have a Spanish translated name`).toBeDefined()
        expect(data.name, `Nature "${natureId}" Spanish name must not be English ID`).not.toBe(natureId)
        expect(data.desc, `Nature "${natureId}" must have a Spanish description`).toBeDefined()
      })
    })

    it('all abilities of all species in database must have valid Spanish translation data', () => {
      const errors: string[] = []
      
      Object.keys(POKEMON_DB).forEach(pokeId => {
        const abilities = pokemonDataProvider.getSpeciesAbilities(requirePokemonSpeciesId(pokeId))
        if (abilities.length === 0) {
          errors.push(`Pokemon "${pokeId}" does not have any abilities.`)
        }
        
        abilities.forEach(abilityId => {
          const data = pokemonDataProvider.getAbilityData(abilityId)
          if (!data) {
            errors.push(`Ability "${abilityId}" on species "${pokeId}" returned null data.`)
            return
          }
          if (!data.name) {
            errors.push(`Ability "${abilityId}" on species "${pokeId}" is missing name.`)
          }
        })
      })

      expect(errors, `Habilidades con traducciones faltantes:\n${errors.join('\n')}`).toEqual([])
    })

    it('should only allow retrieving data for whitelisted Pokémon species', () => {
      // Bulbasaur is in the whitelist (Gen 1)
      expect(() => pokemonDataProvider.getPokemonData('bulbasaur')).not.toThrow()

      // Aggron is Gen 3 and not in current ENABLED_POKEMON_IDS
      expect(() => pokemonDataProvider.getPokemonData('aggron')).toThrow(/whitelist/)
    })
  })
})
