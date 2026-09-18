// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BuffsOverlay from '@/components/overlays/BuffsOverlay.vue'
import EventCard from '@/components/modals/EventCard.vue'
import EventDetailModal from '@/components/modals/EventDetailModal.vue'
import { useBuffsStore } from '@/stores/battle/buffs'
import { useEventStore } from '@/stores/events'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import type { Event as GameEvent } from '@/logic/events/eventEngine'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('System Events UI Components Suite', () => {
  describe('BuffsOverlay.vue & useBuffsStore - Global Event Countdown Badges', () => {
    let pinia: ReturnType<typeof createPinia>

    beforeEach(() => {
      pinia = createPinia()
      setActivePinia(pinia)
    })

    const mockMiningEvent: GameEvent = {
      id: 'evento_mineria',
      name: 'Fiebre Minera',
      icon: '⛏️',
      type: 'boost',
      active: true,
      manual: false,
      description: '¡Mayor eficiencia en excavación y arqueología!',
      start_at: Temporal.Now.instant().subtract({ minutes: 10 }).toString(),
      end_at: Temporal.Now.instant().add({ minutes: 19, seconds: 48 }).toString(),
      config: '{}'
    }

    const globalStubs = {
      PVTooltip: {
        template: '<div class="pv-tooltip-stub" :data-title="title" :data-description="description"><slot /></div>',
        props: ['title', 'description']
      }
    }

    it('includes active global events in activeBuffs with emoji, remaining time, and isEvent flag', () => {
      const eventStore = useEventStore()
      const buffsStore = useBuffsStore()

      eventStore.activeEvents = [mockMiningEvent]

      const eventBuff = buffsStore.activeBuffs.find(b => b.id === 'event_evento_mineria')
      expect(eventBuff).toBeDefined()
      expect(eventBuff?.isEvent).toBe(true)
      expect(eventBuff?.isEmoji).toBe(true)
      expect(eventBuff?.icon).toBe('⛏️')
      expect(eventBuff?.name).toBe('Fiebre Minera')
      expect(eventBuff?.secs).toBeGreaterThan(1100)
      expect(eventBuff?.secs).toBeLessThanOrEqual(1200)
    })

    it('renders emoji and countdown time in BuffsOverlay.vue', () => {
      const eventStore = useEventStore()
      eventStore.activeEvents = [mockMiningEvent]

      const wrapper = mount(BuffsOverlay, {
        global: { stubs: globalStubs }
      })

      const badge = wrapper.find('#buff-badge-event_evento_mineria')
      expect(badge.exists()).toBe(true)
      expect(badge.classes()).toContain('is-event-badge')

      const emojiSpan = badge.find('.buff-emoji')
      expect(emojiSpan.exists()).toBe(true)
      expect(emojiSpan.text()).toBe('⛏️')

      const timeSpan = badge.find('.buff-time')
      expect(timeSpan.exists()).toBe(true)
      expect(timeSpan.text()).toMatch(/19:4\d|19:5\d/)
    })

    it('opens EventDetail modal when clicking an event badge', async () => {
      const eventStore = useEventStore()
      const modalStore = useModalStore()

      eventStore.activeEvents = [mockMiningEvent]

      const wrapper = mount(BuffsOverlay, {
        global: { stubs: globalStubs }
      })

      const badge = wrapper.find('#buff-badge-event_evento_mineria')
      expect(badge.exists()).toBe(true)

      await badge.trigger('click')

      expect(modalStore.isOpen('EventDetail')).toBe(true)
    })

    it('renders multiple badges when multiple global events are active', () => {
      const eventStore = useEventStore()
      const mockFishingEvent: GameEvent = {
        id: 'evento_pesca',
        name: 'Gran Torneo de Pesca',
        icon: '🎣',
        type: 'competition',
        active: true,
        manual: true,
        description: '¡Captura ejemplares récord!',
        config: '{}'
      }

      eventStore.activeEvents = [mockMiningEvent, mockFishingEvent]

      const wrapper = mount(BuffsOverlay, {
        global: { stubs: globalStubs }
      })

      expect(wrapper.find('#buff-badge-event_evento_mineria').exists()).toBe(true)
      expect(wrapper.find('#buff-badge-event_evento_pesca').exists()).toBe(true)
      expect(wrapper.text()).toContain('⛏️')
      expect(wrapper.text()).toContain('🎣')
    })

    it('is visible when activeTab is "map", "home" or "gyms" and hidden in other tabs (e.g. "box", "pokedex", "bag")', async () => {
      const uiStore = useUIStore(pinia)
      const eventStore = useEventStore(pinia)
      eventStore.activeEvents = [mockMiningEvent]

      uiStore.activeTab = 'home'
      const wrapper = mount(BuffsOverlay, {
        global: { plugins: [pinia], stubs: globalStubs }
      })

      expect(wrapper.find('.buffs-overlay').exists()).toBe(true)

      uiStore.activeTab = 'map'
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.buffs-overlay').exists()).toBe(true)

      uiStore.activeTab = 'gyms'
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.buffs-overlay').exists()).toBe(true)

      uiStore.activeTab = 'box'
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.buffs-overlay').exists()).toBe(false)

      uiStore.activeTab = 'pokedex'
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.buffs-overlay').exists()).toBe(false)

      uiStore.activeTab = 'bag'
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.buffs-overlay').exists()).toBe(false)

      uiStore.activeTab = 'home'
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.buffs-overlay').exists()).toBe(true)
    })

    it('renders classMissionBadge when activeMission is present in playerClassStore', async () => {
      const uiStore = useUIStore(pinia)
      const gameStore = useGameStore(pinia)
      uiStore.activeTab = 'gyms'

      const now = Temporal.Now.instant().epochMilliseconds
      gameStore.state.playerClass = 'rocket'
      gameStore.state.classData.activeMission = {
        id: 'mission_6h',
        startedAt: now,
        endsAt: now + 6 * 3600 * 1000
      }

      const wrapper = mount(BuffsOverlay, {
        global: { plugins: [pinia], stubs: globalStubs }
      })

      const badge = wrapper.find('#buff-badge-class-mission')
      expect(badge.exists()).toBe(true)
      expect(wrapper.text()).toContain('🚀')

      // Tooltip should describe basic rules of the deployment, NEVER repeat remaining time
      const tooltipStub = wrapper.find('.pv-tooltip-stub')
      expect(tooltipStub.attributes('data-title')).toContain('Equipo Rocket')
      expect(tooltipStub.attributes('data-description')).toContain('Requiere 1 Pokémon tipo VENENO')
      expect(tooltipStub.attributes('data-description')).not.toContain('restantes')
    })

    it('shows completion prompt in tooltip when activeMission is finished', async () => {
      const uiStore = useUIStore(pinia)
      const gameStore = useGameStore(pinia)
      uiStore.activeTab = 'gyms'

      const now = Temporal.Now.instant().epochMilliseconds
      gameStore.state.playerClass = 'rocket'
      gameStore.state.classData.activeMission = {
        id: 'mission_6h',
        startedAt: now - 7 * 3600 * 1000,
        endsAt: now - 1 * 3600 * 1000
      }

      const wrapper = mount(BuffsOverlay, {
        global: { plugins: [pinia], stubs: globalStubs }
      })

      const tooltipStub = wrapper.find('.pv-tooltip-stub')
      expect(tooltipStub.attributes('data-description')).toBe('¡Operación finalizada! Haz clic para cobrar el botín.')
    })
  })

  describe('EventCard.vue - Participating Pokemon Slot', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    const competitionEvent: GameEvent = {
      id: 'concurso_magikarp',
      name: 'Hora de Pesca del Magikarp',
      icon: '🎣',
      type: 'competition',
      active: true,
      manual: false,
      description: '¡Inscribe a tu mejor Magikarp!',
      schedule: '{}',
      config: JSON.stringify({
        species: 'magikarp',
        metric: 'total_ivs',
        hasCompetition: true,
        subCompetitions: [
          { id: 'ivs', name: 'Genética Superior (IVs)', metric: 'total_ivs', order: 'max' }
        ]
      })
    }

    const globalStubs = {
      PVSpriteFX: {
        template: '<div class="pv-sprite-fx-stub"><slot /></div>'
      }
    }

    it('renders standard category chip with + when no pokemon is registered', () => {
      const wrapper = mount(EventCard, {
        props: { event: competitionEvent },
        global: { stubs: globalStubs }
      })

      const chips = wrapper.findAll('.comp-slot-chip')
      expect(chips.length).toBeGreaterThanOrEqual(1)
      const chip = chips[0]!
      expect(chip.classes()).not.toContain('enrolled')
      expect(chip.find('.chip-status-pill').text()).toBe('+')
    })

    it('renders enrolled category chip with checkmark when entry exists in store', () => {
      const eventStore = useEventStore()
      const gameStore = useGameStore()

      const magikarp = {
        uid: 'pk-magikarp-1',
        id: 'magikarp',
        name: 'Magikarp',
        nickname: 'Big Karp',
        level: 25,
        isShiny: false,
        ivs: { hp: 31, atk: 30, def: 25, spa: 10, spd: 15, spe: 31 }
      } as unknown as Pokemon

      gameStore.state.team = [magikarp]
      eventStore.userEntries[`${competitionEvent.id}:ivs`] = {
        id: 'entry-1',
        event_id: competitionEvent.id,
        category_id: 'ivs',
        player_id: 'player-123',
        player_name: 'Trainer',
        player_email: 'test@example.com',
        pokemon_uid: 'pk-magikarp-1',
        submitted_at: '2026-08-31T00:00:00Z',
        data: {
          species: 'magikarp',
          name: 'Magikarp',
          level: 25,
          total_ivs: 142
        }
      }

      const wrapper = mount(EventCard, {
        props: { event: competitionEvent },
        global: { stubs: globalStubs }
      })

      const chips = wrapper.findAll('.comp-slot-chip')
      expect(chips.length).toBeGreaterThanOrEqual(1)
      const chip = chips[0]!
      expect(chip.classes()).toContain('enrolled')
      expect(chip.find('.chip-status-pill').text()).toBe('✓')
    })

    it('renders size metric chip when event metric is size / weight', () => {
      const sizeEvent: GameEvent = {
        ...competitionEvent,
        id: 'concurso_tamanio',
        config: JSON.stringify({
          species: 'magikarp',
          hasCompetition: true,
          subCompetitions: [
            {
              id: 'weight',
              name: 'Masa y Peso',
              metric: 'weight',
              order: 'max'
            }
          ]
        })
      }

      const eventStore = useEventStore()
      const gameStore = useGameStore()

      const magikarp = {
        uid: 'pk-magikarp-2',
        id: 'magikarp',
        name: 'Magikarp',
        nickname: null,
        level: 15,
        isShiny: true,
        weight: 15.5
      } as unknown as Pokemon

      gameStore.state.team = [magikarp]
      eventStore.userEntries[`${sizeEvent.id}:weight_magikarp`] = {
        id: 'entry-2',
        event_id: sizeEvent.id,
        category_id: 'weight_magikarp',
        player_id: 'player-123',
        player_name: 'Trainer',
        player_email: 'test@example.com',
        pokemon_uid: 'pk-magikarp-2',
        submitted_at: '2026-08-31T00:00:00Z',
        data: {
          species: 'magikarp',
          name: 'Magikarp',
          level: 15,
          weight: 15.5
        }
      }

      const wrapper = mount(EventCard, {
        props: { event: sizeEvent },
        global: { stubs: globalStubs }
      })

      const chips = wrapper.findAll('.comp-slot-chip')
      expect(chips.length).toBeGreaterThanOrEqual(1)
      expect(wrapper.text()).toContain('Peso')
    })

    it('rejects submitting the same pokemon into a second sub-competition of the same event', async () => {
      const multiEvent: GameEvent = {
        ...competitionEvent,
        id: 'concurso_multi',
        config: JSON.stringify({
          species: 'magikarp',
          hasCompetition: true,
          subCompetitions: [
            { id: 'ivs', name: 'IVs', metric: 'total_ivs', order: 'max' },
            { id: 'weight', name: 'Peso', metric: 'weight', order: 'max' }
          ]
        })
      }

      const eventStore = useEventStore()
      const gameStore = useGameStore()
      const authStore = (await import('@/stores/auth')).useAuthStore()
      const uiStore = (await import('@/stores/ui')).useUIStore()

      authStore.user = { id: 'player-123', email: 'test@example.com' } as import('@/types/auth/auth').AuthUser
      gameStore.db = {
        from: () => ({
          upsert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'entry-1' }, error: null })
            })
          })
        })
      } as unknown as typeof gameStore.db

      const magikarp = {
        uid: 'pk-magikarp-shared',
        id: 'magikarp',
        name: 'Magikarp',
        nickname: null,
        level: 20,
        isShiny: false,
        obtainedAt: Temporal.Now.instant().epochMilliseconds,
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        weight: 12.0
      } as unknown as Pokemon

      gameStore.state.team = [magikarp]
      // Already registered in 'ivs'
      eventStore.userEntries[`${multiEvent.id}:ivs`] = {
        id: 'entry-shared',
        event_id: multiEvent.id,
        category_id: 'ivs',
        player_id: 'player-123',
        player_name: 'Trainer',
        player_email: 'test@example.com',
        pokemon_uid: 'pk-magikarp-shared',
        submitted_at: '2026-08-31T00:00:00Z',
        data: {
          species: 'magikarp',
          name: 'Magikarp',
          level: 20
        }
      }

      let notifyMsg = ''
      uiStore.notify = (msg: string) => {
        notifyMsg = msg
      }

      // Try to register the same pokemon in 'weight' category
      await eventStore.submitCompetitionEntry(multiEvent.id, 'weight', 'pk-magikarp-shared')

      expect(notifyMsg).toContain('Este Pokémon ya está participando en otra categoría de este evento')
      expect(eventStore.userEntries[`${multiEvent.id}:weight`]).toBeUndefined()
    })
  })

  describe('EventDetailModal.vue', () => {
    const defaultEvent = {
      id: 'doble_exp',
      name: 'Fin de Semana de Doble EXP',
      icon: '⚡',
      type: 'passive_bonus',
      active: true,
      manual: false,
      description: '¡EXP x2 en todos los combates durante el fin de semana!',
      schedule: '{"type": "weekly", "days": [6, 0], "startHour": 0, "endHour": 23.99}',
      config: '{"expMult": 2}'
    }

    const globalStubs = {
      BaseModal: {
        template: '<div><slot /></div>'
      }
    }

    it('does NOT display sub-competitions if hasCompetition is absent or false', () => {
      const wrapper = mount(EventDetailModal, {
        props: {
          show: true,
          event: defaultEvent as unknown as GameEvent
        },
        global: {
          stubs: globalStubs
        }
      })

      const text = wrapper.text()
      expect(text).not.toContain('SUB-COMPETENCIAS Y PREMIOS')
      expect(text).not.toContain('Mayor cantidad de IVs totales')
    })

    it('displays sub-competitions, criteria and prizes if hasCompetition is true', () => {
      const competitionEvent = {
        ...defaultEvent,
        config: JSON.stringify({
          species: 'magikarp',
          hasCompetition: true,
          subCompetitions: [
            {
              id: 'ivs',
              name: 'Genética Superior (IVs)',
              metric: 'total_ivs',
              order: 'max',
              prizes: {
                first: { type: 'mixed', money: 25000, battleCoins: 150, items: { goldbottlecap: 1, rarecandy: 5 } },
                second: { type: 'mixed', money: 15000, battleCoins: 100, items: { bottlecap: 2, rarecandy: 3 } },
                third: { type: 'mixed', money: 8000, battleCoins: 50, items: { bottlecap: 1, rarecandy: 1 } }
              }
            }
          ]
        })
      }

      const wrapper = mount(EventDetailModal, {
        props: {
          show: true,
          event: competitionEvent as unknown as GameEvent
        },
        global: {
          stubs: globalStubs
        }
      })

      const text = wrapper.text()
      expect(text).toContain('SUB-COMPETENCIAS Y PREMIOS')
      expect(text).toContain('Mayor cantidad de IVs totales (0 a 186)')
      expect(text).toContain('150 BC')
      expect(text).toContain('Chapa Dorada')
      expect(text).toContain('Caramelo Raro')
    })

    it('renders weekly rotation banner, rotation title, and participant sprites for rotating tournaments', () => {
      const rotatingEvent = {
        id: 'torneo_pesca',
        name: 'Torneo de Pesca Acuática',
        icon: '🎣',
        type: 'competition',
        active: true,
        manual: false,
        description: '¡Competencia semanal de pesca!',
        schedule: '{"type": "weekly", "days": [2], "startHour": 18, "endHour": 22}',
        config: JSON.stringify({
          hasCompetition: true,
          requireCaughtDuringEvent: true,
          rotationTheme: 'weekly_4',
          speciesShinyMult: 3.0,
          speciesRateMult: 2.0,
          weeklyRotations: {
            '1': { species: 'magikarp,gyarados', banner: 'hora_magikarp_full', title: 'Torneo Magikarp & Gyarados' },
            '4': { species: 'dratini,dragonair,lapras', banner: 'pesca_mistica_full', title: 'Torneo de Pesca Mística' }
          },
          subCompetitions: [
            {
              id: 'ivs',
              name: 'Genética Superior (IVs)',
              metric: 'total_ivs',
              order: 'max',
              prizes: {
                first: { type: 'mixed', money: 25000, battleCoins: 150, items: { goldbottlecap: 1, rarecandy: 5 } }
              }
            }
          ]
        })
      }

      const week1Occurrence = {
        event: rotatingEvent as unknown as GameEvent,
        startInstant: Temporal.Instant.from('2026-09-01T21:00:00Z'),
        endInstant: Temporal.Instant.from('2026-09-02T01:00:00Z'),
        dateLabel: 'Mañana',
        dayName: 'Martes',
        timeLabel: '18:00 - 22:00 hs',
        startsInLabel: 'En 22h',
        isActiveNow: false
      }

      const wrapper = mount(EventDetailModal, {
        props: {
          show: true,
          event: rotatingEvent as unknown as GameEvent,
          occurrence: week1Occurrence
        },
        global: {
          stubs: globalStubs
        }
      })

      const text = wrapper.text()
      expect(text).toContain('POKÉMON PARTICIPANTES')

      // Verifies banner is present
      const bannerImg = wrapper.find('.event-banner-img')
      expect(bannerImg.exists()).toBe(true)

      // Verifies participant pills are rendered with sprites
      const participantPills = wrapper.findAll('.participant-pill')
      expect(participantPills.length).toBeGreaterThanOrEqual(2)

      const spriteImages = wrapper.findAll('.participant-sprite')
      expect(spriteImages.length).toBeGreaterThanOrEqual(2)
    })

    it('opens PokedexDetail modal when clicking on a participant sprite pill', async () => {
      const { createPinia, setActivePinia } = await import('pinia')
      const { useModalStore } = await import('@/stores/modals')
      setActivePinia(createPinia())
      const modalStore = useModalStore()
      const openSpy = vi.spyOn(modalStore, 'open')

      const rotatingEvent = {
        id: 'torneo_pesca',
        name: 'Torneo de Pesca Acuática',
        icon: '🎣',
        type: 'competition',
        active: true,
        manual: false,
        description: '¡Competencia semanal de pesca!',
        schedule: '{"type": "weekly", "days": [2], "startHour": 18, "endHour": 22}',
        config: JSON.stringify({
          hasCompetition: true,
          species: 'dratini,dragonair,lapras'
        })
      }

      const wrapper = mount(EventDetailModal, {
        props: {
          show: true,
          event: rotatingEvent as unknown as GameEvent
        },
        global: {
          stubs: globalStubs
        }
      })

      const pills = wrapper.findAll('.participant-pill')
      expect(pills.length).toBe(3)

      // Click on the first pill (dratini)
      await pills[0]?.trigger('click')
      expect(openSpy).toHaveBeenCalledWith('PokedexDetail', {
        speciesId: 'dratini',
        context: 'pokedex'
      })

      // Click on the third pill (lapras)
      await pills[2]?.trigger('click')
      expect(openSpy).toHaveBeenCalledWith('PokedexDetail', {
        speciesId: 'lapras',
        context: 'pokedex'
      })
    })

    it('resolves rotation title, banner, and species based on occurrence date', () => {
      const rotatingEvent = {
        id: 'torneo_pesca',
        name: 'Torneo de Pesca Acuática',
        icon: '🎣',
        type: 'competition',
        active: true,
        manual: false,
        description: '¡Competencia semanal de pesca!',
        schedule: '{"type": "weekly", "days": [2], "startHour": 18, "endHour": 22}',
        config: JSON.stringify({
          hasCompetition: true,
          rotationTheme: 'weekly_4',
          weeklyRotations: {
            '1': { species: 'magikarp,gyarados', banner: 'hora_magikarp_full', title: 'Torneo Magikarp & Gyarados' },
            '4': { species: 'dratini,dragonair,lapras', banner: 'pesca_mistica_full', title: 'Torneo de Pesca Mística' }
          }
        })
      }

      // Occurrence on September 1st, 2026 (Week 1 of month)
      const week1Occurrence = {
        event: rotatingEvent as unknown as GameEvent,
        startInstant: Temporal.Instant.from('2026-09-01T21:00:00Z'),
        endInstant: Temporal.Instant.from('2026-09-02T01:00:00Z'),
        dateLabel: 'Mañana',
        dayName: 'Martes',
        timeLabel: '18:00 - 22:00 hs',
        startsInLabel: 'En 22h',
        isActiveNow: false
      }

      const wrapper = mount(EventDetailModal, {
        props: {
          show: true,
          event: rotatingEvent as unknown as GameEvent,
          occurrence: week1Occurrence
        },
        global: {
          stubs: globalStubs
        }
      })

      const text = wrapper.text()
      expect(text).toContain('Torneo Magikarp & Gyarados')
      expect(text).toContain('MAGIKARP')
      expect(text).toContain('GYARADOS')
      expect(text).not.toContain('DRATINI')
    })
  })
})
