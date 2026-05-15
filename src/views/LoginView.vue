<script setup lang="ts">
declare const __APP_VERSION__: string

import { ref, computed, onMounted } from 'vue'
import { gsap } from 'gsap'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { usePWA } from '@/composables/usePWA'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { logger } from '@/logic/utils/logger'
import { OFFICIAL_SERVERS, DEFAULT_SERVER } from '@/data/official_servers'
import { switchServer } from '@/logic/supabase'
import { safeStorage } from '@/logic/utils/storage'
import { getFriendlyErrorMessage } from '@/logic/utils/friendlyErrors'

// Components
import AuthServerSelector from '@/components/auth/AuthServerSelector.vue'

const wallpaperUrl = computed(() => `url('${getAssetUrl(ASSET_TYPES.UI, '../fondo/WALLPAPER')}')`)

const authStore = useAuthStore()
const gameStore = useGameStore()

const authTab = ref('login') // 'login' | 'signup'
const serverMode = ref('local') // 'online' | 'local'
const { canInstall, installApp } = usePWA()

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
}

const handleLogin = async () => {
  if (!email.value || !password.value) {
    error.value = 'Completa todos los campos'
    return
  }
  loading.value = true
  error.value = null
  try {
    await authStore.login(email.value, password.value)
    await gameStore.loadGame()
    window.location.href = '/'
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
    gsap.delayedCall(0.8, async () => {
      await gameStore.loadGame()
      window.location.href = '/'
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
})

const handleServerChange = () => {
  switchServer(selectedServerId.value)
  checkServerHealth()
}
</script>

<template>
  <div id="auth-screen">
    <div class="login-background-stars" />

    <div class="auth-card">
      <div class="auth-logo">
        Poké Vicio
      </div>
      <div class="auth-sub">
        Te reto a dejar de jugarlo
      </div>

      <div class="auth-tabs">
        <button
          class="auth-tab"
          :class="{ active: authTab === 'login' }"
          @click.stop="switchAuthTab('login')"
        >
          Iniciar Sesión
        </button>
        <button
          class="auth-tab"
          :class="{ active: authTab === 'signup' }"
          @click.stop="switchAuthTab('signup')"
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
        <div v-if="serverMode === 'online' && authTab === 'login'">
          <!-- Alerta de Internet -->
          <div 
            v-if="!isOnline" 
            class="internet-alert"
          >
            ⚠️ SIN CONEXIÓN A INTERNET
          </div>

          <div class="server-list-container">
            <div class="label-row">
              <label class="server-label">Seleccionar Servidor</label>
              <div 
                class="status-indicator"
                :class="serverStatus"
              >
                {{ serverStatusDetail || (serverStatus === 'checking' ? '...' : serverStatus === 'online' ? 'EN LÍNEA' : 'OFFLINE') }}
              </div>
            </div>
            <select 
              v-model="selectedServerId" 
              class="auth-input server-select"
              @change="handleServerChange"
            >
              <option 
                v-for="server in OFFICIAL_SERVERS" 
                :key="server.id" 
                :value="server.id"
              >
                {{ server.name }} [{{ server.region }}]
              </option>
            </select>
          </div>

          <input
            v-model="email"
            class="auth-input"
            type="email"
            placeholder="Email"
            @keyup.enter="handleLogin"
          >
          <input
            v-model="password"
            class="auth-input"
            type="password"
            placeholder="Contraseña"
            @keyup.enter="handleLogin"
          >
          <button
            class="auth-btn"
            :disabled="loading"
            @click.stop="handleLogin"
          >
            ▶ ENTRAR
          </button>
        </div>

        <!-- LOCAL LOGIN -->
        <div v-if="serverMode === 'local'">
          <input
            v-model="username"
            class="auth-input"
            type="text"
            placeholder="Nombre de Entrenador"
            maxlength="20"
            @keyup.enter="handleLocalLogin"
          >
          <button
            class="auth-btn"
            :disabled="loading"
            @click.stop="handleLocalLogin"
          >
            ▶ JUGAR LOCAL
          </button>
        </div>

        <!-- SIGNUP -->
        <div v-if="serverMode === 'online' && authTab === 'signup'">
          <input
            v-model="username"
            class="auth-input"
            type="text"
            placeholder="Nombre de Entrenador"
            maxlength="20"
            @keyup.enter="handleSignup"
          >
          <input
            v-model="email"
            class="auth-input"
            type="email"
            placeholder="Email"
            @keyup.enter="handleSignup"
          >
          <input
            v-model="password"
            class="auth-input"
            type="password"
            placeholder="Contraseña (mín. 6 caracteres)"
            @keyup.enter="handleSignup"
          >
          <button
            class="auth-btn"
            :disabled="loading"
            @click.stop="handleSignup"
          >
            ▶ CREAR CUENTA
          </button>
        </div>

        <div
          v-if="loading"
          class="auth-loading-text"
        >
          Cargando partida... ⌛
        </div>
      </div>

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
@use "@/styles/views/login";

#auth-screen {
  background-image: v-bind(wallpaperUrl);
}

.auth-pwa-install {
  margin-bottom: 10px;
  
  .pwa-install-btn {
    @include pixelated;
    background: var(--yellow);
    color: black;
    border: none;
    padding: 8px 16px;
    font-size: 10px;
    cursor: pointer;
    border-radius: 4px;
    box-shadow: 0 3px 0 #b39200;
    transition: all 0.2s;
    
    &:hover {
      transform: Translatey(-2px);
      box-shadow: 0 5px 0 #b39200;
    }
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
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
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
</style>
