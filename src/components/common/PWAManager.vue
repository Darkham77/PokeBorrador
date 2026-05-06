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

    <!-- 3. Aviso de Actualización -->
    <BaseModal
      :show="needRefresh"
      title="NUEVA VERSIÓN"
      variant="retro"
      :prevent-close="true"
      :show-close-button="false"
    >
      <div class="pwa-modal-content">
        <p class="pwa-description">
          ¡Hay una nueva actualización disponible! Es necesario actualizar para mantener la compatibilidad con el servidor.
        </p>
        <div class="update-warning">
          Se guardará tu progreso antes de reiniciar.
        </div>
        <button
          class="pv-button-retro"
          @click.stop="handleUpdate"
        >
          ACTUALIZAR AHORA
        </button>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { usePWA } from '@/composables/usePWA'
import { useAuthStore } from '@/stores/auth'
import { useAudioStore } from '@/stores/audio'
import { useGameStore } from '@/stores/game'
import BaseModal from './BaseModal.vue'

const authStore = useAuthStore() as any
const audioStore = useAudioStore() as any
const gameStore = useGameStore() as any
const { canInstall, installApp, needRefresh, updateServiceWorker } = usePWA() as any

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
  localStorage.setItem('pwa_install_dismissed', Date.now().toString())
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

// Observamos el login para pedir permisos si es necesario
watch(() => authStore.user, (val) => {
  if (val) {
    checkPermissions()
  }
}, { immediate: true })

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

// Gestión de Actualizaciones
const handleUpdate = async () => {
  // Intentar guardar el juego antes de recargar
  if (authStore.user && gameStore.save) {
    try {
      await gameStore.save(false)
      console.log('Juego guardado antes de actualizar SW')
    } catch (e) {
      console.error('Error al guardar antes de actualizar:', e)
    }
  }
  
  updateServiceWorker()
}

onMounted(() => {
  // Pequeño delay para no abrumar al cargar
  setTimeout(() => {
    if (canInstall.value && !authStore.user) {
      showInstallModal.value = true
    }
  }, 2000)
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

.update-warning {
  font-size: 11px;
  color: var(--yellow);
  font-style: italic;
  opacity: 0.8;
}

.pv-button-retro {
  @include pixelated;
  background: var(--yellow);
  color: black;
  border: none;
  padding: 12px 24px;
  font-size: 12px;
  cursor: pointer;
  transition: transform 0.2s;
  width: 100%;
  border-radius: 4px;
  box-shadow: 0 4px 0 #b39200;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 0 #b39200;
  }
  
  &:active {
    transform: translateY(2px);
    box-shadow: 0 0 0 #b39200;
  }
}
</style>
