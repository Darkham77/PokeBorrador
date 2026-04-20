<script setup>
/* global __APP_VERSION__ */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'

const router = useRouter()
const authStore = useAuthStore()
const gameStore = useGameStore()

// Legacy states
const authTab = ref('login') // 'login' | 'signup'
const serverMode = ref('local') // 'online' | 'local'

const username = ref('')
const email = ref('')
const password = ref('')
const error = ref(null)
const success = ref(null)
const loading = ref(false)

const appVersion = __APP_VERSION__

onMounted(async () => {
  // Check if logout requested
  if (router.currentRoute.value.query.logout) {
    await authStore.logout()
  }
})

const switchAuthTab = (tab) => {
  authTab.value = tab
  error.value = null
  success.value = null
}

const switchServer = (mode) => {
  serverMode.value = mode
  error.value = null
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
    // After login, gameStore.loadGame() is called in App.vue or here if needed
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
    // Wait a bit for state sync
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
    <!-- Stars background restored from App.vue or shared CSS -->
    <div class="stars" />

    <div class="auth-card">
      <div class="auth-logo">
        Poké Vicio
      </div>
      <div class="auth-sub">
        Te reto a dejar de jugarlo
      </div>

      <!-- Auth Tabs (Login / Signup) -->
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
        v-if="error" 
        class="auth-error show"
      >
        {{ error }}
      </div>
      <div 
        v-if="success" 
        class="auth-success show"
      >
        {{ success }}
      </div>

      <!-- Server Selector -->
      <div class="server-selector">
        <div class="server-selector-label">
          Servidor
        </div>
        <div class="server-tabs">
          <button 
            class="server-tab" 
            :class="{ active: serverMode === 'online' }"
            @click="switchServer('online')"
          >
            🌐 Online
          </button>
          <button 
            class="server-tab" 
            :class="{ active: serverMode === 'local' }"
            @click="switchServer('local')"
          >
            💻 Local
          </button>
        </div>
      </div>

      <!-- Forms Wrapper -->
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

        <!-- LOCAL LOGIN (ONLY NICKNAME) -->
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
/* RESTORING EXACT LEGACY STYLES */
#auth-screen {
  position: fixed !important;
  inset: 0;
  z-index: 1000;
  /* Use the copied wallpaper */
  background: #000 url('/assets/fondo/WALLPAPER.webp') no-repeat center center;
  background-size: cover;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  overflow-y: auto;
  font-family: 'Nunito', sans-serif;
}

.stars {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(ellipse at 20% 50%, rgba(59, 139, 255, 0.05) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 20%, rgba(199, 125, 255, 0.05) 0%, transparent 60%);
}

.auth-card {
  border-radius: 24px;
  padding: 40px 32px;
  width: 100%;
  max-width: 400px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  background: rgba(18, 18, 18, 0.75);
  backdrop-filter: blur(20px) Saturate(180%);
  -webkit-backdrop-filter: blur(20px) Saturate(180%);
  animation: fadeIn 0.4s ease;
  z-index: 1;
}

.auth-logo {
  font-family: 'Press Start 2P', monospace;
  font-size: 20px;
  color: var(--red);
  text-align: center;
  margin-bottom: 6px;
  text-shadow: 0 0 20px rgba(255, 59, 59, 0.5);
}

.auth-sub {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--yellow);
  text-align: center;
  margin-bottom: 28px;
  letter-spacing: 2px;
}

.auth-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 24px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.auth-tab {
  flex: 1;
  padding: 10px;
  text-align: center;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  background: transparent;
  border: none;
  color: var(--gray);
  transition: all .2s;
  font-family: 'Nunito', sans-serif;
}

.auth-tab.active {
  background: var(--purple);
  color: #fff;
}

.auth-input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: var(--text);
  font-size: 14px;
  font-family: 'Nunito', sans-serif;
  margin-bottom: 12px;
  transition: border .2s;
  outline: none;
}

.auth-input:focus {
  border-color: var(--purple);
}

.auth-input::placeholder {
  color: var(--gray);
}

.auth-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  background: linear-gradient(135deg, var(--purple), #9b4dca);
  color: #fff;
  margin-top: 4px;
  transition: all .2s;
  box-shadow: 0 4px 15px rgba(199, 125, 255, 0.3);
}

.auth-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(199, 125, 255, 0.4);
}

.auth-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-error {
  background: rgba(255, 59, 59, 0.15);
  border: 1px solid rgba(255, 59, 59, 0.3);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 12px;
  color: var(--red);
  margin-bottom: 12px;
  display: none;
}

.auth-error.show {
  display: block;
}

.auth-success {
  background: rgba(107, 203, 119, 0.15);
  border: 1px solid rgba(107, 203, 119, 0.3);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 12px;
  color: var(--green);
  margin-bottom: 12px;
  display: none;
}

.auth-success.show {
  display: block;
}

/* SERVER SELECTOR */
.server-selector {
  margin-bottom: 25px;
}

.server-selector-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--gray);
  text-align: center;
  margin-bottom: 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.server-tabs {
  display: flex;
  gap: 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.server-tab {
  flex: 1;
  padding: 10px;
  text-align: center;
  cursor: pointer;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  background: transparent;
  border: none;
  color: var(--gray);
  transition: all .2s;
  letter-spacing: 1px;
}

.server-tab.active {
  background: linear-gradient(135deg, var(--blue), var(--purple));
  color: #fff;
  box-shadow: 0 2px 10px rgba(59, 139, 255, 0.3);
}

.server-tab:not(.active):hover {
  color: var(--blue);
  background: rgba(59, 139, 255, 0.08);
}

.auth-loading-text {
  text-align: center;
  padding: 16px;
  color: var(--gray);
  font-size: 13px;
}

.auth-version-footer {
  text-align: center;
  color: rgba(255, 255, 255, 0.2);
  font-size: 8px;
  font-family: 'Press Start 2P', monospace;
  margin-top: 24px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
