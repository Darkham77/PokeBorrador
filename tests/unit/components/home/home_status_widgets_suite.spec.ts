// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { gsap } from 'gsap'
import HomeBreedingWidget from '@/components/home/HomeBreedingWidget.vue'
import HomeCollapsibleWidget from '@/components/home/HomeCollapsibleWidget.vue'
import HomeFactionWar from '@/components/home/HomeFactionWar.vue'
import HomeGymsProgress from '@/components/home/HomeGymsProgress.vue'
import HomeNotificationsFeed from '@/components/home/HomeNotificationsFeed.vue'
import HomePendingRewardsWidget from '@/components/home/HomePendingRewardsWidget.vue'
import HomeWidgetMinimizeBtn from '@/components/home/HomeWidgetMinimizeBtn.vue'
import HomeWidgetRefreshBtn from '@/components/home/HomeWidgetRefreshBtn.vue'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import { useWarStore } from '@/stores/war'
import { useUIStore } from '@/stores/ui'
import { useEventStore } from '@/stores/events'
import { usePvPStore } from '@/stores/pvp'
import type { PokemonEgg } from '@/types/pokemon/pokemon'

const mockIsCollapsed = vi.fn()
const mockToggleCollapse = vi.fn()
const mockGetWidgetBadge = vi.fn()

vi.mock('@/composables/home/useHomeWidgetsCollapse', () => ({
  useHomeWidgetsCollapse: () => ({
    isCollapsed: mockIsCollapsed,
    toggleCollapse: mockToggleCollapse
  })
}))

vi.mock('@/composables/home/useHomeWidgetBadges', () => ({
  useHomeWidgetBadges: () => ({
    getWidgetBadge: mockGetWidgetBadge
  })
}))

describe('Home Status & Activity Widgets Suite', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    vi.clearAllMocks()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  describe('HomeBreedingWidget.vue', () => {
    it('renders walking eggs and calculates steps percentage accurately', () => {
      const gameStore = useGameStore()
      gameStore.state.eggs = [
        {
          uid: 'egg-1',
          species: 'eevee',
          steps: 100,
          totalSteps: 500,
          ready: false
        } as unknown as PokemonEgg
      ]

      const wrapper = mount(HomeBreedingWidget, {
        global: {
          directives: {
            GsapHover: () => {}
          },
          stubs: {
            EggSprite: {
              template: '<span class="egg-sprite-mock">🥚</span>'
            }
          }
        }
      })

      expect(wrapper.text()).toContain('EN CAMINATA & CRIANZA')
      expect(wrapper.text()).toContain('CAMINANDO')
      expect(wrapper.text()).toContain('80%')
      expect(wrapper.text()).toContain('400 / 500 pasos')
    })

    it('renders empty state and opens Daycare modal on click when no eggs are walking', async () => {
      const gameStore = useGameStore()
      const modalStore = useModalStore()
      gameStore.state.eggs = []

      const wrapper = mount(HomeBreedingWidget, {
        global: {
          directives: {
            GsapHover: () => {}
          },
          stubs: {
            EggSprite: {
              template: '<span class="egg-sprite-mock">🥚</span>'
            }
          }
        }
      })

      expect(wrapper.text()).toContain('No hay huevos en caminata')
      await wrapper.find('.empty-breeding-card').trigger('click')
      expect(modalStore.isOpen('Daycare')).toBe(true)
    })

    it('binds 3-column classes correctly when columns=3 prop is provided', () => {
      const gameStore = useGameStore()
      gameStore.state.eggs = [
        {
          uid: 'egg-1',
          species: 'eevee',
          steps: 0,
          totalSteps: 500,
          ready: true
        } as unknown as PokemonEgg
      ]

      const wrapper = mount(HomeBreedingWidget, {
        props: {
          columns: 3
        },
        global: {
          directives: {
            GsapHover: () => {}
          },
          stubs: {
            EggSprite: {
              template: '<span class="egg-sprite-mock">🥚</span>'
            }
          }
        }
      })

      expect(wrapper.classes()).toContain('cols-3')
      expect(wrapper.find('.eggs-grid').classes()).toContain('grid-cols-3')
      expect(wrapper.text()).toContain('¡LISTO PARA ECLOSIONAR!')
    })
  })

  describe('HomeCollapsibleWidget.vue', () => {
    it('renders default slot when widget is expanded', () => {
      mockIsCollapsed.mockReturnValue(false)

      const wrapper = mount(HomeCollapsibleWidget, {
        props: {
          widgetId: 'events',
          title: 'EVENTOS MUNDIALES',
          icon: '🏆'
        },
        slots: {
          default: '<div class="test-content">Contenido de Eventos</div>'
        }
      })

      expect(wrapper.find('.home-collapsible-expanded').exists()).toBe(true)
      expect(wrapper.find('.test-content').text()).toBe('Contenido de Eventos')
      expect(wrapper.find('.accordion-panel').exists()).toBe(false)
    })

    it('renders notification pill badge when widget is collapsed and has a badge', () => {
      mockIsCollapsed.mockReturnValue(true)
      mockGetWidgetBadge.mockReturnValue(3)

      const wrapper = mount(HomeCollapsibleWidget, {
        props: {
          widgetId: 'buffs',
          title: 'POTENCIADORES & AURAS',
          icon: '⚡'
        }
      })

      expect(wrapper.find('.home-collapsible-panel').exists()).toBe(true)
      expect(wrapper.find('.collapse-title').text()).toBe('POTENCIADORES & AURAS')

      const pill = wrapper.find('.collapse-pill-badge')
      expect(pill.exists()).toBe(true)
      expect(pill.classes()).toContain('hud-notification-badge')
      expect(pill.text()).toBe('3')
      expect(pill.text()).not.toContain('(')
      expect(pill.text()).not.toContain(')')
    })

    it('prefers explicit badge prop over composable getWidgetBadge', () => {
      mockIsCollapsed.mockReturnValue(true)
      mockGetWidgetBadge.mockReturnValue(99)

      const wrapper = mount(HomeCollapsibleWidget, {
        props: {
          widgetId: 'pending_rewards',
          title: 'RECOMPENSAS PENDIENTES',
          icon: '🎁',
          badge: 10
        }
      })

      const pill = wrapper.find('.collapse-pill-badge')
      expect(pill.exists()).toBe(true)
      expect(pill.text()).toBe('10')
    })

    it('triggers toggleCollapse when clicking the collapsed accordion bar', async () => {
      mockIsCollapsed.mockReturnValue(true)

      const wrapper = mount(HomeCollapsibleWidget, {
        props: {
          widgetId: 'missions',
          title: 'MISIONES DIARIAS',
          icon: '📜'
        }
      })

      await wrapper.find('.accordion-toggle').trigger('click')
      expect(mockToggleCollapse).toHaveBeenCalledWith('missions')
    })
  })

  describe('HomeFactionWar.vue', () => {
    it('renders territorial war dominance information and user stats', () => {
      const warStore = useWarStore()
      warStore.faction = 'union'
      warStore.weeklyPoints = 350
      warStore.warCoins = 75

      const wrapper = mount(HomeFactionWar, {
        global: { plugins: [pinia] }
      })

      expect(wrapper.text()).toContain('GUERRA TERRITORIAL DE FACCIONES')
      expect(wrapper.text()).toContain('UNIÓN')
      expect(wrapper.text()).toContain('PODER')
      expect(wrapper.text()).toContain('350 PT')
      expect(wrapper.text()).toContain('75 🪙')
    })

    it('does not render redundant HUD navigation buttons (war map and shop)', () => {
      const wrapper = mount(HomeFactionWar, {
        global: { plugins: [pinia] }
      })

      expect(wrapper.find('#home-war-open-btn').exists()).toBe(false)
      expect(wrapper.find('#home-war-shop-btn').exists()).toBe(false)
      expect(wrapper.find('.header-actions').exists()).toBe(true)
    })
  })

  describe('HomeGymsProgress.vue', () => {
    it('renders 8 gym badge slots with correct defeated state and sprites', () => {
      const gameStore = useGameStore()
      gameStore.state.defeatedGyms = ['pewter', 'cerulean']

      const wrapper = mount(HomeGymsProgress, {
        global: { plugins: [pinia] }
      })

      expect(wrapper.text()).toContain('GIMNASIOS DE KANTO')
      expect(wrapper.text()).toContain('2/8 Medallas Conquistadas')

      const slots = wrapper.findAll('.medal-slot')
      expect(slots.length).toBe(8)
      expect(slots[0]!.classes()).toContain('is-conquered')
      expect(slots[1]!.classes()).toContain('is-conquered')
      expect(slots[2]!.classes()).not.toContain('is-conquered')
    })

    it('opens Gyms modal when clicking anywhere on the widget', async () => {
      const uiStore = useUIStore()
      const wrapper = mount(HomeGymsProgress, {
        global: { plugins: [pinia] }
      })

      expect(wrapper.find('#home-gyms-open-btn').exists()).toBe(false)

      const medalSlot = wrapper.find('.medal-slot')
      expect(medalSlot.exists()).toBe(true)
      await medalSlot.trigger('click')
      expect(uiStore.activeTab).toBe('gyms')
    })
  })

  describe('HomeNotificationsFeed.vue', () => {
    it('renders notification items and respects the 50 max count indicator', () => {
      const gameStore = useGameStore()
      gameStore.state.notificationHistory = [
        {
          id: 'n1',
          type: 'general',
          title: '🔴',
          message: 'Has capturado un Pikachu salvaje',
          timestamp: Temporal.Now.instant().epochMilliseconds,
          read: true,
          meta: { icon: '🔴' }
        },
        {
          id: 'n2',
          type: 'general',
          title: '💰',
          message: 'Compraste 5 Pociones en la tienda por $1,500',
          timestamp: Temporal.Now.instant().epochMilliseconds,
          read: true,
          meta: { icon: '💰' }
        }
      ]

      const wrapper = mount(HomeNotificationsFeed)

      expect(wrapper.text()).toContain('HISTORIAL DE ACTIVIDAD (2/50)')
      expect(wrapper.text()).toContain('Has capturado un Pikachu salvaje')
      expect(wrapper.text()).toContain('Compraste 5 Pociones en la tienda')
    })

    it('filters out welcome notifications from the activity feed', () => {
      const gameStore = useGameStore()
      gameStore.state.notificationHistory = [
        {
          id: 'w1',
          type: 'general',
          title: '👋',
          message: '¡Bienvenido de vuelta, Franco!',
          timestamp: Temporal.Now.instant().epochMilliseconds,
          read: true,
          meta: { icon: '👋' }
        },
        {
          id: 'a1',
          type: 'general',
          title: '💰',
          message: '¡Has tomado control y extorsionado la Ruta 1!',
          timestamp: Temporal.Now.instant().epochMilliseconds,
          read: true,
          meta: { icon: '💰' }
        }
      ]

      const wrapper = mount(HomeNotificationsFeed)

      expect(wrapper.text()).toContain('HISTORIAL DE ACTIVIDAD (1/50)')
      expect(wrapper.text()).not.toContain('¡Bienvenido de vuelta, Franco!')
      expect(wrapper.text()).toContain('¡Has tomado control y extorsionado la Ruta 1!')
    })

    it('renders empty state when there are no notifications', () => {
      const gameStore = useGameStore()
      gameStore.state.notificationHistory = []

      const wrapper = mount(HomeNotificationsFeed)

      expect(wrapper.text()).toContain('Sin actividad reciente registrada.')
    })
  })

  describe('HomePendingRewardsWidget.vue', () => {
    it('does not render when there are no claimable rewards', () => {
      const pvpStore = usePvPStore()
      pvpStore.maxElo = 0
      pvpStore.rewardsClaimed = []

      const wrapper = mount(HomePendingRewardsWidget, {
        global: {
          directives: {
            'gsap-hover': () => {}
          },
          stubs: {
            RewardPillsGroup: true
          }
        }
      })

      expect(wrapper.find('#widget-pending-rewards').exists()).toBe(false)
      wrapper.unmount()
    })

    it('renders and displays rewards when awards are present', async () => {
      const eventStore = useEventStore()
      const pvpStore = usePvPStore()
      pvpStore.maxElo = 0

      eventStore.pendingAwards = [
        {
          id: 'award-1',
          event_id: 'ev-test',
          winner_id: 'user-1',
          prize: JSON.stringify({ money: 1000 }),
          received_at: null,
          awarded_at: '2026-09-01T00:00:00Z'
        }
      ]
      eventStore.allEvents = [
        {
          id: 'ev-test',
          name: 'Torneo Kanto',
          start_at: '2026-09-01T00:00:00Z',
          end_at: '2026-09-30T00:00:00Z',
          active: true,
          config: {
            prize: { money: 1000 }
          }
        } as any
      ]

      const wrapper = mount(HomePendingRewardsWidget, {
        global: {
          directives: {
            'gsap-hover': () => {}
          },
          stubs: {
            RewardPillsGroup: true
          }
        }
      })

      expect(wrapper.find('#widget-pending-rewards').exists()).toBe(true)
      expect(wrapper.find('.event-pending-awards-banner').exists()).toBe(true)
      expect(wrapper.findAll('.event-pending-awards-banner .award-item').length).toBe(1)
      expect(wrapper.text()).toContain('RECOMPENSAS PENDIENTES (1)')
      expect(wrapper.find('#claim-pending-reward-btn-event-award-1').exists()).toBe(true)
      expect(wrapper.find('#discard-pending-reward-btn-event-award-1').exists()).toBe(true)

      wrapper.unmount()
    })

    it('shows bulk RECLAMAR TODO button when more than 1 reward is pending', async () => {
      const eventStore = useEventStore()
      const pvpStore = usePvPStore()

      eventStore.pendingAwards = [
        {
          id: 'award-1',
          event_id: 'ev-test',
          winner_id: 'user-1',
          prize: JSON.stringify({ money: 1000 }),
          received_at: null,
          awarded_at: '2026-09-01T00:00:00Z'
        }
      ]
      eventStore.allEvents = [
        {
          id: 'ev-test',
          name: 'Torneo Kanto',
          start_at: '2026-09-01T00:00:00Z',
          end_at: '2026-09-30T00:00:00Z',
          active: true,
          config: {
            prize: { money: 1000 }
          }
        } as any
      ]

      pvpStore.maxElo = 1300
      pvpStore.rewardsClaimed = []

      const wrapper = mount(HomePendingRewardsWidget, {
        global: {
          directives: {
            'gsap-hover': () => {}
          },
          stubs: {
            RewardPillsGroup: true
          }
        }
      })

      expect(wrapper.find('.claim-all-btn').exists()).toBe(true)
      expect(wrapper.find('.claim-all-btn').text()).toContain('RECLAMAR TODO')

      wrapper.unmount()
    })

    it('renders and stays visible when only unclaimable/discardable rewards exist', async () => {
      const eventStore = useEventStore()
      const pvpStore = usePvPStore()
      pvpStore.maxElo = 0

      eventStore.pendingAwards = [
        {
          id: 'legacy-award-1',
          event_id: 'ev-archived',
          winner_id: 'user-1',
          prize: JSON.stringify({ money: 500 }),
          received_at: null,
          awarded_at: '2026-08-01T00:00:00Z'
        }
      ]
      eventStore.allEvents = []

      const wrapper = mount(HomePendingRewardsWidget, {
        global: {
          directives: {
            'gsap-hover': () => {}
          },
          stubs: {
            RewardPillsGroup: true
          }
        }
      })

      expect(wrapper.find('#widget-pending-rewards').exists()).toBe(true)
      expect(wrapper.text()).toContain('RECOMPENSAS PENDIENTES (1)')
      expect(wrapper.find('#claim-pending-reward-btn-event-legacy-award-1').exists()).toBe(false)
      expect(wrapper.find('#discard-pending-reward-btn-event-legacy-award-1').exists()).toBe(true)

      wrapper.unmount()
    })
  })

  describe('HomeWidgetMinimizeBtn.vue', () => {
    it('renders with standard minimize-widget-btn class and fontawesome icon', () => {
      const wrapper = mount(HomeWidgetMinimizeBtn, {
        props: {
          widgetId: 'events'
        },
        global: {
          directives: {
            'gsap-hover': {}
          }
        }
      })

      const button = wrapper.find('button')
      expect(button.exists()).toBe(true)
      expect(button.attributes('id')).toBe('home-minimize-events-btn')
      expect(button.classes()).toContain('minimize-widget-btn')
      expect(button.classes()).not.toContain('card-action-btn')

      const icon = wrapper.find('i.fa-chevron-up')
      expect(icon.exists()).toBe(true)
      expect(button.attributes('title')).toBe('Minimizar widget')
    })

    it('triggers toggleCollapse when clicked', async () => {
      const wrapper = mount(HomeWidgetMinimizeBtn, {
        props: {
          widgetId: 'missions'
        },
        global: {
          directives: {
            'gsap-hover': {}
          }
        }
      })

      await wrapper.find('button').trigger('click')
      expect(mockToggleCollapse).toHaveBeenCalledWith('missions')
    })
  })

  describe('HomeWidgetRefreshBtn.vue', () => {
    it('renders standard circular refresh button with vector svg', () => {
      const wrapper = mount(HomeWidgetRefreshBtn, {
        global: {
          directives: {
            'gsap-hover': {}
          }
        }
      })

      const button = wrapper.find('button')
      expect(button.exists()).toBe(true)
      expect(button.classes()).toContain('btn-refresh-header')
      expect(button.classes()).toContain('size-sm')

      const svgIcon = wrapper.find('svg.refresh-icon')
      expect(svgIcon.exists()).toBe(true)
      expect(svgIcon.find('path').exists()).toBe(true)

      expect(wrapper.find('.btn-label').exists()).toBe(false)
      expect(button.attributes('title')).toBe('Refrescar contenido')
      expect(button.attributes('disabled')).toBeUndefined()
    })

    it('supports custom id, variant, label, and title', () => {
      const wrapper = mount(HomeWidgetRefreshBtn, {
        props: {
          id: 'custom-refresh-btn',
          variant: 'pill',
          label: 'ACTUALIZAR',
          title: 'Actualizar lista'
        },
        global: {
          directives: {
            'gsap-hover': {}
          }
        }
      })

      const button = wrapper.find('button')
      expect(button.attributes('id')).toBe('custom-refresh-btn')
      expect(button.attributes('title')).toBe('Actualizar lista')
      expect(button.classes()).toContain('btn-refresh-pill')
      expect(wrapper.find('.btn-label').text()).toBe('ACTUALIZAR')
    })

    it('is disabled when disabled prop is true', () => {
      const wrapper = mount(HomeWidgetRefreshBtn, {
        props: {
          disabled: true
        },
        global: {
          directives: {
            'gsap-hover': {}
          }
        }
      })

      const button = wrapper.find('button')
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('handles loading state and triggers gsap animation', async () => {
      const toSpy = vi.spyOn(gsap, 'to')
      const setSpy = vi.spyOn(gsap, 'set')

      const wrapper = mount(HomeWidgetRefreshBtn, {
        props: {
          loading: false
        },
        global: {
          directives: {
            'gsap-hover': {}
          }
        }
      })

      const button = wrapper.find('button')
      expect(button.classes()).not.toContain('is-loading')
      expect(button.attributes('disabled')).toBeUndefined()

      await wrapper.setProps({ loading: true })

      expect(button.classes()).toContain('is-loading')
      expect(button.attributes('disabled')).toBeDefined()
      expect(toSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          rotation: '+=360',
          duration: 1,
          repeat: -1,
          ease: 'none'
        })
      )

      await wrapper.setProps({ loading: false })
      expect(button.classes()).not.toContain('is-loading')
      expect(setSpy).toHaveBeenCalledWith(expect.anything(), { rotation: 0 })
    })

    it('emits click event on button click', async () => {
      const wrapper = mount(HomeWidgetRefreshBtn, {
        global: {
          directives: {
            'gsap-hover': {}
          }
        }
      })

      await wrapper.find('button').trigger('click')
      expect(wrapper.emitted('click')).toHaveLength(1)
    })
  })
})
