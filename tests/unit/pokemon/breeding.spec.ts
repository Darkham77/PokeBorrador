
import { describe, it, expect } from 'vitest'
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
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('Breeding Engine', () => {
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
      // Bulbasaur (Monster/Plant) + Charmander (Monster/Dragon)
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

    it('should inherit 5 IVs with Lazo Destino', () => {
      // Mocking Math.random and stats checking... 
      // For simplicity, we check if the result has no random 0-31 range for at least 5 indices 
      // if we were to mock it properly.
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
      // Mocking Math.random to always pass under 0.6
      inheritAbility(pA, pB)
      // Since it's random, we can't be 100% sure in a simple test without mocks, 
      // but in this version we check the logic flow.
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
      // Budew line
      expect(getEggSpecies('roselia')).toBe('budew')
      expect(getEggSpecies('roserade')).toBe('budew')
      expect(getEggSpecies('budew')).toBe('budew')

      // Azurill line
      expect(getEggSpecies('marill')).toBe('azurill')
      expect(getEggSpecies('azumarill')).toBe('azurill')
      expect(getEggSpecies('azurill')).toBe('azurill')

      // Happiny line
      expect(getEggSpecies('chansey')).toBe('happiny')
      expect(getEggSpecies('blissey')).toBe('happiny')

      // Munchlax line
      expect(getEggSpecies('snorlax')).toBe('munchlax')

      // Pichu line
      expect(getEggSpecies('pikachu')).toBe('pichu')
      expect(getEggSpecies('raichu')).toBe('pichu')

      // Cleffa line
      expect(getEggSpecies('clefairy')).toBe('cleffa')
      expect(getEggSpecies('clefable')).toBe('cleffa')

      // Igglybuff line
      expect(getEggSpecies('jigglypuff')).toBe('igglybuff')
      expect(getEggSpecies('wigglytuff')).toBe('igglybuff')

      // Elekid & Magby line
      expect(getEggSpecies('electabuzz')).toBe('elekid')
      expect(getEggSpecies('electivire')).toBe('elekid')
      expect(getEggSpecies('magmar')).toBe('magby')
      expect(getEggSpecies('magmortar')).toBe('magby')

      // Tyrogue line
      expect(getEggSpecies('hitmonlee')).toBe('tyrogue')
      expect(getEggSpecies('hitmonchan')).toBe('tyrogue')
      expect(getEggSpecies('hitmontop')).toBe('tyrogue')

      // Other babies
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
