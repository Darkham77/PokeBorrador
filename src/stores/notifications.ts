import { defineStore } from 'pinia'
import { ref } from 'vue'
import { gsap } from 'gsap'

export interface UINotification {
  id: string | number;
  msg: string;
  icon: string;
}

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<UINotification[]>([])

  function notify(msg: string, icon: string = '🔔') {
    const id = Temporal.Now.instant().epochMilliseconds + Math.random().toString(36).substr(2, 9)
    notifications.value.push({ id, msg, icon })

    // Save to game store history for persistence and display in profile
    import('@/stores/game').then(m => {
      const gameStore = m.useGameStore()
      if (gameStore && gameStore.state) {
        if (!gameStore.state.notificationHistory) {
          gameStore.state.notificationHistory = []
        }
        const cleanMsg = msg.replace(/<[^>]*>/g, '').trim()
        gameStore.state.notificationHistory.push({
          id,
          type: 'general',
          title: icon || '🔔',
          message: cleanMsg,
          timestamp: Temporal.Now.instant().epochMilliseconds,
          read: false,
          meta: { icon }
        })
        if (gameStore.state.notificationHistory.length > 10) {
          gameStore.state.notificationHistory.shift()
        }
        gameStore.scheduleSave()
      }
    }).catch((err: unknown) => {
      throw new Error(`[notify] Failed to persist notification to history: ${String(err)}`)
    })

    gsap.delayedCall(4.0, () => {
      notifications.value = notifications.value.filter(n => n.id !== id)
    })
  }

  return {
    notifications,
    notify
  }
})
