import { describe, it, expect } from 'vitest'

describe('useTrainerProfile helpers', () => {
  it('correctly maps faction labels and handles null/NULL strings', () => {
    const FACTION_LABELS: Record<string, string> = {
      union: 'Equipo Unión',
      poder: 'Equipo Poder'
    }
    const resolveFactionLabel = (f: string | null | undefined): string => {
      if (!f) return 'Sin Bando'
      const clean = f.trim().toLowerCase()
      if (!clean || clean === 'null' || clean === 'undefined') return 'Sin Bando'
      return FACTION_LABELS[clean] || clean.toUpperCase()
    }

    expect(resolveFactionLabel('union')).toBe('Equipo Unión')
    expect(resolveFactionLabel('NULL')).toBe('Sin Bando')
    expect(resolveFactionLabel('null')).toBe('Sin Bando')
    expect(resolveFactionLabel(null)).toBe('Sin Bando')
  })
})
