import { describe, it, expect } from 'vitest'
import { getNpcEncounterChances } from '@/logic/weather/weatherUtils'
import { isMapExtortable } from '@/logic/map/mapCardHelper'
import type { MapLocation } from '@/types/pokemon/encounters'

describe('Npc Encounter Chances & Extortion Helpers', () => {
  describe('isMapExtortable', () => {
    it('debe retornar false si el mapa es nulo o no tiene salvajes', () => {
      expect(isMapExtortable(null)).toBe(false)
      expect(isMapExtortable({ id: 'pallet' as any, name: 'Pueblo Paleta', lv: [1, 2] })).toBe(false)
    })

    it('debe retornar false si el mapa es una ciudad principal', () => {
      const cityMap: MapLocation = {
        id: 'pallet' as any,
        name: 'Pueblo Paleta',
        wild: { day: ['rattata'] },
        lv: [1, 5]
      }
      expect(isMapExtortable(cityMap)).toBe(false)
    })

    it('debe retornar true si es una ruta común con salvajes', () => {
      const routeMap: MapLocation = {
        id: 'route1',
        name: 'Ruta 1',
        wild: { day: ['pidgey'] },
        lv: [2, 5]
      }
      expect(isMapExtortable(routeMap)).toBe(true)
    })
  })

  describe('getNpcEncounterChances', () => {
    it('debe calcular correctamente los chances de entrenador común', () => {
      const state = {
        faction: 'poder' as const,
        trainerChance: 8,
        playerClass: 'entrenador' as const,
        classLevel: 10
      }
      const chances = getNpcEncounterChances('route1', state as any, {}, [])
      const trainerInfo = chances.find(c => c.type === 'trainer')
      expect(trainerInfo).toBeDefined()
      expect(trainerInfo?.chance).toBe(8)
    })

    it('debe calcular los de oficial de policía si es Rocket con criminalidad máxima', () => {
      const state = {
        faction: 'union' as const,
        trainerChance: 5,
        playerClass: 'rocket' as const,
        classLevel: 50,
        classData: { criminality: 120 }
      }
      const chances = getNpcEncounterChances('route1', state as any, {}, [])
      const policeInfo = chances.find(c => c.type === 'police')
      expect(policeInfo).toBeDefined()
      expect(policeInfo?.chance).toBe(12) // 120 / 10
    })
  })
})
