import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTrainerProfile } from '@/components/modals/useTrainerProfile'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'

describe('useTrainerProfile helpers & reactivity', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

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

  it('reactively reflects faction change for own profile without closing modal', () => {
    const authStore = useAuthStore()
    const gameStore = useGameStore()

    authStore.user = { id: 'test-user-id', email: 'test@example.com' } as unknown as typeof authStore.user
    gameStore.state.faction = null

    const profile = useTrainerProfile(() => authStore.user?.id)

    expect(profile.isOwnProfile.value).toBe(true)
    expect(profile.faction.value).toBeNull()
    expect(profile.factionLabel.value).toBe('Sin Bando')

    // Simulate changing faction in store
    gameStore.state.faction = 'poder'

    expect(profile.faction.value).toBe('poder')
    expect(profile.factionLabel.value).toBe('Equipo Poder')
  })
})
