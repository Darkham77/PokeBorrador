import { ref, computed, onMounted, onUnmounted } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import { logger } from '@/logic/utils/logger'
import { gameBus } from '@/logic/events/gameBus'
import { useUpdateStore, type UpdateExecutionOptions } from '@/stores/update'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global Shared Install Prompt State
const installEvent = ref<BeforeInstallPromptEvent | null>(null)
const canInstall = ref(false)
const isInstalled = ref(false)
const localNeedRefresh = ref(false)

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (typeof window !== 'undefined' && window.__E2E__) {
      logger.info('PWA', 'SW Update available but bypassed in E2E session')
      return
    }
    localNeedRefresh.value = true
    logger.info('PWA', 'SW Update available')
    gameBus.emit('PWA_NEED_REFRESH')
  },
  onOfflineReady() {
    logger.info('PWA', 'PWA Offline Ready')
  },
  onRegistered(r: ServiceWorkerRegistration | undefined) {
    logger.debug('PWA', 'SW Registered:', r)
  },
  onRegisterError(error: unknown) {
    logger.error('PWA', `SW registration error: ${(error as Error).message}`)
  },
})

export function usePWA() {
  const updateStore = useUpdateStore()

  const needRefresh = computed({
    get: () => updateStore.isUpdateAvailable || localNeedRefresh.value,
    set: (val: boolean) => { localNeedRefresh.value = val }
  })
  const isUpdating = computed(() => updateStore.isUpdating)
  const progress = computed(() => updateStore.progress)
  const progressText = computed(() => updateStore.progressText)

  const handleInstallPrompt = (e: Event) => {
    const installEv = e as BeforeInstallPromptEvent
    installEv.preventDefault()
    installEvent.value = installEv
    canInstall.value = true
    logger.info('PWA', 'PWA Install Prompt captured')
  }

  const checkInstallState = () => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.matchMedia('(display-mode: fullscreen)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone) {
      isInstalled.value = true
      canInstall.value = false
    }
  }

  const installApp = async () => {
    if (!installEvent.value) return false
    
    const event = installEvent.value
    if (event && typeof event.prompt === 'function') {
      await event.prompt()
      const { outcome } = await event.userChoice
      logger.info('PWA', `User response to the install prompt: ${outcome}`)
      installEvent.value = null
      canInstall.value = false
      return outcome === 'accepted'
    }
    return false
  }

  const handleUpdate = async (options?: UpdateExecutionOptions) => {
    await updateStore.executeCleanUpdate(options)
  }

  const handleNeedRefresh = () => {
    localNeedRefresh.value = true
    updateStore.notifyServiceWorkerUpdate()
  }

  const checkUpdatesOnWakeup = async () => {
    if (typeof window === 'undefined' || !navigator.onLine) return
    if (document.visibilityState === 'visible' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        if (reg) {
          logger.debug('PWA', 'Checking SW updates on app wakeup/focus')
          await reg.update()
        }
      } catch (e) {
        logger.warn('PWA', 'Wakeup update check error:', e)
      }
    }
  }

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', () => {
      isInstalled.value = true
      canInstall.value = false
      installEvent.value = null
      logger.success('PWA', 'PWA installed successfully')
    })
    document.addEventListener('visibilitychange', checkUpdatesOnWakeup)
    window.addEventListener('focus', checkUpdatesOnWakeup)
    gameBus.on('PWA_NEED_REFRESH', handleNeedRefresh)
    checkInstallState()
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
    document.removeEventListener('visibilitychange', checkUpdatesOnWakeup)
    window.removeEventListener('focus', checkUpdatesOnWakeup)
    gameBus.off('PWA_NEED_REFRESH', handleNeedRefresh)
  })

  return {
    canInstall,
    isInstalled,
    installApp,
    needRefresh,
    isUpdating,
    progress,
    progressText,
    handleUpdate,
    updateServiceWorker
  }
}
