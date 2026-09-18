import { defineStore } from 'pinia'
import { ref } from 'vue'
import { gsap } from 'gsap'
import { gameBus } from '@/logic/events/gameBus'
import { NOTIFICATION_DISMISS_DELAY_SEC } from '@/logic/constants/animations.ts'

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

    // Emit to event bus for history persistence without circular dependency
    const cleanMsg = msg.replace(/<[^>]*>/g, '').trim()
    const isWelcomeMsg = cleanMsg.toLowerCase().includes('bienvenido')
    const isSaveMsg = cleanMsg.toLowerCase().includes('guardad') || cleanMsg.toLowerCase().includes('guardar')
    
    if (!isWelcomeMsg && !isSaveMsg) {
      gameBus.emit('NOTIFICATION_RECORDED', {
        id,
        type: 'general',
        title: icon || '🔔',
        message: cleanMsg,
        timestamp: Temporal.Now.instant().epochMilliseconds,
        read: false,
        meta: { icon }
      })
    }

    const isE2E = typeof window !== 'undefined' && Boolean(window.__E2E__);
    const dismissDelay = isE2E ? NOTIFICATION_DISMISS_DELAY_SEC * 100 : NOTIFICATION_DISMISS_DELAY_SEC;
    gsap.delayedCall(dismissDelay, () => {
      notifications.value = notifications.value.filter(n => n.id !== id)
    })
  }

  return {
    notifications,
    notify
  }
})
