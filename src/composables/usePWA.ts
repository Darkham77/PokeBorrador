import { ref, onMounted, onUnmounted } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import { logger } from '@/logic/utils/logger'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWA() {
  const installEvent = ref<BeforeInstallPromptEvent | null>(null)
  const canInstall = ref(false)
  const isInstalled = ref(false)

  // Vite PWA auto-update logic (Manual reactivity for better compatibility)
  const needRefresh = ref(false)
  const updateServiceWorker = registerSW({
    onNeedRefresh() {
      needRefresh.value = true
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

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', () => {
      isInstalled.value = true
      canInstall.value = false
      installEvent.value = null
      logger.success('PWA', 'PWA installed successfully')
    })
    checkInstallState()
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
  })

  return {
    canInstall,
    isInstalled,
    installApp,
    needRefresh,
    updateServiceWorker
  }
}
