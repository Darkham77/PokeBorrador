// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomeEventsSection from '@/components/home/HomeEventsSection.vue'
import HomePassiveDefenseWidget from '@/components/home/HomePassiveDefenseWidget.vue'
import HomeRankedWidget from '@/components/home/HomeRankedWidget.vue'
import ArenaPassivePanel from '@/components/modals/ArenaPassivePanel.vue'
import { useEventStore } from '@/stores/events'
import { usePvPStore } from '@/stores/pvp'
import { useLivePvPStore } from '@/stores/livePvP'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import type { Event as GameEvent } from '@/logic/events/eventEngine'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('Home Competition Widgets Suite (Events & PvP)', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  describe('HomeEventsSection.vue', () => {
    it('renders active events with clean header and refresh button', async () => {
      const eventStore = useEventStore()
      const mockEvent: GameEvent = {
        id: 'fiebre_oro',
        name: 'Fiebre del Oro',
        description: 'Doble ganancia de monedas en combates.',
        icon: '💰',
        active: true
      }

      eventStore.activeEvents = [mockEvent]

      const wrapper = mount(HomeEventsSection, {
        global: {
          stubs: {
            EventCard: { template: '<div class="stub-event-card">EventCard: Fiebre del Oro</div>' },
            WorldEventsUpcomingSchedule: { template: '<div>Upcoming</div>' },
            PastEventsList: { template: '<div>Past</div>' },
            PVTooltip: { template: '<div><slot /></div>' }
          },
          directives: {
            'gsap-hover': {}
          }
        }
      })

      expect(wrapper.text()).toContain('EVENTOS MUNDIALES')
      expect(wrapper.find('.stub-event-card').exists()).toBe(true)

      const refreshBtn = wrapper.find('#home-events-refresh-btn')
      expect(refreshBtn.exists()).toBe(true)
      expect(refreshBtn.classes()).toContain('btn-refresh-header')
      expect(refreshBtn.find('svg.refresh-icon').exists()).toBe(true)

      const fetchSpy = vi.spyOn(eventStore, 'fetchEvents').mockResolvedValue()
      await refreshBtn.trigger('click')
      expect(fetchSpy).toHaveBeenCalled()
    })

    it('renders empty state when there are no active events or upcoming occurrences', () => {
      const eventStore = useEventStore()
      eventStore.pendingAwards = []
      eventStore.activeEvents = []
      eventStore.allEvents = []

      const wrapper = mount(HomeEventsSection, {
        global: {
          stubs: {
            EventCard: true,
            RewardPillsGroup: true,
            WorldEventsUpcomingSchedule: true,
            PastEventsList: true,
            PVTooltip: { template: '<div><slot /></div>' }
          },
          directives: {
            'gsap-hover': {}
          }
        }
      })

      expect(wrapper.text()).toContain('No hay eventos especiales activos en este momento.')
    })

    it('renders bottom carousel pagination bar and navigates when multiple active events exceed visible slots', async () => {
      const eventStore = useEventStore()
      const mockEvents: GameEvent[] = [
        { id: 'ev-1', name: 'Evento 1', description: 'Desc 1', active: true },
        { id: 'ev-2', name: 'Evento 2', description: 'Desc 2', active: true },
        { id: 'ev-3', name: 'Evento 3', description: 'Desc 3', active: true },
        { id: 'ev-4', name: 'Evento 4', description: 'Desc 4', active: true },
        { id: 'ev-5', name: 'Evento 5', description: 'Desc 5', active: true },
        { id: 'ev-6', name: 'Evento 6', description: 'Desc 6', active: true }
      ]
      eventStore.activeEvents = mockEvents

      const wrapper = mount(HomeEventsSection, {
        global: {
          stubs: {
            EventCard: { template: '<div class="stub-event-card"><slot /></div>' },
            EventPendingAwardsBanner: true,
            WorldEventsUpcomingSchedule: true,
            PastEventsList: true,
            PVTooltip: { template: '<div><slot /></div>' }
          },
          directives: {
            'gsap-hover': {}
          }
        }
      })

      const paginationBar = wrapper.find('.carousel-pagination-bar')
      expect(paginationBar.exists()).toBe(true)

      const dots = wrapper.findAll('.carousel-dot')
      expect(dots.length).toBeGreaterThan(1)
      expect(dots[0]?.classes()).toContain('active')

      expect(dots[1]).toBeDefined()
      await dots[1]!.trigger('click')
      expect(dots[1]?.classes()).toContain('active')

      const prevBtn = paginationBar.find('button[aria-label="Página anterior"]')
      expect(prevBtn.exists()).toBe(true)
      await prevBtn.trigger('click')
      expect(dots[0]?.classes()).toContain('active')

      const nextBtn = paginationBar.find('button[aria-label="Página siguiente"]')
      expect(nextBtn.exists()).toBe(true)
      await nextBtn.trigger('click')
      expect(dots[1]?.classes()).toContain('active')
    })

    it('supports drag and swipe gestures on the active events wrapper', async () => {
      const eventStore = useEventStore()
      eventStore.activeEvents = [
        { id: 'ev-1', name: 'Evento 1', description: 'Desc 1', active: true },
        { id: 'ev-2', name: 'Evento 2', description: 'Desc 2', active: true },
        { id: 'ev-3', name: 'Evento 3', description: 'Desc 3', active: true },
        { id: 'ev-4', name: 'Evento 4', description: 'Desc 4', active: true },
        { id: 'ev-5', name: 'Evento 5', description: 'Desc 5', active: true },
        { id: 'ev-6', name: 'Evento 6', description: 'Desc 6', active: true }
      ]

      const wrapper = mount(HomeEventsSection, {
        global: {
          stubs: {
            EventCard: { template: '<div class="stub-event-card"><slot /></div>' },
            EventPendingAwardsBanner: true,
            WorldEventsUpcomingSchedule: true,
            PastEventsList: true,
            PVTooltip: { template: '<div><slot /></div>' }
          },
          directives: {
            'gsap-hover': {}
          }
        }
      })

      const swipeContainer = wrapper.find('.active-events-wrapper')
      expect(swipeContainer.exists()).toBe(true)

      await swipeContainer.trigger('pointerdown', { clientX: 300, clientY: 100, pointerId: 1, button: 0 })
      await swipeContainer.trigger('pointermove', { clientX: 200, clientY: 100, pointerId: 1 })
      await swipeContainer.trigger('pointerup', { clientX: 200, clientY: 100, pointerId: 1 })

      const dots = wrapper.findAll('.carousel-dot')
      expect(dots[1]?.classes()).toContain('active')

      await swipeContainer.trigger('pointerdown', { clientX: 200, clientY: 100, pointerId: 1, button: 0 })
      await swipeContainer.trigger('pointermove', { clientX: 300, clientY: 100, pointerId: 1 })
      await swipeContainer.trigger('pointerup', { clientX: 300, clientY: 100, pointerId: 1 })

      expect(dots[0]?.classes()).toContain('active')
    })
  })

  describe('HomePassiveDefenseWidget.vue', () => {
    it('renders passive defense header, toggle button, and status', () => {
      const pvpStore = usePvPStore()
      pvpStore.passiveTeamActive = true

      const wrapper = mount(HomePassiveDefenseWidget, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            BoxPokemonCard: true,
            TrainerAvatar: true
          }
        }
      })

      expect(wrapper.text()).toContain('DEFENSA PASIVA')
      expect(wrapper.text()).toContain('Tu equipo actual defenderá tu posición')
      expect(wrapper.text()).toContain('ACTIVADO')
      expect(wrapper.text()).toContain('¡Tu equipo de defensa está protegiendo tu ELO en la Arena!')
    })

    it('toggles passive defense status on button click', async () => {
      const pvpStore = usePvPStore()
      pvpStore.passiveTeamActive = false
      const toggleSpy = vi.fn(() => {
        pvpStore.passiveTeamActive = !pvpStore.passiveTeamActive
        return Promise.resolve()
      })
      pvpStore.togglePassiveTeam = toggleSpy

      const wrapper = mount(HomePassiveDefenseWidget, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            BoxPokemonCard: true,
            TrainerAvatar: true
          }
        }
      })

      expect(wrapper.text()).toContain('DESACTIVADO')
      const toggleBtn = wrapper.find('.toggle-btn')
      expect(toggleBtn.exists()).toBe(true)

      await toggleBtn.trigger('click')
      expect(toggleSpy).toHaveBeenCalled()
    })

    it('renders defending pokemon team and recent defense reports', () => {
      const gameStore = useGameStore()
      const pvpStore = usePvPStore()

      const mockPokemon: Partial<Pokemon> = {
        id: 'pikachu',
        name: 'Pikachu',
        level: 50,
        hp: 100,
        maxHp: 100
      }
      gameStore.state.team = [mockPokemon as Pokemon]

      pvpStore.defenseReports = [
        {
          id: 'rep-1',
          user_id: 'user-1',
          opponent_id: 'rival-1',
          result: 'victory',
          created_at: '2026-04-13T20:01:00Z',
          report_data: {
            opponent: 'Rival Franco',
            playerClass: 'Entrenador',
            turns: 5,
            deltaElo: 15
          }
        }
      ]

      const wrapper = mount(HomePassiveDefenseWidget, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            BoxPokemonCard: true,
            TrainerAvatar: true
          }
        }
      })

      expect(wrapper.find('.defense-team-preview').exists()).toBe(true)
      expect(wrapper.text()).toContain('Rival Franco')
      expect(wrapper.text()).toContain('VICTORIA')
      expect(wrapper.text()).toContain('+15')
    })

    it('opens TeamManagement modal when clicking CAMBIAR EQUIPO button', async () => {
      const uiStore = useUIStore()
      const toggleTeamSpy = vi.fn()
      uiStore.toggleTeamManagement = toggleTeamSpy

      const wrapper = mount(HomePassiveDefenseWidget, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            BoxPokemonCard: true,
            TrainerAvatar: true
          }
        }
      })

      const buttons = wrapper.findAll('.card-action-btn')
      const changeTeamBtn = buttons.find(b => b.text().includes('CAMBIAR EQUIPO'))
      expect(changeTeamBtn?.exists()).toBe(true)
      await changeTeamBtn!.trigger('click')

      expect(toggleTeamSpy).toHaveBeenCalledWith('pvp6')
    })

    it('opens Pokemon detail when clicking a defending pokemon card', async () => {
      const gameStore = useGameStore()
      const uiStore = useUIStore()
      const openDetailSpy = vi.fn()
      uiStore.openPokemonDetail = openDetailSpy

      const mockPokemon: Partial<Pokemon> = {
        id: 'pikachu',
        uid: 'pika-1',
        name: 'Pikachu',
        level: 50,
        hp: 100,
        maxHp: 100
      }
      gameStore.state.team = [mockPokemon as Pokemon]

      const wrapper = mount(HomePassiveDefenseWidget, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            BoxPokemonCard: {
              props: ['pokemon', 'index'],
              template: '<div class="stub-box-card" @click="$emit(\'click\')">{{ pokemon.name }}</div>'
            },
            TrainerAvatar: true
          }
        }
      })

      const card = wrapper.find('.stub-box-card')
      expect(card.exists()).toBe(true)
      await card.trigger('click')
      expect(openDetailSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'Pikachu' }), 0, 'defense')
    })

    it('renders opponent profile name and opens TrainerProfile modal on click', async () => {
      const pvpStore = usePvPStore()
      const uiStore = useUIStore()
      const openSpy = vi.fn()
      uiStore.open = openSpy

      pvpStore.defenseReports = [
        {
          id: 'rep-2',
          user_id: 'user-1',
          opponent_id: 'rival-uuid-123',
          opponent_profile: {
            id: 'rival-uuid-123',
            username: 'RedChampion',
            playerClass: 'Líder de Gimnasio',
            avatar: 'red'
          },
          result: 'defeat',
          created_at: '2026-04-13T20:01:00Z',
          report_data: {
            opponent: 'Rival',
            playerClass: 'Entrenador',
            turns: 3,
            deltaElo: -12
          }
        }
      ]

      const wrapper = mount(HomePassiveDefenseWidget, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            BoxPokemonCard: true,
            TrainerAvatar: {
              props: ['profile', 'playerClass', 'size'],
              template: '<div class="stub-avatar" :data-username="profile?.username" :data-class="playerClass"></div>'
            }
          }
        }
      })

      expect(wrapper.text()).toContain('RedChampion')
      expect(wrapper.text()).toContain('SIN BANDO')
      expect(wrapper.text()).toContain('DERROTA')

      const avatarStub = wrapper.find('.stub-avatar')
      expect(avatarStub.attributes('data-username')).toBe('RedChampion')
      expect(avatarStub.attributes('data-class')).toBe('Líder de Gimnasio')

      const historyRow = wrapper.find('.history-row')
      await historyRow.trigger('click')
      expect(openSpy).toHaveBeenCalledWith('TrainerProfile', { userId: 'rival-uuid-123' })
    })

    it('hides COLISEO button and applies in-modal class when inModal is true', () => {
      const wrapper = mount(HomePassiveDefenseWidget, {
        props: {
          inModal: true
        },
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            BoxPokemonCard: true,
            TrainerAvatar: true
          }
        }
      })

      expect(wrapper.classes()).toContain('in-modal')
      expect(wrapper.classes()).not.toContain('home-section-card')
      expect(wrapper.text()).not.toContain('COLISEO')
    })

    it('renders ArenaPassivePanel as a modular wrapper of HomePassiveDefenseWidget', () => {
      const wrapper = mount(ArenaPassivePanel, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            BoxPokemonCard: true,
            TrainerAvatar: true
          }
        }
      })

      expect(wrapper.findComponent(HomePassiveDefenseWidget).exists()).toBe(true)
      expect(wrapper.find('.home-passive-defense-widget').classes()).toContain('in-modal')
      expect(wrapper.text()).toContain('DEFENSA PASIVA')
    })
  })

  describe('HomeRankedWidget.vue', () => {
    it('renders active tournament summary, rank medal, and stats side-by-side', () => {
      const pvpStore = usePvPStore()
      pvpStore.elo = 1250
      pvpStore.stats = { wins: 15, losses: 10, draws: 0 }

      const wrapper = mount(HomeRankedWidget, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            PokemonTypeTag: true
          }
        }
      })

      expect(wrapper.text()).toContain('ARENA CLASIFICATORIA')
      expect(wrapper.text()).toContain('TORNEO DE TEMPORADA')
      expect(wrapper.text()).toContain('RANGO ACTUAL')
      expect(wrapper.text()).toContain('1250 ELO')
      expect(wrapper.text()).toContain('VICTORIAS')
      expect(wrapper.text()).toContain('15')
      expect(wrapper.text()).toContain('DERROTAS')
      expect(wrapper.text()).toContain('10')
      expect(wrapper.text()).toContain('WIN RATE')
      expect(wrapper.text()).toContain('60.0%')
    })

    it('does NOT contain redundant "Salón de la Fama" button', () => {
      const wrapper = mount(HomeRankedWidget, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            PokemonTypeTag: true
          }
        }
      })

      expect(wrapper.text()).not.toContain('VER SALÓN DE LA FAMA')
      expect(wrapper.text()).not.toContain('SALÓN DE LA FAMA')
    })

    it('renders single primary search button and toggles searching state', async () => {
      const livePvPStore = useLivePvPStore()
      const pvpStore = usePvPStore()
      const gameStore = useGameStore()

      const mockPokemon: Partial<Pokemon> = {
        id: 'pikachu',
        name: 'Pikachu',
        level: 50,
        hp: 100,
        maxHp: 100,
        type: 'electric'
      }
      gameStore.state.team = [mockPokemon as Pokemon]
      gameStore.state.starterChosen = true
      livePvPStore.resolvePvpTeam = vi.fn(() => [mockPokemon as Pokemon])

      pvpStore.currentSeasonRules = {
        name: 'Test Season',
        levelCap: 50,
        maxPokemon: 6,
        startDate: '2026-01-01T00:00:00',
        endDate: '2026-12-31T23:59:59'
      }

      const startSpy = vi.fn()
      livePvPStore.startSearch = startSpy

      const wrapper = mount(HomeRankedWidget, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            PokemonTypeTag: true
          }
        }
      })

      const searchBtn = wrapper.find('.search-btn')
      expect(searchBtn.exists()).toBe(true)
      expect(searchBtn.text()).toContain('BUSCAR PARTIDA RANKED')

      await searchBtn.trigger('click')
      expect(startSpy).toHaveBeenCalled()
    })
  })
})
