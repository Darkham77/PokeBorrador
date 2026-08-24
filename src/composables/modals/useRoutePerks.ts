/**
 * src/composables/modals/useRoutePerks.ts
 * 
 * Manages Route perks (Rocket extortion and Entrenador official route buffs, timers, and actions).
 */

import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'
import { gsap } from 'gsap'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'
import type { MapLocation } from '@/types/pokemon/encounters'
import { isMapExtortable, getExtortionConfirmMessage, getOfficialRouteConfirmMessage } from '@/logic/map/mapCardHelper'
import { BUFF_DURATION_30_MIN_MS, DURATION_24_HOURS_MS, ONE_HOUR_MS, ONE_MINUTE_MS } from '@/logic/constants/items'

export interface UseRoutePerksParams {
  map: Ref<MapLocation>
}

export function useRoutePerks(params: UseRoutePerksParams) {
  const { map } = params
  const modalStore = useModalStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()

  const playerClass = computed(() => gameStore.state.playerClass)

  const isOfficialRouteActive = computed(() => {
    if (playerClass.value !== 'entrenador') return false
    if (!isMapExtortable(map.value)) return false
    const classData = gameStore.state.classData || {}
    if (classData.officialRouteId !== map.value.id) return false
    const now = Temporal.Now.instant().epochMilliseconds
    const timestamp = Number(classData.officialRouteTimestamp || 0)
    return (now - timestamp) <= BUFF_DURATION_30_MIN_MS
  })

  const isExtortedRouteActive = computed(() => {
    if (playerClass.value !== 'rocket') return false
    if (!isMapExtortable(map.value)) return false
    const classData = gameStore.state.classData || {}
    if (classData.extortedRouteId !== map.value.id) return false
    const now = Temporal.Now.instant().epochMilliseconds
    const timestamp = Number(classData.extortedRouteTimestamp || 0)
    return (now - timestamp) <= DURATION_24_HOURS_MS
  })

  const activeExtortedRouteId = computed(() => {
    if (playerClass.value !== 'rocket') return null
    const classData = gameStore.state.classData || {}
    if (!classData.extortedRouteId) return null
    const now = Temporal.Now.instant().epochMilliseconds
    const timestamp = Number(classData.extortedRouteTimestamp || 0)
    if ((now - timestamp) > DURATION_24_HOURS_MS) return null
    return classData.extortedRouteId
  })

  const isOfficialRouteOnCooldown = computed(() => {
    if (playerClass.value !== 'entrenador') return false
    const classData = gameStore.state.classData || {}
    const timestamp = Number(classData.officialRouteTimestamp || 0)
    if (!timestamp) return false
    const now = Temporal.Now.instant().epochMilliseconds
    return (now - timestamp) <= DURATION_24_HOURS_MS
  })

  const cooldownRemainingText = computed(() => {
    if (!isOfficialRouteOnCooldown.value) return ''
    const classData = gameStore.state.classData || {}
    const timestamp = Number(classData.officialRouteTimestamp || 0)
    const now = Temporal.Now.instant().epochMilliseconds
    const diff = DURATION_24_HOURS_MS - (now - timestamp)
    if (diff <= 0) return ''
    const hours = Math.floor(diff / ONE_HOUR_MS)
    const mins = Math.floor((diff % ONE_HOUR_MS) / ONE_MINUTE_MS)
    return `${hours}h ${mins}m`
  })

  const timeRemainingText = ref('')
  let timerTween: gsap.core.Tween | null = null

  const tickTime = () => {
    const classData = gameStore.state.classData || {}
    const now = Temporal.Now.instant().epochMilliseconds
    let expired = false

    if (playerClass.value === 'rocket' && classData.extortedRouteId === map.value.id) {
      const timestamp = Number(classData.extortedRouteTimestamp || 0)
      const diff = (24 * 3600 * 1000) - (now - timestamp)
      if (diff > 0) {
        const hours = Math.floor(diff / (3600 * 1000))
        const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000))
        const secs = Math.floor((diff % (60 * 1000)) / 1000)
        timeRemainingText.value = `${hours}h ${mins}m ${secs}s`
      } else {
        timeRemainingText.value = ''
        expired = true
      }
    } else if (playerClass.value === 'entrenador' && classData.officialRouteId === map.value.id) {
      const timestamp = Number(classData.officialRouteTimestamp || 0)
      const diff = (30 * 60 * 1000) - (now - timestamp)
      if (diff > 0) {
        const mins = Math.floor(diff / (60 * 1000))
        const secs = Math.floor((diff % (60 * 1000)) / 1000)
        timeRemainingText.value = `${mins}m ${secs}s`
      } else {
        timeRemainingText.value = ''
        expired = true
      }
    } else {
      timeRemainingText.value = ''
    }

    if (expired) {
      gameStore.checkRouteExpirations()
    }

    timerTween = gsap.delayedCall(1, tickTime)
  }

  onMounted(() => {
    gameStore.checkRouteExpirations()
    tickTime()
  })

  onUnmounted(() => {
    if (timerTween) {
      timerTween.kill()
    }
  })

  const toggleExtortion = () => {
    if (modalStore.isOpen('Confirm')) return
    const id = map.value.id
    const now = Temporal.Now.instant().epochMilliseconds

    modalStore.open('Confirm', {
      title: '🏴‍☠️ RUTA DE EXTORSISÓN',
      message: getExtortionConfirmMessage(map.value.name),
      confirmText: 'EXTORSIONAR',
      cancelText: 'CANCELAR',
      variant: 'retro',
      onConfirm: async () => {
        if (!gameStore.state.classData) {
          gameStore.state.classData = {
            captureStreak: 0,
            longestStreak: 0,
            reputation: 0,
            blackMarketSales: 0,
            criminality: 0,
            blackMarketDaily: { date: '', items: [], purchased: [] }
          }
        }
        gameStore.state.classData.extortedRouteId = id
        gameStore.state.classData.extortedRouteTimestamp = String(now)
        uiStore.notify(`¡Has tomado control y extorsionado la ${map.value.name}!`, '💰')
        await gameStore.save(false)
        tickTime()
      }
    })
  }

  const toggleOfficialRoute = () => {
    if (modalStore.isOpen('Confirm')) return
    const id = map.value.id
    const now = Temporal.Now.instant().epochMilliseconds

    modalStore.open('Confirm', {
      title: '📍 RUTA OFICIAL',
      message: getOfficialRouteConfirmMessage(map.value.name),
      confirmText: 'ESTABLECER',
      cancelText: 'CANCELAR',
      variant: 'retro',
      onConfirm: async () => {
        if (!gameStore.state.classData) {
          gameStore.state.classData = {
            captureStreak: 0,
            longestStreak: 0,
            reputation: 0,
            blackMarketSales: 0,
            criminality: 0,
            blackMarketDaily: { date: '', items: [], purchased: [] }
          }
        }
        gameStore.state.classData.officialRouteId = id
        gameStore.state.classData.officialRouteTimestamp = String(now)
        uiStore.notify(`¡Estableciste la ${map.value.name} como tu Ruta Oficial!`, '📍')
        await gameStore.save(false)
        tickTime()
      }
    })
  }

  return {
    playerClass,
    isOfficialRouteActive,
    isExtortedRouteActive,
    activeExtortedRouteId,
    isOfficialRouteOnCooldown,
    cooldownRemainingText,
    timeRemainingText,
    toggleExtortion,
    toggleOfficialRoute
  }
}
