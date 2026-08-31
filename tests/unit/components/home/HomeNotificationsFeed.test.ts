import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomeNotificationsFeed from '@/components/home/HomeNotificationsFeed.vue'
import { useGameStore } from '@/stores/game'

describe('HomeNotificationsFeed.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

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
