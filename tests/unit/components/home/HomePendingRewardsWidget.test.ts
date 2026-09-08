// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomePendingRewardsWidget from '@/components/home/HomePendingRewardsWidget.vue'
import { useEventStore } from '@/stores/events'
import { usePvPStore } from '@/stores/pvp'

describe('HomePendingRewardsWidget.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

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

    // Legacy unclaimable award (event not in allEvents)
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
    eventStore.allEvents = [] // Not registered -> unclaimable legacy award

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

    // Widget MUST stay visible until discarded/empty
    expect(wrapper.find('#widget-pending-rewards').exists()).toBe(true)
    expect(wrapper.text()).toContain('RECOMPENSAS PENDIENTES (1)')
    expect(wrapper.find('#claim-pending-reward-btn-event-legacy-award-1').exists()).toBe(false)
    expect(wrapper.find('#discard-pending-reward-btn-event-legacy-award-1').exists()).toBe(true)

    wrapper.unmount()
  })
})
