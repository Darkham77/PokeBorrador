<script setup lang="ts">
// fallow-ignore-file security-sink
declare const __APP_VERSION__: string

import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useAuthStore } from '@/stores/auth'
import { usePWA } from '@/composables/usePWA'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { logger } from '@/logic/utils/logger'
import { OFFICIAL_SERVERS, DEFAULT_SERVER } from '@/data/official_servers'
import { switchServer } from '@/logic/supabase'
import { safeStorage } from '@/logic/utils/storage'
import { getFriendlyErrorMessage } from '@/logic/utils/friendlyErrors'

import AuthServerSelector from '@/components/auth/AuthServerSelector.vue'
import AuthOnlineLogin from '@/components/auth/AuthOnlineLogin.vue'
import AuthOnlineSignup from '@/components/auth/AuthOnlineSignup.vue'
import AuthLocalLogin from '@/components/auth/AuthLocalLogin.vue'

const wallpaperUrl = computed(() => `url('${getAssetUrl(ASSET_TYPES.UI, '../fondo/WALLPAPER')}')`)

const authStore = useAuthStore()

const authTab = ref('login') // 'login' | 'signup'
const serverMode = ref('online') // 'online' | 'local'
const { 
  canInstall, 
  installApp, 
  needRefresh, 
  isUpdating, 
  progress, 
  progressText, 
  handleUpdate 
} = usePWA()

const handleInstallApp = async () => {
  await installApp()
}

const username = ref('')
const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const loading = ref(false)
const serverStatus = ref<'checking' | 'online' | 'offline'>('checking')
const serverStatusDetail = ref('')
const selectedServerId = ref('')
const isOnline = computed(() => authStore.isOnline)

const appVersion = __APP_VERSION__

const switchAuthTab = (tab: string) => {
  authTab.value = tab
  error.value = null
  success.value = null
  gsap.set('.auth-tab', { clearProps: 'all' })
}

const handleLogin = async () => {
  if (serverStatus.value !== 'online') return
  if (!email.value || !password.value) {
    error.value = 'Completa todos los campos'
    return
  }
  loading.value = true
  error.value = null
  try {
    await authStore.login(email.value, password.value)
    window.location.href = import.meta.env.BASE_URL
  } catch (err: unknown) {
    error.value = getFriendlyErrorMessage(err)
  } finally {
    loading.value = false
  }
}

/**
 * Verifica si el servidor seleccionado responde (Ping)
 */
const checkServerHealth = async () => {
  if (!isOnline.value) {
    serverStatus.value = 'offline'
    return
  }

  const server = OFFICIAL_SERVERS.find(s => s.id === selectedServerId.value)
  if (!server) return

  serverStatus.value = 'checking'
  try {
    // Usamos el endpoint de rest/v1/ para un ping rápido
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    
    const response = await fetch(`${server.url}/rest/v1/`, { 
      signal: controller.signal,
      headers: { 'apikey': server.anonKey }
    })
    
    clearTimeout(timeout)
    
    serverStatus.value = (response.status < 500) ? 'online' : 'offline'
    serverStatusDetail.value = (response.status < 500) ? 'Operativo ✅' : 'Error de Servidor 💥'
  } catch (_e) {
    serverStatus.value = 'offline'
    serverStatusDetail.value = 'Inalcanzable 💤'
  }
}

const handleSignup = async () => {
  if (!username.value || !email.value || !password.value) {
    error.value = 'Completa todos los campos'
    return
  }
  loading.value = true
  error.value = null
  try {
    await authStore.signup(email.value, password.value, username.value)
    success.value = '¡Cuenta creada! Revisa tu email para confirmar.'
    authTab.value = 'login'
  } catch (err: unknown) {
    error.value = (err as Error).message || 'Error al registrarse'
  } finally {
    loading.value = false
  }
}

const handleLocalLogin = async () => {
  if (!username.value) {
    error.value = 'Ingresa un nickname'
    return
  }
  loading.value = true
  error.value = null
  try {
    await authStore.localLogin(username.value)
    gsap.delayedCall(0.8, () => {
      window.location.href = import.meta.env.BASE_URL
    })
  } catch (_err) {
    error.value = 'Error al entrar en modo local'
  } finally {
    loading.value = false
  }
}

// Corregir bucle infinito si ya se está logueado
onMounted(() => {
  // Sincronizar servidor seleccionado
  const storedServer = safeStorage.getItem('pokevicio_selected_server_id')
  selectedServerId.value = storedServer || DEFAULT_SERVER.id
  switchServer(selectedServerId.value)
  checkServerHealth()

  if (authStore.user) {
    logger.warn('Login', 'Usuario ya logueado detectado en ruta /login. Forzando logout para resetear estado.')
    authStore.logout()
  }

  gsap.from('.login-header-logo', {
    y: -100,
    opacity: 0,
    duration: 1.5,
    ease: 'back.out(1.2)',
    onComplete: () => {
      gsap.set('.login-header-logo', { clearProps: 'transform' })
    }
  })

  gsap.to('.login-header-logo img', {
    y: 15,
    duration: 3,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  })

  gsap.from('.auth-card', {
    y: 30,
    opacity: 0,
    duration: 1,
    delay: 0.5,
    ease: 'power3.out'
  })
})

function handleTabEnter(e: MouseEvent) {
  const tab = e.currentTarget as HTMLElement
  if (!tab.classList.contains('active')) {
    gsap.to(tab, {
      color: 'var(--white)',
      duration: 0.2
    })
  }
}

function handleTabLeave(e: MouseEvent) {
  const tab = e.currentTarget as HTMLElement
  if (!tab.classList.contains('active')) {
    gsap.to(tab, {
      color: 'var(--gray)',
      duration: 0.2
    })
  }
}



watch(authTab, (newTab) => {
  nextTick(() => {
    const tabs = document.querySelectorAll('.auth-tab')
    tabs.forEach(tab => {
      const tabText = tab.textContent?.trim().toLowerCase().replace(/\s+/g, '')
      const expectedText = newTab === 'login' ? 'iniciarsesión' : 'registrarse'
      const isTabActive = tabText === expectedText
      if (isTabActive) {
        gsap.to(tab, {
          color: '#ffffff',
          backgroundColor: '#bf5af2',
          duration: 0.3
        })
      } else {
        gsap.to(tab, {
          color: '#86868b',
          backgroundColor: 'transparent',
          duration: 0.3
        })
      }
    })
  })
}, { immediate: true })

watch(error, (newVal) => {
  if (newVal && newVal.startsWith('BAN:')) {
    nextTick(() => {
      const card = document.querySelector('.auth-ban-card')
      if (card) {
        gsap.killTweensOf(card)
        const tl = gsap.timeline()
        tl.to(card, { x: -4, duration: 0.05 })
          .to(card, { x: 4, duration: 0.05 })
          .to(card, { x: -4, duration: 0.05 })
          .to(card, { x: 4, duration: 0.05 })
          .to(card, { x: -2, duration: 0.05 })
          .to(card, { x: 2, duration: 0.05 })
          .to(card, { x: 0, duration: 0.05 })
      }
    })
  }
})

watch(isOnline, (online) => {
  if (!online) {
    nextTick(() => {
      const alert = document.querySelector('.internet-alert')
      if (alert) {
        gsap.killTweensOf(alert)
        gsap.to(alert, {
          opacity: 0.6,
          duration: 1,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut'
        })
      }
    })
  } else {
    gsap.killTweensOf('.internet-alert')
  }
}, { immediate: true })

const handleServerChange = () => {
  switchServer(selectedServerId.value)
  checkServerHealth()
}
</script>

<template>
  <div id="auth-screen">
    <div class="login-background-stars" />
    
    <div class="login-header-logo">
      <img
        :src="getAssetUrl(ASSET_TYPES.UI, '../fondo/logo 1')"
        alt="Poké Vicio Logo"
      >
    </div>

    <div class="auth-card">
      <div class="auth-sub">
        Te reto a dejar de jugarlo
      </div>

      <!-- CARTEL DE ACTUALIZACIÓN MANUAL EN LOGIN -->
      <div
        v-if="needRefresh"
        class="auth-pwa-update-panel"
      >
        <div class="update-icon">
          🔄
        </div>
        <div class="update-title">
          NUEVA VERSIÓN
        </div>
        <div class="update-message">
          ¡Hay una nueva actualización disponible! Es necesario actualizar para mantener la compatibilidad con el servidor.
        </div>
        
        <div
          v-if="isUpdating"
          class="pwa-progress-wrapper"
        >
          <div class="pwa-progress-container">
            <div
              class="pwa-progress-bar"
              :style="{ width: `${progress}%` }"
            />
          </div>
          <span class="pwa-progress-text">{{ progressText }}</span>
        </div>
        <button 
          v-else 
          class="pv-button-retro update-btn" 
          @click.stop="() => handleUpdate({ forceNoSave: true })"
        >
          ACTUALIZAR AHORA
        </button>
      </div>

      <template v-else>
        <div class="auth-tabs">
          <button
            class="auth-tab"
            :class="{ active: authTab === 'login' }"
            @click.stop="switchAuthTab('login')"
            @mouseenter="handleTabEnter"
            @mouseleave="handleTabLeave"
          >
            Iniciar Sesión
          </button>
          <button
            class="auth-tab"
            :class="{ active: authTab === 'signup' }"
            @click.stop="switchAuthTab('signup')"
            @mouseenter="handleTabEnter"
            @mouseleave="handleTabLeave"
          >
            Registrarse
          </button>
        </div>

        <div
          v-if="error && !error.startsWith('BAN:')"
          class="auth-error show"
        >
          {{ error }}
        </div>

        <div
          v-if="error && error.startsWith('BAN:')"
          class="auth-ban-card show"
        >
          <div class="ban-title">
            🚫 ACCESO DENEGADO
          </div>
          <div class="ban-reason">
            {{ error.split(':')[1] }}
          </div>
          <div class="ban-hint">
            Si crees que esto es un error, contacta al soporte.
          </div>
        </div>

        <div
          v-if="success"
          class="auth-success show"
        >
          {{ success }}
        </div>

        <AuthServerSelector
          v-model="serverMode"
          @update:model-value="error = null"
        />

        <div class="auth-forms">
          <!-- ONLINE LOGIN -->
          <AuthOnlineLogin
            v-if="serverMode === 'online' && authTab === 'login'"
            v-model:selected-server-id="selectedServerId"
            v-model:email-value="email"
            v-model:password-value="password"
            :loading="loading"
            :is-online="isOnline"
            :server-status="serverStatus"
            :server-status-detail="serverStatusDetail"
            :official-servers="OFFICIAL_SERVERS"
            @server-change="handleServerChange"
            @login="handleLogin"
          />

          <!-- LOCAL LOGIN -->
          <AuthLocalLogin
            v-if="serverMode === 'local'"
            v-model:username-value="username"
            :loading="loading"
            @local-login="handleLocalLogin"
          />

          <!-- SIGNUP -->
          <AuthOnlineSignup
            v-if="serverMode === 'online' && authTab === 'signup'"
            v-model:username-value="username"
            v-model:email-value="email"
            v-model:password-value="password"
            :loading="loading"
            @signup="handleSignup"
          />

          <div
            v-if="loading"
            class="auth-loading-text"
          >
            Cargando partida... ⌛
          </div>
        </div>
      </template>

      <div class="auth-version-footer">
        <div
          v-if="canInstall"
          class="auth-pwa-install"
        >
          <button
            class="pwa-install-btn"
            @click.stop="handleInstallApp"
          >
            📲 INSTALAR APP (FULLSCREEN)
          </button>
        </div>
        {{ appVersion }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
@use "@/styles/views/login";

#auth-screen {
  background-image: v-bind(wallpaperUrl);
}

.auth-pwa-install {
  margin-bottom: 10px;
  
  .pwa-install-btn {
    @include btn-vicio('primary', 'sm', false);
  }
}

.server-list-container {
  margin-bottom: 16px;
  
  .label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .server-label {
    display: block;
    @include pixelated;
    font-size: 8px;
    color: Rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
  }

  .status-indicator {
    @include pixelated;
    font-size: 8px;
    padding: 2px 6px;
    border-radius: 4px;
    
    &.checking { color: $yellow; }
    &.online { 
      color: #00ff00;
      text-shadow: 0 0 5px Rgba(0, 255, 0, 0.5);
    }
    &.offline { color: #ff4444; }
  }
}

.internet-alert {
  background: Rgba(255, 68, 68, 0.2);
  border: 1px solid #ff4444;
  color: #ff4444;
  @include pixelated;
  font-size: 10px;
  padding: 12px;
  border-radius: 10px;
  margin-bottom: 16px;
  text-align: center;
  will-change: opacity;
}

.server-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
  padding-right: 40px !important;
  border-color: Rgba(255, 255, 255, 0.2);
  
  option {
    background: #1a1a1a;
    color: white;
  }
}

.auth-pwa-update-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px 10px;
  background: Rgba(255, 170, 0, 0.1);
  border: 2px solid #ffaa00;
  box-shadow: 0 0 15px Rgba(255, 170, 0, 0.2);
  border-radius: 8px;
  margin: 15px 0;

  .update-icon {
    font-size: 32px;
    margin-bottom: 12px;
  }

  .update-title {
    @include pixelated;
    font-size: 14px;
    color: #ffaa00;
    margin-bottom: 12px;
    text-shadow: 0 0 5px Rgba(255, 170, 0, 0.4);
  }

  .update-message {
    font-size: 11px;
    color: #ffffff;
    line-height: 1.5;
    margin-bottom: 20px;
    font-family: inherit;
  }

  .update-btn {
    @include btn-vicio('warning', 'md', false);
    width: 100%;
    margin-top: 10px;
  }

  .pwa-progress-wrapper {
    width: 100%;
    margin-top: 15px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .pwa-progress-container {
    width: 100%;
    height: 12px;
    background: #111;
    border: 2px solid #333;
    border-radius: 6px;
    overflow: hidden;
    position: relative;
  }

  .pwa-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #ffaa00, #ffd400);
    box-shadow: 0 0 8px #ffaa00;
    transition: width 0.3s ease;
  }

  .pwa-progress-text {
    @include pixelated;
    font-size: 8px;
    color: #ffaa00;
  }
}
</style>
