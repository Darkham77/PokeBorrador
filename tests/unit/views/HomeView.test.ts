// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomeView from '@/views/game/HomeView.vue'
import { useBreedingStore } from '@/stores/breeding'
import { useLoadingStore } from '@/stores/loading'

describe('HomeView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const breedingStore = useBreedingStore()
    breedingStore.loadDaycare = vi.fn()
    breedingStore.checkDailyReset = vi.fn()
    const loadingStore = useLoadingStore()
    loadingStore.markAppMounted = vi.fn()
  })

  it('mounts and renders the modular essentials (Events, Missions, Breeding, Notifications)', async () => {
    const wrapper = mount(HomeView, {
      global: {
        directives: {
          'gsap-hover': () => {}
        },
        stubs: {
          HomePendingRewardsWidget: { template: '<div class="stub-pending-rewards">PendingRewards</div>' },
          HomeEventsSection: { template: '<div class="stub-events">EventsSection</div>' },
          EventMissions: { template: '<div class="stub-missions">EventMissions</div>' },
          HomeBreedingWidget: { template: '<div class="stub-breeding">BreedingWidget</div>' },
          HomeNotificationsFeed: { template: '<div class="stub-feed">NotificationsFeed</div>' },
          HomeGymsProgress: true,
          HomeFactionWar: true,
          HomeClassMissionsWidget: true,
          HomeActiveBuffsWidget: true,
          HomeEconomyWidget: true,
          HomePassiveDefenseWidget: { template: '<div class="stub-passive-defense">PassiveDefense</div>' },
          HomeRankedWidget: { template: '<div class="stub-ranked">RankedWidget</div>' }
        }
      }
    })

    expect(wrapper.find('#widget-pending-rewards-section').exists()).toBe(true)
    expect(wrapper.find('.stub-pending-rewards').exists()).toBe(true)
    expect(wrapper.find('.stub-events').exists()).toBe(true)
    expect(wrapper.find('.stub-missions').exists()).toBe(true)
    expect(wrapper.find('.stub-breeding').exists()).toBe(true)
    expect(wrapper.find('.stub-feed').exists()).toBe(true)
    expect(wrapper.find('#widget-coliseum-dual-section').exists()).toBe(true)
    expect(wrapper.find('.stub-passive-defense').exists()).toBe(true)
    expect(wrapper.find('.stub-ranked').exists()).toBe(true)
 
    await wrapper.vm.$nextTick()
    wrapper.unmount()
  })
})
