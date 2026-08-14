import { ref, onMounted, onUnmounted } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import { logger } from '@/logic/utils/logger'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { gsap } from 'gsap'
import { gameBus } from '@/logic/events/gameBus'

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

const PROGRESS_STAGE_START_PERCENT = 10;
const PROGRESS_STAGE_LOGOUT_PERCENT = 40;
const PROGRESS_STAGE_APPLY_PERCENT = 80;
const PROGRESS_COMPLETE_PERCENT = 100;

const UPDATE_PROGRESS_STAGES = {
  START: PROGRESS_STAGE_START_PERCENT,
  LOGOUT: PROGRESS_STAGE_LOGOUT_PERCENT,
  APPLY: PROGRESS_STAGE_APPLY_PERCENT
} as const;

const UPDATE_CHECK_TIMEOUT_SEC = 1.5;
const SW_UPDATE_FAILSAFE_TIMEOUT_SEC = 4.0;
const PRESERVED_CACHE_REGEXP = /^game-(images|audio)-v\d+$/i;

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (typeof window !== 'undefined' && window.__E2E__) {
      logger.info('PWA', 'SW Update available but bypassed in E2E session');
      return;
    }
    needRefresh.value = true
    isOutdatedClient.value = false
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
    
    const event = installEvent.value;
    if (event && typeof event.prompt === 'function') {
      event.prompt()
      const { outcome } = await event.userChoice
      logger.info('PWA', `User response to the install prompt: ${outcome}`)
      installEvent.value = null
      canInstall.value = false
      return outcome === 'accepted'
    }
    return false
  }

  const purgeCodeCaches = async (): Promise<void> => {
    if (typeof window === 'undefined' || !('caches' in window)) return
    try {
      const keys = await caches.keys()
      await Promise.all(
        keys.map((key) => {
          if (PRESERVED_CACHE_REGEXP.test(key)) {
            return Promise.resolve(false)
          }
          logger.info('PWA', `Purging outdated cache bucket: ${key}`)
          return caches.delete(key)
        })
      )
    } catch (e) {
      logger.error('PWA', `Error during selective cache purge: ${(e as Error).message}`)
    }
  }

  const forceCacheBustingReload = async () => {
    if (typeof window === 'undefined') return
    try {
      const baseUrl = import.meta.env.BASE_URL || '/'
      const cacheBuster = Temporal.Now.instant().epochMilliseconds.toString()
      const mainUrls = [
        window.location.origin + baseUrl,
        window.location.origin + baseUrl + 'index.html',
        window.location.origin + baseUrl + 'version.json',
        window.location.origin + baseUrl + '?t=' + cacheBuster,
        window.location.origin + baseUrl + 'index.html?t=' + cacheBuster,
        window.location.origin + baseUrl + 'version.json?t=' + cacheBuster
      ]
      
      for (const url of mainUrls) {
        try {
          // fallow-ignore-next-line security-sink
          await fetch(url, {
            headers: { 
              'Pragma': 'no-cache', 
              'Cache-Control': 'no-cache, no-store, must-revalidate' 
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
      const baseUrl = import.meta.env.BASE_URL || '/'
      const cacheBuster = Temporal.Now.instant().epochMilliseconds.toString()
      const target = `${window.location.origin}${baseUrl}?reload_t=${cacheBuster}`
      // fallow-ignore-next-line security-sink
      window.location.replace(target)
    } catch {
      window.location.reload()
    }
  }

  const handleUpdate = async (options?: { forceNoSave?: boolean }) => {
    if (isUpdating.value) return
    isUpdating.value = true
    progress.value = UPDATE_PROGRESS_STAGES.START
    progressText.value = 'Iniciando...'

    // 1. Terminate active Web Workers to avoid memory leaks or old execution logic
    if (typeof window !== 'undefined' && window.__showdownWorker__) {
      try {
        window.__showdownWorker__.terminate()
        window.__showdownWorker__ = undefined
      } catch (e) {
        logger.warn('PWA', 'Error terminating showdown worker:', e)
      }
    }

    // 2. Safe logout if game session is active
    if (authStore.user && gameStore.isReady && !options?.forceNoSave) {
      progress.value = UPDATE_PROGRESS_STAGES.LOGOUT
      progressText.value = 'Cerrando sesión de forma segura...'
      try {
        if (authStore.logout) {
          await authStore.logout(true)
        }
      } catch (e) {
        logger.error('PWA', `Error during logout on update: ${(e as Error).message}`)
      }
    }

    progress.value = UPDATE_PROGRESS_STAGES.APPLY
    progressText.value = 'Aplicando actualización...'

    // Fail-safe: force reload if SW doesn't transition in time
    gsap.delayedCall(SW_UPDATE_FAILSAFE_TIMEOUT_SEC, () => {
      logger.warn('PWA', 'SW update exceeded failsafe timeout. Executing forced clean reload.')
      forceCacheBustingReload()
    })

    try {
      // 3. Purge code caches before activating new SW
      await purgeCodeCaches()

      // 4. Service Worker 3-state transition
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          if (registration.waiting) {
            logger.info('PWA', 'Waiting Service Worker detected. Sending SKIP_WAITING...')
            const controllerPromise = new Promise<void>((resolve) => {
              const onControllerChange = () => {
                navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
                resolve()
              }
              navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
            })
            registration.waiting.postMessage({ type: 'SKIP_WAITING' })
            await Promise.race([
              controllerPromise,
              new Promise<void>((resolve) => {
                gsap.delayedCall(UPDATE_CHECK_TIMEOUT_SEC, resolve)
              })
            ])
          } else if (registration.installing) {
            logger.info('PWA', 'Installing Service Worker detected. Awaiting installation...')
            await new Promise<void>((resolve) => {
              const worker = registration.installing
              if (worker) {
                worker.addEventListener('statechange', () => {
                  if (worker.state === 'installed') {
                    logger.info('PWA', 'Worker installed. Sending SKIP_WAITING...')
                    worker.postMessage({ type: 'SKIP_WAITING' })
                    resolve()
                  }
                })
              } else {
                resolve()
              }
            })
            const controllerPromise = new Promise<void>((resolve) => {
              const onControllerChange = () => {
                navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
                resolve()
              }
              navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
            })
            await Promise.race([
              controllerPromise,
              new Promise<void>((resolve) => {
                gsap.delayedCall(UPDATE_CHECK_TIMEOUT_SEC, resolve)
              })
            ])
          } else {
            logger.info('PWA', 'No waiting/installing worker. Triggering registration.update()...')
            try {
              await registration.update()
              await new Promise<void>((resolve) => {
                gsap.delayedCall(UPDATE_CHECK_TIMEOUT_SEC, resolve)
              })
              const freshReg = await navigator.serviceWorker.getRegistration()
              const updatedWorker = freshReg?.waiting
              if (updatedWorker) {
                logger.info('PWA', 'New worker ready after update. Activating...')
                updatedWorker.postMessage({ type: 'SKIP_WAITING' })
                await new Promise<void>((resolve) => {
                  const onControllerChange = () => {
                    navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
                    resolve()
                  }
                  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
                })
              } else {
                logger.info('PWA', 'No updated worker appeared. Unregistering existing SW to force clean fetch on reload...')
                await registration.unregister()
              }
            } catch (updateErr) {
              logger.error('PWA', `Error during manual update: ${(updateErr as Error).message}`)
              await registration.unregister()
            }
          }
        }
      }

      progress.value = PROGRESS_COMPLETE_PERCENT
      progressText.value = 'Reiniciando...'
      await forceCacheBustingReload()
    } catch (e) {
      logger.error('PWA', `Error during forced update execution: ${(e as Error).message}`)
      await forceCacheBustingReload()
    }
  }

  const handleNeedRefresh = () => {
    if (typeof window !== 'undefined' && window.__E2E__) return;
    isOutdatedClient.value = true
    needRefresh.value = true
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
