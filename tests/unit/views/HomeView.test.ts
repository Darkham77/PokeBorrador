import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomeView from '@/views/game/HomeView.vue'

describe('HomeView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mounts and renders the modular essentials (Events, Missions, Breeding, Notifications)', () => {
    const wrapper = mount(HomeView, {
      global: {
        stubs: {
          HomeEventsSection: { template: '<div class="stub-events">EventsSection</div>' },
          EventMissions: { template: '<div class="stub-missions">EventMissions</div>' },
          HomeBreedingWidget: { template: '<div class="stub-breeding">BreedingWidget</div>' },
          HomeNotificationsFeed: { template: '<div class="stub-feed">NotificationsFeed</div>' }
        }
      }
    })

    expect(wrapper.find('.stub-events').exists()).toBe(true)
    expect(wrapper.find('.stub-missions').exists()).toBe(true)
    expect(wrapper.find('.stub-breeding').exists()).toBe(true)
    expect(wrapper.find('.stub-feed').exists()).toBe(true)
  })
})
