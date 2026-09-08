// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import {
  useHomeWidgetBadges,
  registerWidgetBadge,
  unregisterWidgetBadge
} from '@/composables/home/useHomeWidgetBadges'

const mockTotalClaimableRewards = ref(0)
const mockTotalActionableMissions = ref(0)
const mockIsClassMissionReadyToDeploy = ref(false)
const mockUnifiedRewards = ref<unknown[]>([])

vi.mock('@/composables/rewards/useUnifiedRewards', () => ({
  useUnifiedRewards: () => ({
    totalClaimableRewards: mockTotalClaimableRewards,
    totalActionableMissions: mockTotalActionableMissions,
    isClassMissionReadyToDeploy: mockIsClassMissionReadyToDeploy,
    unifiedRewards: mockUnifiedRewards
  })
}))

const mockGameState = {
  eggs: [] as Array<{ ready?: boolean; steps: number }>,
  defeatedGyms: [] as string[],
  notificationHistory: [] as unknown[]
}

vi.mock('@/stores/game', () => ({
  useGameStore: () => ({
    state: mockGameState
  })
}))

const mockActiveBuffs = ref<unknown[]>([])
vi.mock('@/stores/battle/buffs', () => ({
  useBuffsStore: () => ({
    activeBuffs: mockActiveBuffs.value
  })
}))

const mockActiveEvents = ref<unknown[]>([])
vi.mock('@/stores/events', () => ({
  useEventStore: () => ({
    activeEvents: mockActiveEvents.value
  })
}))

const mockUnseenSales = ref(0)
vi.mock('@/stores/gts', () => ({
  useGTSStore: () => ({
    unseenSalesCount: mockUnseenSales.value
  })
}))

const mockPassiveTeamActive = ref(false)
vi.mock('@/stores/pvp', () => ({
  usePvPStore: () => ({
    passiveTeamActive: mockPassiveTeamActive.value,
    seasonRange: {}
  })
}))

vi.mock('@/stores/gyms', () => ({
  useGymsStore: () => ({
    gyms: [
      { id: 'pewter' }, { id: 'cerulean' }, { id: 'vermilion' }, { id: 'celadon' },
      { id: 'fuchsia' }, { id: 'saffron' }, { id: 'cinnabar' }, { id: 'viridian' }
    ]
  })
}))

const mockPlayerClass = ref<string | null>(null)
const mockClassLevel = ref(1)
vi.mock('@/stores/player/playerClass', () => ({
  usePlayerClassStore: () => ({
    playerClass: mockPlayerClass.value,
    classLevel: mockClassLevel.value
  })
}))

const mockIsDisputeActive = ref(false)
vi.mock('@/stores/war', () => ({
  useWarStore: () => ({
    isDisputeActive: mockIsDisputeActive.value
  })
}))

describe('useHomeWidgetBadges', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTotalClaimableRewards.value = 0
    mockTotalActionableMissions.value = 0
    mockIsClassMissionReadyToDeploy.value = false
    mockUnifiedRewards.value = []
    mockGameState.eggs = []
    mockGameState.defeatedGyms = []
    mockGameState.notificationHistory = []
    mockActiveBuffs.value = []
    mockActiveEvents.value = []
    mockUnseenSales.value = 0
    mockPassiveTeamActive.value = false
    mockPlayerClass.value = null
    mockClassLevel.value = 1
    mockIsDisputeActive.value = false
  })

  it('calculates buffs badge based on active buffs count', () => {
    const { getWidgetBadge } = useHomeWidgetBadges()
    expect(getWidgetBadge('buffs')).toBeUndefined()

    mockActiveBuffs.value = [{ id: 'shiny_charm' }, { id: 'exp_share' }]
    const { getWidgetBadge: updatedBadge } = useHomeWidgetBadges()
    expect(updatedBadge('buffs')).toBe(2)
  })

  it('calculates breeding badge based on ready eggs', () => {
    mockGameState.eggs = [
      { ready: false, steps: 500 },
      { ready: true, steps: 0 },
      { ready: false, steps: 0 } // steps <= 0 means ready
    ]
    const { getWidgetBadge, readyEggsCount } = useHomeWidgetBadges()
    expect(readyEggsCount.value).toBe(2)
    expect(getWidgetBadge('breeding')).toBe(2)
  })

  it('calculates missions badge combining actionable daily missions and class deploy', () => {
    mockTotalActionableMissions.value = 2
    mockIsClassMissionReadyToDeploy.value = true

    const { getWidgetBadge } = useHomeWidgetBadges()
    expect(getWidgetBadge('missions')).toBe(3)
  })

  it('calculates gyms badge showing available undefeated gyms to combat', () => {
    // 3 defeated gyms out of 8 -> 5 gyms available to combat
    mockGameState.defeatedGyms = ['pewter', 'cerulean', 'vermilion']
    const { getWidgetBadge } = useHomeWidgetBadges()
    expect(getWidgetBadge('gyms')).toBe(5)

    // All 8 defeated -> 0 available (undefined badge)
    mockGameState.defeatedGyms = [
      'pewter', 'cerulean', 'vermilion', 'celadon',
      'fuchsia', 'saffron', 'cinnabar', 'viridian'
    ]
    const { getWidgetBadge: getUpdatedBadge } = useHomeWidgetBadges()
    expect(getUpdatedBadge('gyms')).toBeUndefined()
  })

  it('calculates defense badge showing ACTIVA or INACTIVA', () => {
    mockPassiveTeamActive.value = false
    const { getWidgetBadge } = useHomeWidgetBadges()
    expect(getWidgetBadge('defense')).toBe('INACTIVA')

    mockPassiveTeamActive.value = true
    const { getWidgetBadge: getActiveBadge } = useHomeWidgetBadges()
    expect(getActiveBadge('defense')).toBe('ACTIVA')
  })

  it('calculates ranked badge showing active tournament count of 1', () => {
    const { getWidgetBadge } = useHomeWidgetBadges()
    expect(getWidgetBadge('ranked')).toBe(1)
  })

  it('allows registering and unregistering custom badge providers', () => {
    const { getWidgetBadge } = useHomeWidgetBadges()
    registerWidgetBadge('notifications', () => '99+')
    expect(getWidgetBadge('notifications')).toBe('99+')

    unregisterWidgetBadge('notifications')
    expect(getWidgetBadge('notifications')).toBeUndefined()
  })
})
