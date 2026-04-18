<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'

// Sub-componentes
import ServerSelector from '@/components/auth/ServerSelector.vue'
import LoginForm from '@/components/auth/LoginForm.vue'
import SignupForm from '@/components/auth/SignupForm.vue'

const authStore = useAuthStore()
const gameStore = useGameStore()
const uiStore = useUIStore()
const router = useRouter()

// UI State
const serverType = ref('online') // 'online' | 'local'
const activeTab = ref('login') // 'login' | 'signup'
const loading = ref(false)
const error = ref('')
const success = ref('')

function switchServer(type) {
  serverType.value = type
  clearMessages()
}

function switchTab(tab) {
  activeTab.value = tab
  clearMessages()
}

function clearMessages() {
  error.value = ''
  success.value = ''
}

async function handleLogin({ email, password }) {
  if (!email || !password) {
    error.value = 'Por favor completa todos los campos'
    return
  }
  loading.value = true
  clearMessages()
  try {
    await authStore.login(email, password)
    await gameStore.loadGame()
    router.push('/')
  } catch (err) {
    console.error(err)
    error.value = err.message || 'Credenciales inválidas o error de servidor'
  } finally {
    loading.value = false
  }
}

async function handleLocalLogin(username) {
  const name = username.trim()
  if (!name) {
    error.value = 'Por favor ingresa un nombre de entrenador'
    return
  }
  loading.value = true
  clearMessages()
  try {
    await authStore.localLogin(name)
    await gameStore.loadGame()
    router.push('/')
  } catch (err) {
    error.value = 'Error al iniciar sesión local'
  } finally {
    loading.value = false
  }
}

async function handleSignup({ email, password, username }) {
  if (!email || !password || !username) {
    error.value = 'Por favor completa todos los campos'
    return
  }
  loading.value = true
  clearMessages()
  try {
    await authStore.signup(email, password, username)
    success.value = '¡Cuenta creada! Iniciando sesión...'
    setTimeout(async () => {
      await authStore.login(email, password)
      await gameStore.loadGame()
      router.push('/')
    }, 1500)
  } catch (err) {
    error.value = err.message || 'Error al crear la cuenta'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-screen-container">
    <div class="stars" />
    
    <div id="auth-screen">
      <div class="auth-card">
        <div class="auth-logo">
          Poké Vicio
        </div>
        <div class="auth-sub">
          Te reto a dejar de jugarlo
        </div>
        
        <!-- Tabs de Acción (Solo para modo Online) -->
        <div
          v-if="serverType === 'online'"
          class="auth-tabs"
        >
          <button 
            :class="['auth-tab', { active: activeTab === 'login' }]" 
            @click="switchTab('login')"
          >
            Iniciar Sesión
          </button>
          <button 
            :class="['auth-tab', { active: activeTab === 'signup' }]" 
            @click="switchTab('signup')"
          >
            Registrarse
          </button>
        </div>

        <!-- Mensajes -->
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

        <ServerSelector v-model:server-type="serverType" />

        <LoginForm
          v-if="activeTab === 'login' || serverType === 'local'"
          :server-type="serverType"
          :loading="loading"
          @login="handleLogin"
          @local-login="handleLocalLogin"
        />

        <SignupForm
          v-if="serverType === 'online' && activeTab === 'signup'"
          :loading="loading"
          @signup="handleSignup"
        />

        <div
          v-if="loading"
          class="auth-loading-msg"
        >
          Cargando partida... ⌛
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.auth-screen-container {
  position: fixed;
  inset: 0;
  background: url('@/assets/ui/backgrounds/WALLPAPER.webp') center/cover no-repeat;
  overflow-y: auto;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 16px;
  
  @media (min-width: 768px) {
    justify-content: center;
    padding: 20px;
  }
}

.stars {
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse at 20% 50%, rgba(59, 139, 255, 0.05) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 20%, rgba(199, 125, 255, 0.05) 0%, transparent 60%);
  pointer-events: none;
  z-index: 1;
}

#auth-screen {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.auth-card {
  --auth-blur: blur(20px);
  --auth-sat: #{"Saturate(1.8)"};
  background: rgba(18, 18, 18, 0.75);
  backdrop-filter: var(--auth-blur) var(--auth-sat);
  -webkit-backdrop-filter: var(--auth-blur) var(--auth-sat);
  padding: 40px;
  border-radius: 24px;
  width: 100%;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  animation: fadeIn 0.4s ease;
  box-sizing: border-box;

  @media (max-width: 480px) {
    padding: 24px 16px;
  }
}

.auth-logo {
  font-family: 'Press Start 2P', monospace;
  font-size: 28px;
  color: #ff453a;
  margin-bottom: 8px;
  text-shadow: 0 0 20px rgba(255, 69, 58, 0.5);
  animation: slideDown 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);

  @media (max-width: 480px) {
    font-size: 20px;
  }
}

.auth-sub {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: #ffd60a;
  margin-bottom: 32px;
  letter-spacing: 2px;
  line-height: 1.4;
  opacity: 0;
  animation: fadeIn 0.4s ease forwards 0.3s;

  @media (max-width: 480px) {
    font-size: 8px;
    margin-bottom: 24px;
  }
}

.auth-tabs {
  display: flex;
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.03);
  padding: 4px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

.auth-tab {
  flex: 1;
  padding: 12px;
  border: none;
  background: transparent;
  color: #86868b;
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  font-size: 14px;
}

.auth-tab.active {
  background: #bf5af2;
  color: #fff;
}

.auth-error {
  background: rgba(255, 69, 58, 0.15);
  border: 1px solid rgba(255, 69, 58, 0.2);
  color: #ff453a;
  padding: 14px;
  border-radius: 12px;
  font-size: 10px;
  font-family: 'Press Start 2P', monospace;
  margin-bottom: 20px;
  display: none;
}

.auth-error.show {
  display: block;
}

.auth-loading-msg {
  margin-top: 20px;
  font-size: 11px;
  color: #86868b;
  font-family: 'Press Start 2P', monospace;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
