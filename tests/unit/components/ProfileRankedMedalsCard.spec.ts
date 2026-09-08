/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ProfileRankedMedalsCard from '@/components/profile/ProfileRankedMedalsCard.vue'
import type { RankedSeasonMedal } from '@/types/battle/pvp.ts'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'
import { usePvPStore } from '@/stores/pvp'

describe('ProfileRankedMedalsCard.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders empty state when no medals are passed', () => {
    const wrapper = mount(ProfileRankedMedalsCard, {
      props: {
        medals: []
      }
    })

    expect(wrapper.text()).toContain('MEDALLAS DE TEMPORADA RANKED (0)')
    expect(wrapper.text()).toContain('Sin medallas de temporada competitiva aún.')
    expect(wrapper.find('.empty-ranked-medals').exists()).toBe(true)
  })

  it('renders medal cards with tournament names, tier badges, ELO, and podium tags', () => {
    const testMedals: RankedSeasonMedal[] = [
      {
        id: 'medal_1',
        seasonName: 'Temporada 9',
        tournamentName: 'Frontera Kanto & Johto',
        themeId: 'johto_kanto_frontier',
        tier: 'maestro',
        rank: 1,
        finalElo: 3500,
        awardedAt: '2026-09-15T15:00:00Z'
      },
      {
        id: 'medal_2',
        seasonName: 'Temporada 10',
        tier: 'diamante',
        rank: 4,
        finalElo: 2850,
        awardedAt: '2026-10-15T15:00:00Z'
      }
    ]

    const wrapper = mount(ProfileRankedMedalsCard, {
      props: {
        medals: testMedals
      }
    })

    expect(wrapper.text()).toContain('MEDALLAS DE TEMPORADA RANKED (2)')
    expect(wrapper.find('.empty-ranked-medals').exists()).toBe(false)

    const items = wrapper.findAll('.ranked-medal-item')
    expect(items.length).toBe(2)

    // First medal: Maestro, Explicit Tournament Name, Podio 🥇
    expect(items[0]!.text()).toContain('Frontera Kanto & Johto')
    expect(items[0]!.text()).toContain('Septiembre 2026')
    expect(items[0]!.text()).toContain('Maestro • 3500 LP')
    expect(items[0]!.find('.podium-tag').text()).toBe('🥇')

    // Second medal: Diamante, Inferred October Theme, Podio Top 4
    expect(items[1]!.text()).toContain('Noche de Brujas')
    expect(items[1]!.text()).toContain('Octubre 2026')
    expect(items[1]!.text()).toContain('Diamante • 2850 LP')
    expect(items[1]!.find('.podium-tag').text()).toBe('Top 4')
  })

  it('interacts on click: opens Arena modal when available or notifies when finished', async () => {
    const modalStore = useModalStore()
    const uiStore = useUIStore()
    const pvpStore = usePvPStore()

    const openSpy = vi.spyOn(modalStore, 'open')
    const notifySpy = vi.spyOn(uiStore, 'notify')

    // Simulate current season is September (Frontera Kanto & Johto)
    pvpStore.currentSeasonRules = {
      name: 'Frontera Kanto & Johto',
      maxPokemon: 6,
      levelCap: 50,
      allowedTypes: [],
      bannedPokemonIds: []
    }

    const testMedals: RankedSeasonMedal[] = [
      {
        id: 'medal_active',
        seasonName: 'Temporada 9',
        tournamentName: 'Frontera Kanto & Johto',
        themeId: 'johto_kanto_frontier',
        tier: 'maestro',
        rank: 1,
        finalElo: 3500,
        // Match current year and month
        awardedAt: new Date().toISOString()
      },
      {
        id: 'medal_expired',
        seasonName: 'Temporada 1',
        tournamentName: 'Clásico Kanto',
        themeId: 'kanto_classic',
        tier: 'oro',
        rank: 12,
        finalElo: 1800,
        awardedAt: '2025-01-15T12:00:00Z'
      }
    ]

    const wrapper = mount(ProfileRankedMedalsCard, {
      props: {
        medals: testMedals
      }
    })

    const items = wrapper.findAll('.ranked-medal-item')
    expect(items.length).toBe(2)

    // Click on active medal -> opens RankedTournamentDetail modal
    await items[0]!.trigger('click')
    expect(openSpy).toHaveBeenCalledWith('RankedTournamentDetail', {
      themeId: 'johto_kanto_frontier',
      tournamentName: 'Frontera Kanto & Johto',
      medal: testMedals[0]
    })

    // Click on expired medal -> shows notification
    await items[1]!.trigger('click')
    expect(notifySpy).toHaveBeenCalledWith(
      expect.stringContaining('Clásico Kanto'),
      'ℹ️'
    )
  })
})

