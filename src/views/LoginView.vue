<script setup>
/* global __APP_VERSION__ */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

// Components
import AuthServerSelector from '@/components/auth/AuthServerSelector.vue'

const wallpaperUrl = computed(() => `url('${getAssetUrl(ASSET_TYPES.UI, '../fondo/WALLPAPER')}')`)

const router = useRouter()
const authStore = useAuthStore()
const gameStore = useGameStore()

const authTab = ref('login') // 'login' | 'signup'
const serverMode = ref('local') // 'online' | 'local'

const username = ref('')
const email = ref('')
const password = ref('')
const error = ref(null)
const success = ref(null)
const loading = ref(false)

const appVersion = __APP_VERSION__

const switchAuthTab = (tab) => {
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
    router.push('/')
  } catch (err) {
    error.value = err.message || 'Error al iniciar sesión'
  } finally {
    loading.value = false
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
  } catch (err) {
    error.value = err.message || 'Error al registrarse'
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
    setTimeout(async () => {
      await gameStore.loadGame()
      router.push('/')
    }, 800)
  } catch (_err) {
    error.value = 'Error al entrar en modo local'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div id="auth-screen">
    <div class="stars" />

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
          @click="switchAuthTab('login')"
        >
          Iniciar Sesión
        </button>
        <button
          class="auth-tab"
          :class="{ active: authTab === 'signup' }"
          @click="switchAuthTab('signup')"
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
            @click="handleLogin"
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
            @click="handleLocalLogin"
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
            @click="handleSignup"
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
</style>
