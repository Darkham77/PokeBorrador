import { ref, onMounted, onUnmounted } from 'vue'
import { registerSW } from 'virtual:pwa-register'

export function usePWA() {
  const installEvent = ref<any>(null)
  const canInstall = ref(false)
  const isInstalled = ref(false)

  // Vite PWA auto-update logic (Manual reactivity for better compatibility)
  const needRefresh = ref(false)
  const updateServiceWorker = registerSW({
    onNeedRefresh() {
      needRefresh.value = true
      console.log('SW Update available')
    },
    onOfflineReady() {
      console.log('PWA Offline Ready')
    },
    onRegistered(r: any) {
      console.log('SW Registered:', r)
    },
    onRegisterError(error: any) {
      console.error('SW registration error', error)
    },
  })

  const handleInstallPrompt = (e: any) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault()
    // Stash the event so it can be triggered later.
    installEvent.value = e
    canInstall.value = true
    console.log('PWA Install Prompt captured')
  }

  const checkInstallState = () => {
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.matchMedia('(display-mode: fullscreen)').matches ||
        (window.navigator as any).standalone) {
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
      console.log(`User response to the install prompt: ${outcome}`)
      
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
      console.log('PWA installed successfully')
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
