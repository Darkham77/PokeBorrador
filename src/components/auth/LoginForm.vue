<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { OFFICIAL_SERVERS, DEFAULT_SERVER } from '@/data/official_servers'
import { safeStorage } from '@/logic/utils/storage'
import { switchServer } from '@/logic/supabase'

interface Props {
  serverType: string
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  (e: 'login', payload: { email: string; password: string }): void
  (e: 'localLogin', username: string): void
}>()

const email = ref('')
const password = ref('')
const username = ref('')
const selectedServerId = ref('')

onMounted(() => {
  const stored = safeStorage.getItem('pokevicio_selected_server_id')
  selectedServerId.value = stored || DEFAULT_SERVER.id
})

const handleServerChange = () => {
  switchServer(selectedServerId.value)
}

const handleLogin = () => {
  emit('login', { email: email.value, password: password.value })
}

const handleLocalLogin = () => {
  emit('localLogin', username.value)
}
</script>

<template>
  <!-- Formulario Login Online -->
  <div
    v-if="serverType === 'online'"
    class="form-container"
  >
    <!-- Selector de Servidor -->
    <div class="server-selector-container">
      <label class="selector-label">SERVIDOR OFICIAL</label>
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
      <span v-if="loading">...</span>
      <span
        v-else
        class="btn-content"
      >
        <span class="btn-icon">▶</span>
        <span class="btn-text">ENTRAR</span>
      </span>
    </button>
  </div>

  <!-- Formulario Login Local -->
  <div
    v-else
    class="form-container"
  >
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
      <span v-if="loading">...</span>
      <span
        v-else
        class="btn-content"
      >
        <span class="btn-icon">▶</span>
        <span class="btn-text">JUGAR LOCAL</span>
      </span>
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.form-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-input {
  background: Rgba(0, 0, 0, 0.2);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  padding: 16px 20px;
  border-radius: 14px;
  color: $white;
  font-family: 'Nunito', sans-serif;
  font-size: 16px;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
  width: 100%;
}

.auth-input:focus {
  border-color: $yellow;
}

.auth-btn {
  background: $yellow;
  color: $black;
  border: none;
  padding: 18px;
  border-radius: 14px;
  @include pixelated;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  line-height: 1;
  white-space: nowrap;

  .btn-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }

  @media (max-width: 400px) {
    font-size: 10px;
    padding: 16px;
  }
}

.auth-btn:hover:not(:disabled) {
  transform: Translatey(-2px);
  background: Rgba(255, 224, 77, 1);
}

.server-selector-container {
  margin-bottom: 8px;
  
  .selector-label {
    display: block;
    @include pixelated;
    font-size: 8px;
    color: Rgba(255, 255, 255, 0.4);
    margin-bottom: 8px;
    margin-left: 4px;
    text-transform: uppercase;
  }
}

.server-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
  padding-right: 40px !important;

  option {
    background: #1a1a1a;
    color: white;
  }
}
</style>
