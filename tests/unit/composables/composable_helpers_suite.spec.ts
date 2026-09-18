import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, computed } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useAdventureEvents } from '@/composables/adventure/useAdventureEvents'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle/battle'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { useShopStore } from '@/stores/inventory/shop'
import { useMapStore } from '@/stores/map'
import { handleRewardsReset } from '@/composables/battle/useBattleArenaCoordinator'
import { useEventDetailBonuses, type ExtendedEventConfig } from '@/composables/events/useEventDetailBonuses'
import type { Event as GameEvent } from '@/logic/events/eventEngine'
import { useMoveTooltip } from '@/composables/battle/useMoveTooltip'
import { BATTLE_STATES } from '@/logic/battle/battleStateMachine'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import { useWeatherVisuals } from '@/composables/effects/useWeatherVisuals'
import {
  getCategoryIcon,
  formatDate,
  parseSchedule,
  formatEventScheduleWindow,
  resolveCategoryDisplayName,
} from '@/composables/events/pastEventFormatHelpers'
import type { PastEventHistoryItem } from '@/types/system/stores'
import type { SubCompetitionConfig } from '@/logic/events/eventEngine'

describe('Composable Helpers Domain Suite', () => {
  describe('useAdventureEvents', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    function createMockConfig() {
      return {
        isTraveling: ref(false),
        isPaused: ref(false),
        currentSegmentIndex: ref(0),
        calculatedPath: ref([] as any[]),
        currentMapId: ref('route1' as any),
        originMap: ref('pallet' as any),
        activeHMs: ref(new Set<string>()),
        travelLog: ref<string[]>([]),
        injectedItems: ref(new Set<any>()),
        activeTravelModifiers: ref({ encounterRateMod: 1, expMultiplier: 1, moneyMultiplier: 1, shinyChanceMod: 1, typeFocus: null }),
        activeSweetScent: ref(false),
        startMinigame: vi.fn(),
        triggerExtraLoot: vi.fn(),
        resumeTravelAfterEvent: vi.fn(),
        cancelTravel: vi.fn(),
        hasHealthyTeam: ref(true),
        mapLocationsById: ref({
          pallet: { id: 'pallet', name: 'Pueblo Paleta', lv: [3, 5] },
          route1: { id: 'route1', name: 'Ruta 1', lv: [3, 5] }
        } as any),
        getSpawnPoolForMap: vi.fn().mockReturnValue({ generic: ['pidgey'], specific: ['rattata'], rates: {} }),
        getTravelTween: vi.fn().mockReturnValue(null),
        getMarkerTimeline: vi.fn().mockReturnValue(null),
        gameStore: useGameStore(),
        battleStore: useBattleStore(),
        inventoryStore: useInventoryStore(),
        shopStore: useShopStore(),
        mapStore: useMapStore(),
      }
    }

    it('triggers explore event and sets activeEvent', async () => {
      const config = createMockConfig()
      const { activeEvent, triggerExplore } = useAdventureEvents(config)

      await triggerExplore()
      expect(activeEvent.value).not.toBeNull()
      expect(activeEvent.value?.type).toBe('combat')
      expect(config.travelLog.value.length).toBeGreaterThan(0)
    })

    it('handles obstacle_cut resolution with inventory rewards', () => {
      const config = createMockConfig()
      config.activeHMs.value.add('cut')
      const { activeEvent, resolveEvent } = useAdventureEvents(config)

      activeEvent.value = {
        type: 'obstacle_cut',
        title: 'Arbusto Espeso',
        desc: 'Cortar',
        moRequired: 'cut',
        resolved: false,
      }

      resolveEvent()
      expect(config.injectedItems.value.has('berrybronze')).toBe(true)
      expect(config.triggerExtraLoot).toHaveBeenCalled()
    })

    it('handles missing MO and skips event', () => {
      const config = createMockConfig()
      const { activeEvent, resolveEvent } = useAdventureEvents(config)

      activeEvent.value = {
        type: 'obstacle_cut',
        title: 'Arbusto Espeso',
        desc: 'Cortar',
        moRequired: 'cut',
        resolved: false,
      }

      resolveEvent()
      expect(config.travelLog.value.some(log => log.includes('Ignorando obstáculo'))).toBe(true)
    })
  })

  describe('useBattleArenaCoordinator', () => {
    describe('handleRewardsReset', () => {
      it('resets state when entering REWARDS_PHASE with EMPTY_WAIT', () => {
        const resetAll = vi.fn()
        const battleStore = {
          attackerSide: 'player',
          activeMove: 'tackle',
          enemyStages: { atk: 1, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }
        } as any

        handleRewardsReset('REWARDS_PHASE', 'EMPTY_WAIT', resetAll, battleStore)

        expect(resetAll).toHaveBeenCalledTimes(1)
        expect(battleStore.attackerSide).toBeNull()
        expect(battleStore.activeMove).toBeNull()
        expect(battleStore.enemyStages.atk).toBe(0)
      })

      it('does nothing when not in REWARDS_PHASE EMPTY_WAIT', () => {
        const resetAll = vi.fn()
        const battleStore = {
          attackerSide: 'player',
          activeMove: 'tackle',
          enemyStages: { atk: 1 }
        } as any

        handleRewardsReset('TURN_START', undefined, resetAll, battleStore)

        expect(resetAll).not.toHaveBeenCalled()
        expect(battleStore.attackerSide).toBe('player')
      })
    })
  })

  describe('useEventDetailBonuses', () => {
    const dummyZdt = computed(() => Temporal.Now.zonedDateTimeISO('America/Argentina/Buenos_Aires'))

    it('aggregates core multipliers and minigame buffs into activeBonuses', () => {
      const event: GameEvent = {
        id: 'test_event',
        name: 'Festival Test',
        description: 'Festival description',
        active: true,
        type: 'competition',
        start_at: '2026-09-01T00:00:00Z',
        end_at: '2026-09-02T23:59:59Z'
      }

      const cfg = ref<ExtendedEventConfig>({
        expMult: 2,
        moneyMult: 1.5,
        speciesShinyMult: 3,
        minigameBuffs: {
          fishing: { encounterRateMult: 2 }
        },
        requireCaughtDuringEvent: true
      })

      const species = computed(() => 'pikachu')
      const { activeBonuses } = useEventDetailBonuses(event, cfg, dummyZdt, species)

      const labels = activeBonuses.value.map(b => b.label)
      expect(labels.some(l => l.includes('EXP'))).toBe(true)
      expect(labels.some(l => l.includes('Dinero'))).toBe(true)
      expect(labels.some(l => l.includes('PIKACHU'))).toBe(true)
      expect(labels.some(l => l.includes('Pesca'))).toBe(true)
      expect(labels.some(l => l.includes('Solo se aceptan'))).toBe(true)
    })

    it('formats scheduleText for weekly and manual events', () => {
      const manualEvent: GameEvent = {
        id: 'manual_event',
        name: 'Manual Event',
        description: 'Manual event description',
        active: true,
        type: 'boost',
        manual: true
      }
      const cfg = ref<ExtendedEventConfig>({})
      const species = computed(() => null)
      const { scheduleText } = useEventDetailBonuses(manualEvent, cfg, dummyZdt, species)

      expect(scheduleText.value).toBe('🟢 Evento activo ahora mismo')
    })
  })

  describe('useMoveTooltip', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('returns empty details when move is null', () => {
      const move = ref<Move | null>(null)
      const { activeDetails, moveDescriptionText, modifierInfo } = useMoveTooltip(move as unknown as Move)

      expect(activeDetails.value).toBeNull()
      expect(moveDescriptionText.value).toBe('')
      expect(modifierInfo.value).toBeNull()
    })

    it('computes basic details for a damaging move', () => {
      const battleStore = useBattleStore()
      battleStore.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE)
      battleStore.state = {
        player: {
          id: 'p1',
          speciesId: 'pikachu',
          name: 'Pikachu',
          level: 50,
          types: ['electric'],
          stats: { hp: 100, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 }
        } as unknown as Pokemon,
        isGym: false
      } as any

      const move = ref<Move>({
        id: 'thunderbolt',
        name: 'Rayo',
        type: 'electric',
        power: 90,
        acc: 100,
        cat: 'special',
        pp: 15,
        maxPP: 15,
        desc: 'Un potente rayo descarga sobre el rival.'
      })

      const { activeDetails, moveDescriptionText } = useMoveTooltip(move)

      expect(activeDetails.value).not.toBeNull()
      expect(activeDetails.value?.power.final).not.toBe('-')
      expect(moveDescriptionText.value).toBeTruthy()
    })

    it('handles Choice item lock modifier properly', () => {
      const battleStore = useBattleStore()
      battleStore.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE)
      battleStore.state = {
        player: {
          id: 'p1',
          speciesId: 'pikachu',
          name: 'Pikachu',
          level: 50,
          atk: 55,
          def: 40,
          spa: 50,
          spd: 50,
          spe: 90,
          hp: 100,
          maxHp: 100,
          types: ['electric'],
          heldItem: 'choiceband',
          choiceMove: 'quickattack',
        } as unknown as Pokemon,
        isGym: false,
      } as any

      const move = ref<Move>({ id: 'thunderbolt', name: 'Rayo', type: 'electric', power: 90, acc: 100, cat: 'special', pp: 15, maxPP: 15 })
      const { modifierInfo } = useMoveTooltip(move)

      expect(modifierInfo.value?.type).toBe('penalized')
      expect(modifierInfo.value?.text).toContain('Bloqueado por')
    })
  })

  describe('useWeatherVisuals', () => {
    it('calculates clear day filter correctly', () => {
      const weather = ref('clear')
      const cycle = ref('day')
      const { atmosphereFilter, weatherOnlyFilter } = useWeatherVisuals({ weather, cycle })

      expect(atmosphereFilter.value).toBe('brightness(1) contrast(1) saturate(1) hue-rotate(0deg)')
      expect(weatherOnlyFilter.value).toBe('brightness(1) contrast(1) saturate(1) hue-rotate(0deg)')
    })

    it('calculates night filter differently with weatherOnly', () => {
      const weather = ref('clear')
      const cycle = ref('night')
      const { atmosphereFilter, weatherOnlyFilter } = useWeatherVisuals({ weather, cycle })

      expect(atmosphereFilter.value).toContain('brightness(')
      expect(atmosphereFilter.value).not.toBe(weatherOnlyFilter.value)
      expect(weatherOnlyFilter.value).toBe('brightness(1) contrast(1) saturate(1) hue-rotate(0deg)')
    })

    it('calculates rain and heavy_rain filters correctly', () => {
      const weather = ref('rain')
      const cycle = ref('day')
      const { atmosphereFilter: rainFilter } = useWeatherVisuals({ weather, cycle })

      const rainAtmosphere = rainFilter.value
      weather.value = 'heavy_rain'
      const heavyRainAtmosphere = rainFilter.value

      expect(rainAtmosphere).not.toBe(heavyRainAtmosphere)
    })

    it('handles static terrain presets via O(1) matching', () => {
      const weather = ref('electricterrain')
      const cycle = ref('day')
      const { atmosphereFilter } = useWeatherVisuals({ weather, cycle })

      expect(atmosphereFilter.value).toContain('hue-rotate(')
    })

    it('handles storm and thunderstorm with dusk factor', () => {
      const weather = ref('thunderstorm')
      const cycle = ref('dusk')
      const { atmosphereFilter } = useWeatherVisuals({ weather, cycle })

      expect(atmosphereFilter.value).toContain('contrast(')
    })
  })

  describe('pastEventFormatHelpers', () => {
    describe('getCategoryIcon', () => {
      it('returns appropriate icon for each category prefix', () => {
        expect(getCategoryIcon('ivs_total')).toBe('🧬')
        expect(getCategoryIcon('weight_heavy')).toBe('⚖️')
        expect(getCategoryIcon('height_tall')).toBe('📏')
        expect(getCategoryIcon('level_max')).toBe('📈')
        expect(getCategoryIcon('friendship_max')).toBe('💖')
        expect(getCategoryIcon('unknown_category')).toBe('🏆')
      })
    })

    describe('formatDate', () => {
      it('returns empty string for undefined or empty input', () => {
        expect(formatDate(undefined)).toBe('')
        expect(formatDate('')).toBe('')
      })

      it('formats a valid ISO timestamp to Buenos Aires timezone', () => {
        const formatted = formatDate('2026-06-15T15:30:00Z')
        expect(formatted).toContain('/2026')
        expect(formatted).toContain('hs')
      })

      it('returns original string if parsing fails', () => {
        expect(formatDate('invalid-date')).toBe('invalid-date')
      })
    })

    describe('parseSchedule', () => {
      it('returns null for empty input or invalid JSON', () => {
        expect(parseSchedule(undefined)).toBeNull()
        expect(parseSchedule('{invalid')).toBeNull()
      })

      it('parses valid JSON string or returns raw object', () => {
        const obj = { startHour: 10, endHour: 18 }
        expect(parseSchedule(JSON.stringify(obj))).toEqual(obj)
        expect(parseSchedule(obj)).toEqual(obj)
      })
    })

    describe('formatEventScheduleWindow', () => {
      it('formats absolute same-day event window correctly', () => {
        const item = {
          event_id: 'ev1',
          start_at: '2026-06-15T10:00:00-03:00',
          end_at: '2026-06-15T18:00:00-03:00',
          winners: []
        } as unknown as PastEventHistoryItem

        const result = formatEventScheduleWindow(item)
        expect(result).toBe('15/06/2026 · De 10:00 a 18:00 hs')
      })

      it('formats absolute multi-day event window correctly', () => {
        const item = {
          event_id: 'ev2',
          start_at: '2026-06-15T10:00:00-03:00',
          end_at: '2026-06-17T18:00:00-03:00',
          winners: []
        } as unknown as PastEventHistoryItem

        const result = formatEventScheduleWindow(item)
        expect(result).toBe('Del 15/06/2026 10:00 hs al 17/06/2026 18:00 hs')
      })

      it('formats schedule object with hours', () => {
        const item = {
          event_id: 'ev3',
          ended_at: '2026-06-15T18:00:00-03:00',
          event_schedule: { startHour: 14, endHour: 20 },
          winners: []
        } as unknown as PastEventHistoryItem

        const result = formatEventScheduleWindow(item)
        expect(result).toBe('15/06/2026 · De 14:00 a 20:00 hs')
      })

      it('formats all-day schedule window', () => {
        const item = {
          event_id: 'ev4',
          ended_at: '2026-06-15T18:00:00-03:00',
          event_schedule: { startHour: 0, endHour: 24 },
          winners: []
        } as unknown as PastEventHistoryItem

        const result = formatEventScheduleWindow(item)
        expect(result).toBe('15/06/2026 · De 00:00 a 23:59 hs')
      })
    })

    describe('resolveCategoryDisplayName', () => {
      const subComps: SubCompetitionConfig[] = [
        { id: 'cat_custom', name: 'Custom Comp', metric: 'weight', order: 'auto' }
      ]

      it('returns rawName when it is simple and descriptive', () => {
        expect(resolveCategoryDisplayName('ev1', 'cat1', 'Nombre Claro', subComps)).toBe('Nombre Claro')
      })

      it('resolves sub-competition name if matching subComp exists', () => {
        expect(resolveCategoryDisplayName('ev1', 'cat_custom', 'Genética/Titán', subComps)).toBe('Menor Peso')
      })

      it('resolves weight and height defaults', () => {
        expect(resolveCategoryDisplayName('ev1', 'weight_heavy', undefined, [])).toBe('Menor Peso')
        expect(resolveCategoryDisplayName('ev1', 'height_tall', undefined, [])).toBe('Mayor Altura')
      })

      it('resolves level and friendship defaults', () => {
        expect(resolveCategoryDisplayName('ev1', 'level', undefined, [])).toBe('Mayor Nivel')
        expect(resolveCategoryDisplayName('ev1', 'friendship', undefined, [])).toBe('Mayor Amistad')
      })

      it('defaults to Mayor IVs for unhandled categories', () => {
        expect(resolveCategoryDisplayName('ev1', 'unknown_cat', undefined, [])).toBe('Mayor IVs')
      })
    })
  })
})
