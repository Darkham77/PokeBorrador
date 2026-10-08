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

  it('correctly marks isOwnProfile as false when inspecting another trainer ID', () => {
    const authStore = useAuthStore()
    authStore.user = { id: 'current-user-123' } as unknown as typeof authStore.user

    const profile = useTrainerProfile(() => 'foreign-user-456')
    expect(profile.isOwnProfile.value).toBe(false)
  })

  it('handles authenticated user with undefined target as not own profile', () => {
    const authStore = useAuthStore()
    authStore.user = { id: 'current-user-123' } as unknown as typeof authStore.user

    const profile = useTrainerProfile(() => undefined)
    expect(profile.isOwnProfile.value).toBe(false)
  })

  it('resolves public trainer metrics from profile row without saveState', () => {
    const authStore = useAuthStore()
    authStore.user = { id: 'current-user-123' } as unknown as typeof authStore.user

    const profileData = {
      id: 'foreign-user-456',
      username: 'MistyWater',
      badges: 4,
      pokedex_caught: 50,
      pokedex_seen: 90,
      trainers_defeated: 35,
      wild_wins: 110,
      war_coins: 75,
      defeated_gyms: ['cerulean', 'vermilion']
    }

    const modal = useTrainerProfile(() => 'foreign-user-456')
    expect(modal.isOwnProfile.value).toBe(false)

    modal.profile.value = profileData

    expect(modal.badgesCount.value).toBe(4)
    expect(modal.pokedexCaught.value).toBe(50)
    expect(modal.pokedexSeen.value).toBe(90)
    expect(modal.trainersDefeated.value).toBe(35)
    expect(modal.wildWins.value).toBe(110)
    expect(modal.warCoins.value).toBe(75)
    expect(modal.isGymDefeated('cerulean' as never)).toBe(true)
    expect(modal.isGymDefeated('pewter' as never)).toBe(false)
  })
})

