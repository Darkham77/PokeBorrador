import { defineStore } from 'pinia'
import { ref } from 'vue'
import { gsap } from 'gsap'
import { NOTIFICATION_DISMISS_DELAY_SEC } from '@/logic/constants/animations.ts'
import { MAX_NOTIFICATION_HISTORY_ITEMS } from '@/logic/constants/gameplay.ts'

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
        if (gameStore.state.notificationHistory.length > MAX_NOTIFICATION_HISTORY_ITEMS) {
          gameStore.state.notificationHistory.shift()
        }
        gameStore.scheduleSave()
      }
    }).catch((err: unknown) => {
      throw new Error(`[notify] Failed to persist notification to history: ${String(err)}`)
    })

    gsap.delayedCall(NOTIFICATION_DISMISS_DELAY_SEC, () => {
      notifications.value = notifications.value.filter(n => n.id !== id)
    })
  }

  return {
    notifications,
    notify
  }
})
