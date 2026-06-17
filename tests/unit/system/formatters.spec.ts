/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { formatPlayerClass, formatFaction } from '@/logic/utils/formatters'

describe('Formatters Logic', () => {
  describe('formatPlayerClass', () => {
    it('debe retornar "SIN CLASE" si la clase es nula, vacía o indefinida', () => {
      expect(formatPlayerClass(null)).toBe('SIN CLASE')
      expect(formatPlayerClass(undefined)).toBe('SIN CLASE')
      expect(formatPlayerClass('   ')).toBe('SIN CLASE')
      expect(formatPlayerClass('null')).toBe('SIN CLASE')
      expect(formatPlayerClass('undefined')).toBe('SIN CLASE')
    })

    it('debe formatear clases conocidas a su nombre visible', () => {
      expect(formatPlayerClass('entrenador')).toBe('Entrenador')
      expect(formatPlayerClass('rocket')).toBe('Equipo Rocket')
      expect(formatPlayerClass('cazabichos')).toBe('Cazabichos')
      expect(formatPlayerClass('criador')).toBe('Criador')
    })

    it('debe convertir clases desconocidas a mayúsculas', () => {
      expect(formatPlayerClass('profesor')).toBe('PROFESOR')
      expect(formatPlayerClass('admin')).toBe('ADMIN')
    })
  })

  describe('formatFaction', () => {
    it('debe retornar "SIN BANDO" si la facción es nula, vacía, indefinida o "none"', () => {
      expect(formatFaction(null)).toBe('SIN BANDO')
      expect(formatFaction(undefined)).toBe('SIN BANDO')
      expect(formatFaction('   ')).toBe('SIN BANDO')
      expect(formatFaction('none')).toBe('SIN BANDO')
      expect(formatFaction('null')).toBe('SIN BANDO')
    })

    it('debe formatear bandos conocidos', () => {
      expect(formatFaction('union')).toBe('Bando Unión')
      expect(formatFaction('poder')).toBe('Bando Poder')
    })

    it('debe convertir bandos desconocidos a mayúsculas', () => {
      expect(formatFaction('otro')).toBe('OTRO')
    })
  })
})
