<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useStorage } from '@vueuse/core'
import { useAuthStore } from '@/stores/auth'
import { useAudioStore } from '@/stores/audio'
import { useLoadingStore } from '@/stores/loading'
import { logger } from '@/logic/utils/logger'
import { usePWA } from '@/composables/system/usePWA'
import { gameBus } from '@/logic/events/gameBus'
import BaseModal from './BaseModal.vue'

const authStore = useAuthStore()
const audioStore = useAudioStore()
const loadingStore = useLoadingStore()
const { handleUpdate } = usePWA()

const showPermissionsModal = ref(false)
const hasAcceptedPermissions = useStorage('pwa_permissions_accepted', false)

// Gestión de Permisos
const checkPermissions = () => {
  const notificationNeeded = 'Notification' in window && Notification.permission === 'default'
  
  // Si ya aceptó antes y no hay cambios en notificaciones, intentamos activar audio sin modal
  if (hasAcceptedPermissions.value && !notificationNeeded) {
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
  hasAcceptedPermissions.value = true

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
  logger.info('PWA', 'Received FORCE_PWA_UPDATE from GameBus. Delegating to atomic handleUpdate...')
  handleUpdate({ forceNoSave: true })
}

onMounted(() => {
  gameBus.on('FORCE_PWA_UPDATE', handleForceUpdate)
})

onUnmounted(() => {
  gameBus.off('FORCE_PWA_UPDATE', handleForceUpdate)
})
</script>

<template>
  <div class="pwa-manager-container">
    <!-- 1. Modal de Permisos (Sonido y Notificaciones) -->
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
            <span class="emoji p-icon">🔊</span>
            <span class="p-text">Efectos de Sonido 8-bit</span>
          </div>
          <div class="permission-item">
            <span class="emoji p-icon">🔔</span>
            <span class="p-text">Alertas de Eventos</span>
          </div>
        </div>
        <button
          id="pwamanager-btn-aceptar-y-continuar"
          class="pv-button-retro"
          @click.stop="handlePermissions"
        >
          ACEPTAR Y CONTINUAR
        </button>
      </div>
    </BaseModal>
  </div>
</template>

<style lang="scss" scoped>
.pwa-modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-xl;
  padding: 10px;
  text-align: center;
}

.pwa-description {
  margin: 0;
  color: var(--white);
  font-size: var(--font-14);
  line-height: 1.5;
}

.permissions-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  width: 100%;
  padding: 15px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: $radius-xl;
  background: Rgb(0 0 0 / 30%);
}

.permission-item {
  display: flex;
  align-items: center;
  gap: $spacing-md-15;
  
  .p-icon {
    font-size: var(--font-20);
  }
  
  .p-text {
    color: Rgb(255 255 255 / 80%);
    font-size: var(--font-12);
  }
}

.pv-button-retro {
  @include pixelated;
  
  width: 100%;
  padding: 12px 24px;
  border: none;
  border-radius: $radius-sm;
  background: var(--yellow);
  color: var(--black);
  font-size: var(--font-12);
  cursor: pointer;
  box-shadow: $shadow-retro-yellow;
  
  &:hover {
    transform: Translatey(-2px);
    box-shadow: $shadow-retro-yellow-hover;
  }
  
  &:active {
    transform: Translatey(2px);
    box-shadow: $shadow-retro-yellow-active;
  }
}
</style>
