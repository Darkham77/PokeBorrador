import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { gsap } from 'gsap'
import { logger } from '@/logic/utils/logger'
import { useAuthStore } from '@/stores/auth'
import { useLoadingStore } from '@/stores/loading'
import { gameBus } from '@/logic/events/gameBus'

declare const __APP_VERSION__: string

export type UpdateStatus =
  | 'up_to_date'
  | 'checking'
  | 'outdated_client'
  | 'outdated_server'
  | 'db_incompatible'
  | 'updating'
  | 'error'

export type UpdateModalType =
  | 'client_update'
  | 'server_outdated'
  | 'db_outdated'
  | null

export interface UpdateVersionInfo {
  client: string;
  server: string;
  db?: number | string;
}

export interface UpdateExecutionOptions {
  forceNoSave?: boolean;
  targetPath?: string;
}

const PROGRESS_STAGE_START_PERCENT = 10
const PROGRESS_STAGE_LOGOUT_PERCENT = 40
const PROGRESS_STAGE_APPLY_PERCENT = 80
const PROGRESS_COMPLETE_PERCENT = 100

const UPDATE_PROGRESS_STAGES = {
  START: PROGRESS_STAGE_START_PERCENT,
  LOGOUT: PROGRESS_STAGE_LOGOUT_PERCENT,
  APPLY: PROGRESS_STAGE_APPLY_PERCENT,
  COMPLETE: PROGRESS_COMPLETE_PERCENT
} as const

const UPDATE_CHECK_TIMEOUT_SEC = 1.5
const SW_UPDATE_FAILSAFE_TIMEOUT_SEC = 4.0
const PRESERVED_CACHE_REGEXP = /^game-(images|audio|event-banners)-v\d+$/i

export const useUpdateStore = defineStore('update', () => {
  const authStore = useAuthStore()
  const loadingStore = useLoadingStore()

  // State
  const status = ref<UpdateStatus>('up_to_date')
  const modalType = ref<UpdateModalType>(null)
  const versionInfo = ref<UpdateVersionInfo | null>(null)
  const isUpdating = ref(false)
  const progress = ref(0)
  const progressText = ref('')

  // Computed
  const isUpdateAvailable = computed(() => {
    return status.value === 'outdated_client' || status.value === 'updating'
  })

  const isBlocked = computed(() => {
    return modalType.value !== null
  })

  const clientVersion = computed(() => {
    if (typeof __APP_VERSION__ !== 'undefined') {
      return __APP_VERSION__
    }
    return 'v0.5.0'
  })

  // Purge outdated code caches while preserving heavy game media
  const purgeCodeCaches = async (): Promise<void> => {
    if (typeof window === 'undefined' || !('caches' in window)) return
    try {
      const keys = await caches.keys()
      await Promise.all(
        keys.map((key) => {
          if (PRESERVED_CACHE_REGEXP.test(key)) {
            return Promise.resolve(false)
          }
          logger.info('UpdateStore', `Purging outdated cache bucket: ${key}`)
          return caches.delete(key)
        })
      )
    } catch (e) {
      logger.error('UpdateStore', `Error during selective cache purge: ${(e as Error).message}`)
    }
  }

  let isReloading = false
  let failsafeTimer: gsap.core.Tween | null = null

  // Force cache-busting HTTP fetch and redirect strictly to target path (default: 'login')
  const forceCacheBustingReload = async (targetPath = 'login'): Promise<void> => {
    if (typeof window === 'undefined') return
    if (isReloading) return
    isReloading = true

    if (failsafeTimer) {
      failsafeTimer.kill()
      failsafeTimer = null
    }

    const baseUrl = import.meta.env.BASE_URL || '/'
    const cacheBuster = Temporal.Now.instant().epochMilliseconds.toString()
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    const cleanTarget = targetPath.replace(/^\/+/, '')
    const target = `${window.location.origin}${cleanBase}${cleanTarget}?reload_t=${cacheBuster}`

    try {
      const mainUrls = [
        window.location.origin + cleanBase,
        window.location.origin + cleanBase + 'index.html',
        window.location.origin + cleanBase + 'version.json'
      ]

      await Promise.allSettled(
        mainUrls.map((url) =>
          // fallow-ignore-next-line security-sink
          fetch(url, {
            headers: {
              Pragma: 'no-cache',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            cache: 'reload',
            mode: 'no-cors'
          })
        )
      )
    } catch (e) {
      logger.error('UpdateStore', 'Error during HTTP cache reload sequence:', e)
    }

    try {
      // fallow-ignore-next-line security-sink
      window.location.replace(target)
    } catch {
      window.location.reload()
    }
  }

  // Notifications of incompatibility
  function notifyOutdatedClient(info: UpdateVersionInfo) {
    logger.warn('UpdateStore', `Client outdated (${info.client}) vs Server (${info.server}). Locking for clean update.`)
    status.value = 'outdated_client'
    modalType.value = 'client_update'
    versionInfo.value = info
    gameBus.emit('PWA_NEED_REFRESH')
  }

  function notifyOutdatedServer(info: UpdateVersionInfo) {
    logger.warn('UpdateStore', `Server outdated (${info.server}) vs Client (${info.client}).`)
    status.value = 'outdated_server'
    modalType.value = 'server_outdated'
    versionInfo.value = info
  }

  function notifyDbIncompatible(info: UpdateVersionInfo) {
    logger.warn('UpdateStore', `Database incompatible: client db ${info.client} vs server db ${info.db || info.server}.`)
    status.value = 'db_incompatible'
    modalType.value = 'db_outdated'
    versionInfo.value = info
  }

  function notifyServiceWorkerUpdate() {
    if (modalType.value === 'client_update') return
    logger.info('UpdateStore', 'Service Worker update detected.')
    status.value = 'outdated_client'
    modalType.value = 'client_update'
  }

  function notifyChunkLoadError(err?: unknown) {
    logger.warn('UpdateStore', 'Chunk load or module fetch error caught. Requesting refresh.', err)
    status.value = 'outdated_client'
    modalType.value = 'client_update'
    gameBus.emit('PWA_NEED_REFRESH')
  }

  // Clear modal and reset flags
  function resetStatus() {
    isReloading = false
    if (failsafeTimer) {
      failsafeTimer.kill()
      failsafeTimer = null
    }
    status.value = 'up_to_date'
    modalType.value = null
    versionInfo.value = null
    isUpdating.value = false
    progress.value = 0
    progressText.value = ''
    loadingStore.clearAll()
    loadingStore.markAppMounted()
  }

  // Clean exit directly to /login (bypassing loops)
  async function exitToLogin(): Promise<void> {
    logger.info('UpdateStore', 'Executing exit to /login...')
    resetStatus()
    sessionStorage.setItem('block_autologin', 'true')
    try {
      await authStore.logout(true, true)
    } catch (e) {
      logger.warn('UpdateStore', `Logout error on exitToLogin: ${(e as Error).message}`)
    }
    const baseUrl = import.meta.env.BASE_URL || '/'
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    if (typeof window !== 'undefined') {
      window.location.replace(`${window.location.origin}${cleanBase}login`)
    }
  }

  // Retry version check by hard reloading
  function retryCheck(): void {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  // Atomic clean update execution
  async function executeCleanUpdate(options?: UpdateExecutionOptions): Promise<void> {
    if (isUpdating.value) return
    isUpdating.value = true
    status.value = 'updating'
    progress.value = UPDATE_PROGRESS_STAGES.START
    progressText.value = 'Iniciando...'

    const targetDestination = options?.targetPath || 'login'

    // 1. Terminate active Web Workers
    if (typeof window !== 'undefined' && window.__showdownWorker__) {
      try {
        window.__showdownWorker__.terminate()
        window.__showdownWorker__ = undefined
      } catch (e) {
        logger.warn('UpdateStore', 'Error terminating showdown worker:', e)
      }
    }

    // 2. Unconditional safe logout (preventSave = true to avoid corrupting database)
    if (authStore.user) {
      progress.value = UPDATE_PROGRESS_STAGES.LOGOUT
      progressText.value = 'Cerrando sesión de forma segura...'
      try {
        await authStore.logout(true, true)
      } catch (e) {
        logger.error('UpdateStore', `Error during logout on update: ${(e as Error).message}`)
      }
    }

    // Prevent immediate autologin on reload
    sessionStorage.setItem('block_autologin', 'true')

    progress.value = UPDATE_PROGRESS_STAGES.APPLY
    progressText.value = 'Aplicando actualización...'

    // Failsafe: force reload to targetDestination if SW doesn't transition in time
    failsafeTimer = gsap.delayedCall(SW_UPDATE_FAILSAFE_TIMEOUT_SEC, () => {
      logger.warn('UpdateStore', 'SW update exceeded failsafe timeout. Executing forced clean reload to login.')
      void forceCacheBustingReload(targetDestination)
    })

    try {
      // 3. Purge code caches before activating new SW
      await purgeCodeCaches()

      // 4. Service Worker 3-state transition
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          if (registration.waiting) {
            logger.info('UpdateStore', 'Waiting Service Worker detected. Sending SKIP_WAITING...')
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
            logger.info('UpdateStore', 'Installing Service Worker detected. Awaiting installation...')
            await new Promise<void>((resolve) => {
              const worker = registration.installing
              if (worker) {
                worker.addEventListener('statechange', () => {
                  if (worker.state === 'installed') {
                    logger.info('UpdateStore', 'Worker installed. Sending SKIP_WAITING...')
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
            logger.info('UpdateStore', 'No waiting/installing worker. Triggering registration.update()...')
            try {
              await registration.update()
              await new Promise<void>((resolve) => {
                gsap.delayedCall(UPDATE_CHECK_TIMEOUT_SEC, resolve)
              })
              const freshReg = await navigator.serviceWorker.getRegistration()
              const updatedWorker = freshReg?.waiting
              if (updatedWorker) {
                logger.info('UpdateStore', 'New worker ready after update. Activating...')
                updatedWorker.postMessage({ type: 'SKIP_WAITING' })
                await new Promise<void>((resolve) => {
                  const onControllerChange = () => {
                    navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
                    resolve()
                  }
                  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
                })
              } else {
                logger.info('UpdateStore', 'No updated worker appeared. Unregistering existing SW to force clean fetch on reload...')
                await registration.unregister()
              }
            } catch (updateErr) {
              logger.error('UpdateStore', `Error during manual update: ${(updateErr as Error).message}`)
              await registration.unregister()
            }
          }
        }
      }

      if (failsafeTimer) {
        failsafeTimer.kill()
        failsafeTimer = null
      }
      progress.value = UPDATE_PROGRESS_STAGES.COMPLETE
      progressText.value = 'Reiniciando...'
      await forceCacheBustingReload(targetDestination)
    } catch (e) {
      if (failsafeTimer) {
        failsafeTimer.kill()
        failsafeTimer = null
      }
      logger.error('UpdateStore', `Error during forced update execution: ${(e as Error).message}`)
      await forceCacheBustingReload(targetDestination)
    }
  }

  return {
    status,
    modalType,
    versionInfo,
    isUpdating,
    progress,
    progressText,
    isUpdateAvailable,
    isBlocked,
    clientVersion,
    notifyOutdatedClient,
    notifyOutdatedServer,
    notifyDbIncompatible,
    notifyServiceWorkerUpdate,
    notifyChunkLoadError,
    resetStatus,
    exitToLogin,
    retryCheck,
    executeCleanUpdate,
    purgeCodeCaches,
    forceCacheBustingReload
  }
})
