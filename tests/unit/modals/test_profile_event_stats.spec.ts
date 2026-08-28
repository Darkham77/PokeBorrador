import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { computeEventTrophyCounts } from '@/components/modals/trainerProfileResolver'
import ProfileEventStatsCard from '@/components/profile/ProfileEventStatsCard.vue'
import { useTrainerProfile } from '@/components/modals/useTrainerProfile'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'

describe('Profile Event Stats & Medals Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('computeEventTrophyCounts', () => {
    it('correctly aggregates trophies from team and box across 1st, 2nd, and 3rd place', () => {
      const mockTeam = [
        {
          uid: 'p1',
          name: 'Pikachu',
          trophies: [
            { eventId: 'torneo_pesca', categoryId: 'weight', rank: 'first', score: 100, awardedAt: 1000 },
            { eventId: 'torneo_caza', categoryId: 'ivs', rank: 'first', score: 186, awardedAt: 2000 }
          ]
        },
        {
          uid: 'p2',
          name: 'Charizard',
          trophies: [
            { eventId: 'torneo_pesca', categoryId: 'height', rank: 'second', score: 90, awardedAt: 1000 }
          ]
        }
      ]

      const mockBox = [
        {
          uid: 'p3',
          name: 'Blastoise',
          trophies: [
            { eventId: 'gran_concurso_sabado', categoryId: 'ivs', rank: 'third', score: 150, awardedAt: 3000 }
          ]
        },
        {
          uid: 'p4',
          name: 'Venusaur',
          trophies: []
        }
      ]

      const res = computeEventTrophyCounts(mockTeam, mockBox)
      expect(res.first).toBe(2)
      expect(res.second).toBe(1)
      expect(res.third).toBe(1)
      expect(res.total).toBe(4)
    })

    it('reconciles with DB counts and saved stats taking the maximum', () => {
      const mockTeam = [
        {
          uid: 'p1',
          trophies: [
            { rank: 'first' }
          ]
        }
      ]

      const res = computeEventTrophyCounts(mockTeam, [], 3, 2, 1, 0, 0, 0)
      expect(res.first).toBe(3)
      expect(res.second).toBe(2)
      expect(res.third).toBe(1)
      expect(res.total).toBe(6)
    })
  })

  describe('ProfileEventStatsCard.vue', () => {
    it('renders all event metrics correctly with proper formatting and labels', () => {
      const wrapper = mount(ProfileEventStatsCard, {
        props: {
          participations: 12,
          medalsTotal: 7,
          firstPlace: 3,
          secondPlace: 2,
          thirdPlace: 2
        }
      })

      expect(wrapper.text()).toContain('TORNEOS Y COMPETICIONES DE EVENTOS')
      expect(wrapper.text()).toContain('12')
      expect(wrapper.text()).toContain('Eventos Participados')
      expect(wrapper.text()).toContain('7')
      expect(wrapper.text()).toContain('Medallas Totales')
      expect(wrapper.text()).toContain('1er Puesto (Oro)')
      expect(wrapper.text()).toContain('2do Puesto (Plata)')
      expect(wrapper.text()).toContain('3er Puesto (Bronce)')
      expect(wrapper.text()).toContain('3')
      expect(wrapper.text()).toContain('2')
    })
  })

  describe('useTrainerProfile event medals reactivity', () => {
    it('computes event stats for own profile from gameStore', () => {
      const authStore = useAuthStore()
      const gameStore = useGameStore()

      authStore.user = { id: 'usr-123' } as unknown as typeof authStore.user
      gameStore.state.stats = {
        eventParticipations: 5,
        eventMedalsFirst: 2,
        eventMedalsSecond: 1,
        eventMedalsThird: 1,
        eventMedalsTotal: 4
      }

      gameStore.state.team = [
        {
          uid: 'p-1',
          name: 'Magikarp',
          trophies: [
            { eventId: 'torneo_pesca', categoryId: 'weight', rank: 'first', score: 200, awardedAt: 100 }
          ]
        } as unknown as typeof gameStore.state.team[0]
      ]

      const profile = useTrainerProfile(() => authStore.user?.id)

      expect(profile.eventParticipations.value).toBe(5)
      expect(profile.eventMedalsFirst.value).toBe(2)
      expect(profile.eventMedalsSecond.value).toBe(1)
      expect(profile.eventMedalsThird.value).toBe(1)
      expect(profile.eventMedalsTotal.value).toBe(4)
    })
  })
})
