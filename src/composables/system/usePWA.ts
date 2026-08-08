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

const PROGRESS_STAGE_START_PERCENT = 10;
const PROGRESS_STAGE_LOGOUT_PERCENT = 40;
const PROGRESS_STAGE_APPLY_PERCENT = 80;

const UPDATE_PROGRESS_STAGES = {
  START: PROGRESS_STAGE_START_PERCENT,
  LOGOUT: PROGRESS_STAGE_LOGOUT_PERCENT,
  APPLY: PROGRESS_STAGE_APPLY_PERCENT
} as const;
const UPDATE_CHECK_TIMEOUT_MS = 1000;
const PROGRESS_COMPLETE_PERCENT = 100;
const progressText = ref('')

const updateServiceWorker = registerSW({
  onNeedRefresh() {
    if (typeof window !== 'undefined' && window.__E2E__) {
      logger.info('PWA', 'SW Update available but bypassed in E2E session');
      return;
    }
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
    progress.value = UPDATE_PROGRESS_STAGES.START
    progressText.value = 'Iniciando...'

    // If the game is loaded and ready, we trigger a safe logout to clean session state before reload.
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

    const forceCacheBustingReload = async () => {
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
        
        // Force refresh browser HTTP cache for the main documents/assets
        for (const url of mainUrls) {
          try {
            // fallow-ignore-next-line security-sink
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
        const baseUrl = import.meta.env.BASE_URL || '/'
        const cacheBuster = Temporal.Now.instant().epochMilliseconds.toString()
        const target = `${window.location.origin}${baseUrl}?t=${cacheBuster}`
        // fallow-ignore-next-line security-sink
        window.location.replace(target)
      } catch {
        window.location.reload()
      }
    }

const SW_UPDATE_FAILSAFE_TIMEOUT_SEC = 3.5;

    // Fail-safe: force physical reload if SW doesn't reload the page in 3.5 seconds
    gsap.delayedCall(SW_UPDATE_FAILSAFE_TIMEOUT_SEC, () => {
      logger.warn('PWA', 'La actualización automática del SW excedió el tiempo límite. Forzando recarga.')
      forceCacheBustingReload()
    })

    try {
      // --- STEP 1: Clear app-shell caches (NOT game data caches) ---
      // We clear the cache first so the reload is guaranteed to fetch fresh files.
      if ('caches' in window) {
        const keys = await caches.keys()
        for (const key of keys) {
          // Preserve game data caches (images/audio), only wipe app-shell
          if (!key.startsWith('game-images') && !key.startsWith('game-audio')) {
            await caches.delete(key)
          }
        }
      }

      // --- STEP 2: Activate the waiting SW via SKIP_WAITING so it takes control ---
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          if (registration.waiting) {
            logger.info('PWA', 'Encontrado Service Worker esperando. Activando...')
            registration.waiting.postMessage({ type: 'SKIP_WAITING' })
            await new Promise<void>((resolve) => {
              const onControllerChange = () => {
                navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
                resolve()
              }
              navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
            })
          } else if (registration.installing) {
            logger.info('PWA', 'Service Worker se está instalando. Esperando instalación...')
            await new Promise<void>((resolve) => {
              const worker = registration.installing
              if (worker) {
                worker.addEventListener('statechange', () => {
                  if (worker.state === 'installed') {
                    logger.info('PWA', 'Service Worker instalado. Enviando SKIP_WAITING...')
                    worker.postMessage({ type: 'SKIP_WAITING' })
                    resolve()
                  }
                })
              } else {
                resolve()
              }
            })
            await new Promise<void>((resolve) => {
              const onControllerChange = () => {
                navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
                resolve()
              }
              navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
            })
          } else {
            logger.info('PWA', 'No hay Service Worker en espera ni instalándose. Buscando actualización...')
            try {
              await registration.update()
              // Esperar un momento a ver si se detecta/instala
              await new Promise((r) => setTimeout(r, UPDATE_CHECK_TIMEOUT_MS))
              const waitingWorker = registration.waiting
              if (waitingWorker) {
                logger.info('PWA', 'Nuevo Service Worker encontrado y listo tras update. Activando...')
                const postMsg = Reflect.get(waitingWorker, 'postMessage') as ((msg: unknown) => void) | undefined // domain-ok
                postMsg?.({ type: 'SKIP_WAITING' })
                await new Promise<void>((resolve) => {
                  const onControllerChange = () => {
                    navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
                    resolve()
                  }
                  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
                })
              } else {
                logger.info('PWA', 'No se detectó nuevo SW tras update. Desregistrando SW actual para forzar recarga limpia...')
                await registration.unregister()
              }
            } catch (updateErr) {
              logger.error('PWA', `Error al intentar forzar update: ${(updateErr as Error).message}`)
              await registration.unregister()
            }
          }
        }
      }

      progress.value = PROGRESS_COMPLETE_PERCENT
      progressText.value = 'Reiniciando...'
      await forceCacheBustingReload()
    } catch (e) {
      logger.error('PWA', `Error al actualizar Service Worker: ${(e as Error).message}`)
      await forceCacheBustingReload()
    }
  }

  const handleNeedRefresh = () => {
    if (typeof window !== 'undefined' && window.__E2E__) return;
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
