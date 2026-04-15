<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// UI State
const serverType = ref('online') // 'online' | 'local'
const activeTab = ref('login') // 'login' | 'signup'
const loading = ref(false)
const error = ref('')
const success = ref('')

// Form State
const email = ref('')
const password = ref('')
const username = ref('') // For Local and Signup

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

async function handleLogin() {
  if (!email.value || !password.value) {
    error.value = 'Por favor completa todos los campos'
    return
  }

  loading.value = true
  clearMessages()

  try {
    await authStore.login(email.value, password.value)
    window.location.href = '/?auth=success'
  } catch (err) {
    error.value = 'Credenciales inválidas o error de servidor'
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function handleLocalLogin() {
  const name = username.value.trim()
  if (!name) {
    error.value = 'Por favor ingresa un nombre de entrenador'
    return
  }
  
  loading.value = true
  clearMessages()

  try {
    // Simular carga de partida local
    await new Promise(resolve => setTimeout(resolve, 800))
    await authStore.localLogin(name)
    window.location.href = '/?auth=success'
  } catch (err) {
    error.value = 'Error al iniciar sesión local'
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function handleSignup() {
  if (!email.value || !password.value || !username.value) {
    error.value = 'Por favor completa todos los campos'
    return
  }

  loading.value = true
  clearMessages()

  try {
    // Implementación pendiente de registro en authStore si se requiere
    error.value = 'El registro no está habilitado en esta versión'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-screen-container">
    <div class="stars"></div>
    
    <div id="auth-screen" class="screen active">
      <div class="auth-card">
        <div class="auth-logo">Poké Vicio</div>
        <div class="auth-sub">Te reto a dejar de jugarlo</div>
        
        <!-- Tabs de Acción (Solo para modo Online) -->
        <div v-if="serverType === 'online'" class="auth-tabs">
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
        <div v-if="error" class="auth-error show">{{ error }}</div>
        <div v-if="success" class="auth-success show">{{ success }}</div>

        <!-- Selector de Servidor -->
        <div class="server-selector">
          <div class="server-selector-label">Servidor</div>
          <div class="server-tabs">
            <button 
              :class="['server-tab', { active: serverType === 'online' }]" 
              @click="switchServer('online')"
            >
              🌐 Online
            </button>
            <button 
              :class="['server-tab', { active: serverType === 'local' }]" 
              @click="switchServer('local')"
            >
              💻 Local
            </button>
          </div>
        </div>

        <!-- Formulario Login Online -->
        <div v-if="serverType === 'online' && activeTab === 'login'" class="form-container">
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
          <button class="auth-btn" :disabled="loading" @click="handleLogin">
            <span v-if="loading">...</span>
            <span v-else>▶ ENTRAR</span>
          </button>
        </div>

        <!-- Formulario Login Local -->
        <div v-if="serverType === 'local'" class="form-container">
          <input 
            v-model="username"
            class="auth-input" 
            type="text" 
            placeholder="Nombre de Entrenador" 
            maxlength="20"
            @keyup.enter="handleLocalLogin"
          >
          <button class="auth-btn" :disabled="loading" @click="handleLocalLogin">
            <span v-if="loading">...</span>
            <span v-else>▶ JUGAR LOCAL</span>
          </button>
        </div>

        <!-- Formulario Registro -->
        <div v-if="serverType === 'online' && activeTab === 'signup'" class="form-container">
          <input 
            v-model="username"
            class="auth-input" 
            type="text" 
            placeholder="Nombre de Entrenador" 
            maxlength="20"
          >
          <input 
            v-model="email"
            class="auth-input" 
            type="email" 
            placeholder="Email"
          >
          <input 
            v-model="password"
            class="auth-input" 
            type="password" 
            placeholder="Contraseña (mín. 6 caracteres)"
          >
          <button class="auth-btn" :disabled="loading" @click="handleSignup">
            ▶ CREAR CUENTA
          </button>
        </div>

        <div v-if="loading" class="auth-loading-msg">
          Cargando partida... ⌛
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-screen-container {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--darker);
  overflow: hidden;
  z-index: 2000;
}

.stars {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 20% 50%, rgba(59, 139, 255, 0.05) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 20%, rgba(199, 125, 255, 0.05) 0%, transparent 60%);
  pointer-events: none;
}

.auth-card {
  background: var(--card);
  padding: 40px;
  border-radius: 24px;
  width: 100%;
  max-width: 420px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  z-index: 10;
  position: relative;
  animation: fadeIn 0.4s ease;
}

.auth-logo {
  font-family: 'Press Start 2P', monospace;
  font-size: 28px;
  background: linear-gradient(135deg, var(--yellow), var(--red));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
  filter: drop-shadow(0 0 10px rgba(255, 214, 10, 0.3));
}

.auth-sub {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--purple);
  margin-bottom: 32px;
  letter-spacing: 2px;
}

.auth-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.03);
  padding: 6px;
  border-radius: 12px;
}

.auth-tab {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  color: var(--gray);
  font-family: 'Nunito', sans-serif;
  font-weight: 700;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
}

.auth-tab.active {
  background: rgba(255, 255, 255, 0.07);
  color: white;
}

.server-selector {
  margin-bottom: 24px;
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.server-selector-label {
  font-size: 10px;
  font-family: 'Press Start 2P', monospace;
  color: var(--gray);
  margin-bottom: 12px;
}

.server-tabs {
  display: flex;
  gap: 8px;
}

.server-tab {
  flex: 1;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: var(--gray);
  border-radius: 8px;
  cursor: pointer;
  font-size: 11px;
  font-family: 'Press Start 2P', monospace;
  transition: all 0.2s;
}

.server-tab.active {
  background: var(--yellow);
  color: var(--darker);
  border-color: var(--yellow);
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 14px 20px;
  border-radius: 12px;
  color: white;
  font-family: 'Nunito', sans-serif;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;
}

.auth-input:focus {
  border-color: var(--yellow);
  background: rgba(255, 255, 255, 0.08);
}

.auth-btn {
  background: linear-gradient(135deg, var(--yellow), #e6c200);
  color: var(--darker);
  border: none;
  padding: 18px;
  border-radius: 12px;
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 15px rgba(255, 214, 10, 0.2);
}

.auth-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 214, 10, 0.4);
}

.auth-btn:active {
  transform: translateY(0);
}

.auth-error {
  background: rgba(255, 69, 58, 0.1);
  color: var(--red);
  padding: 12px;
  border-radius: 10px;
  font-size: 12px;
  font-family: 'Press Start 2P', monospace;
  margin-bottom: 16px;
  display: none;
}

.auth-error.show {
  display: block;
}

.auth-loading-msg {
  margin-top: 16px;
  font-size: 12px;
  color: var(--gray);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
