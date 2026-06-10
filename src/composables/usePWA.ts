import { ref, onMounted, onUnmounted } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import { logger } from '@/logic/utils/logger'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { gsap } from 'gsap'
import { gameBus } from '@/logic/gameBus'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global Shared State
const installEvent = ref<BeforeInstallPromptEvent | null>(null)
const canInstall = ref(false)
const isInstalled = ref(false)
const needRefresh = ref(false)
const isUpdating = ref(false)
const isOutdatedClient = ref(false)
const progress = ref(0)
const progressText = ref('')

const updateServiceWorker = registerSW({
  onNeedRefresh() {
    needRefresh.value = true
    isOutdatedClient.value = false // SW background asset update is safe to proceed
    logger.info('PWA', 'SW Update available')
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
  const authStore = useAuthStore()
  const gameStore = useGameStore()

  const handleInstallPrompt = (e: Event) => {
    const installEv = e as BeforeInstallPromptEvent
    // Prevent the mini-infobar from appearing on mobile
    installEv.preventDefault()
    // Stash the event so it can be triggered later.
    installEvent.value = installEv
    canInstall.value = true
    logger.info('PWA', 'PWA Install Prompt captured')
  }

  const checkInstallState = () => {
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.matchMedia('(display-mode: fullscreen)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone) {
      isInstalled.value = true
      canInstall.value = false
    }
  }

  const installApp = async () => {
    if (!installEvent.value) return false
    
    // Show the install prompt
    const event = installEvent.value;
    if (event && typeof event.prompt === 'function') {
      event.prompt()
      
      // Wait for the user to respond to the prompt
      const { outcome } = await event.userChoice
      logger.info('PWA', `User response to the install prompt: ${outcome}`)
      
      // We've used the prompt, and can't use it again, throw it away
      installEvent.value = null
      canInstall.value = false
      
      return outcome === 'accepted'
    }
    return false
  }

  const handleUpdate = async (options?: { forceNoSave?: boolean }) => {
    if (isUpdating.value) return
    isUpdating.value = true
    progress.value = 10
    progressText.value = 'Iniciando...'

    // If the game is loaded and ready, we trigger a safe logout to clean session state before reload.
    if (authStore.user && gameStore.isReady && !options?.forceNoSave) {
      progress.value = 40
      progressText.value = 'Cerrando sesión de forma segura...'
      try {
        if (authStore.logout) {
          await authStore.logout()
          return // logout handles page reload
        }
      } catch (e) {
        logger.error('PWA', `Error during logout on update: ${(e as Error).message}`)
      }
    }

    progress.value = 80
    progressText.value = 'Aplicando actualización...'
    
    const forceCacheBustingReload = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL || '/'
        const mainUrls = [
          window.location.origin + baseUrl,
          window.location.origin + baseUrl + 'index.html',
          window.location.href
        ]
        
        // Force refresh browser HTTP cache for the main documents/assets
        for (const url of mainUrls) {
          try {
            await fetch(url, {
              headers: { 
                'Pragma': 'no-cache', 
                'Cache-Control': 'no-cache' 
              },
              cache: 'reload',
              mode: 'no-cors'
            })
          } catch (e) {
            logger.warn('PWA', `Could not force-refresh HTTP cache for ${url}:`, e)
          }
        }
      } catch (e) {
        logger.error('PWA', 'Error during HTTP cache reload sequence:', e)
      }

      try {
        const url = new URL(window.location.href)
        url.searchParams.set('t', Temporal.Now.instant().epochMilliseconds.toString())
        const target = `${url.pathname}${url.search}${url.hash}`
        // fallow-ignore-next-line security-sink
        window.location.replace(target)
      } catch {
        window.location.reload()
      }
    }

    // Fail-safe: force physical reload if SW doesn't reload the page in 3.5 seconds
    gsap.delayedCall(3.5, () => {
      logger.warn('PWA', 'La actualización automática del SW excedió el tiempo límite. Forzando recarga.')
      forceCacheBustingReload()
    })

    try {
      // Unregister Service Workers to bypass caching
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          await registration.unregister()
        }
      }
      // Clear all cache storages
      if ('caches' in window) {
        const keys = await caches.keys()
        for (const key of keys) {
          await caches.delete(key)
        }
      }
      progress.value = 100
      progressText.value = 'Reiniciando...'
      await forceCacheBustingReload()
    } catch (e) {
      logger.error('PWA', `Error al actualizar Service Worker: ${(e as Error).message}`)
      await forceCacheBustingReload()
    }
  }

  const handleNeedRefresh = () => {
    isOutdatedClient.value = true
    needRefresh.value = true
  }

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', () => {
      isInstalled.value = true
      canInstall.value = false
      installEvent.value = null
      logger.success('PWA', 'PWA installed successfully')
    })
    gameBus.on('PWA_NEED_REFRESH', handleNeedRefresh)
    checkInstallState()
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
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
