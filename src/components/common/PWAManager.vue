<template>
  <div class="pwa-manager-container">
    <!-- 1. Modal de Instalación (Proactivo antes del Login) -->
    <BaseModal
      :show="showInstallModal"
      title="INSTALAR APP"
      variant="retro"
      :show-close-button="true"
      @close="closeInstallModal"
    >
      <div class="pwa-modal-content">
        <div class="pwa-icon-large">
          <img
            src="/assets/fondo/logo 3.webp"
            alt="Poké Vicio Logo"
            @error="e => { (e.target as HTMLImageElement).style.display = 'none' }"
          >
        </div>
        <p class="pwa-description">
          ¡Juega a Poké Vicio en pantalla completa instalando la WebApp oficial!
        </p>
        <button
          class="pv-button-retro"
          @click.stop="handleInstall"
        >
          INSTALAR AHORA
        </button>
      </div>
    </BaseModal>

    <!-- 2. Modal de Permisos (Sonido y Notificaciones) -->
    <BaseModal
      :show="showPermissionsModal"
      title="PERMISOS REQUERIDOS"
      variant="retro"
      :prevent-close="true"
      :show-close-button="false"
    >
      <div class="pwa-modal-content">
        <p class="pwa-description">
          Para una mejor experiencia, activa los sonidos y notificaciones.
        </p>
        <div class="permissions-list">
          <div class="permission-item">
            <span class="p-icon">🔊</span>
            <span class="p-text">Efectos de Sonido 8-bit</span>
          </div>
          <div class="permission-item">
            <span class="p-icon">🔔</span>
            <span class="p-text">Alertas de Eventos</span>
          </div>
        </div>
        <button
          class="pv-button-retro"
          @click.stop="handlePermissions"
        >
          ACEPTAR Y CONTINUAR
        </button>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue'
import { gsap } from 'gsap'
import { usePWA } from '@/composables/usePWA'
import { useAuthStore } from '@/stores/auth'
import { useAudioStore } from '@/stores/audio'
import { useLoadingStore } from '@/stores/loading'
import { logger } from '@/logic/utils/logger'
import { gameBus } from '@/logic/gameBus'
import BaseModal from './BaseModal.vue'

const authStore = useAuthStore()
const audioStore = useAudioStore()
const loadingStore = useLoadingStore()

const { 
  canInstall, 
  installApp
} = usePWA() as { 
  canInstall: Ref<boolean>; 
  installApp: () => Promise<boolean>;
}

const showInstallModal = ref(false)
const showPermissionsModal = ref(false)

// Gestión de Instalación
watch(canInstall, (val) => {
  if (val && !authStore.user) {
    // Si podemos instalar y no está logueado, sugerimos instalación
    const dismissed = localStorage.getItem('pwa_install_dismissed')
    if (!dismissed) {
      showInstallModal.value = true
    }
  }
})

const closeInstallModal = () => {
  showInstallModal.value = false
  localStorage.setItem('pwa_install_dismissed', Temporal.Now.instant().epochMilliseconds.toString())
}

const handleInstall = async () => {
  const success = await installApp()
  if (success) {
    showInstallModal.value = false
  }
}

// Gestión de Permisos
const checkPermissions = () => {
  const hasAcceptedBefore = localStorage.getItem('pwa_permissions_accepted')
  const notificationNeeded = 'Notification' in window && Notification.permission === 'default'
  
  // Si ya aceptó antes y no hay cambios en notificaciones, intentamos activar audio sin modal
  if (hasAcceptedBefore && !notificationNeeded) {
    audioStore.init()
    return
  }
  
  // Si falta algo, mostramos el modal
  showPermissionsModal.value = true
}

// Observamos que el usuario esté logueado y la carga inicial del juego haya terminado antes de solicitar permisos
watch(
  [() => authStore.user, () => loadingStore.isGateOpen],
  ([user, isGateOpen]) => {
    if (user && isGateOpen) {
      checkPermissions()
    }
  },
  { immediate: true }
)

const handlePermissions = async () => {
  // Guardar que el usuario ya aceptó
  localStorage.setItem('pwa_permissions_accepted', 'true')

  // 1. Activar Audio (requiere interacción)
  audioStore.init()
  await audioStore.resume()
  
  // 2. Pedir Notificaciones
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission()
  }
  
  showPermissionsModal.value = false
}

const handleForceUpdate = () => {
  logger.info('PWA', 'Received FORCE_PWA_UPDATE from GameBus. Unregistering SW and reloading to force update...')
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      for (const registration of registrations) {
        await registration.unregister()
      }
      window.location.reload()
    }).catch(() => {
      window.location.reload()
    })
  } else {
    window.location.reload()
  }
}

onMounted(() => {
  gameBus.on('FORCE_PWA_UPDATE', handleForceUpdate)
  // Pequeño delay para no abrumar al cargar
  gsap.delayedCall(2, () => {
    if (canInstall.value && !authStore.user) {
      showInstallModal.value = true
    }
  })
})

onUnmounted(() => {
  gameBus.off('FORCE_PWA_UPDATE', handleForceUpdate)
})
</script>

<style lang="scss" scoped>
.pwa-modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 20px;
  padding: 10px;
}

.pwa-icon-large {
  width: 100px;
  height: 100px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 30px Rgba(0,0,0,0.5);
  border: 2px solid var(--yellow);
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.pwa-description {
  color: white;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}

.permissions-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: Rgba(0,0,0,0.3);
  padding: 15px;
  border-radius: 12px;
  border: 1px solid Rgba(255,255,255,0.05);
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 15px;
  
  .p-icon {
    font-size: 20px;
  }
  
  .p-text {
    font-size: 12px;
    color: Rgba(255,255,255,0.8);
  }
}

.pv-button-retro {
  @include pixelated;
  background: var(--yellow);
  color: black;
  border: none;
  padding: 12px 24px;
  font-size: 12px;
  cursor: pointer;
  
  width: 100%;
  border-radius: 4px;
  box-shadow: 0 4px 0 #b39200;
  
  &:hover {
    transform: Translatey(-2px);
    box-shadow: 0 6px 0 #b39200;
  }
  
  &:active {
    transform: Translatey(2px);
    box-shadow: 0 0 0 #b39200;
  }
}
</style>
