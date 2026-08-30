<script setup lang="ts">
import { useInputAnimations } from '@/composables/ui/useInputAnimations'

interface Server {
  id: string
  name: string
  region: string
  url: string
  anonKey: string
}

interface Props {
  loading: boolean
  isOnline: boolean
  serverStatus: 'checking' | 'online' | 'offline'
  serverStatusDetail: string
  selectedServerId: string
  officialServers: Server[]
  emailValue: string
  passwordValue: string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:selectedServerId', val: string): void
  (e: 'update:emailValue', val: string): void
  (e: 'update:passwordValue', val: string): void
  (e: 'serverChange'): void
  (e: 'login'): void
}>()

const {
  handleInputEnter,
  handleInputLeave,
  handleInputFocus,
  handleInputBlur
} = useInputAnimations()

const handleServerSelect = (e: Event) => {
  const target = e.target as HTMLSelectElement
  emit('update:selectedServerId', target.value)
  emit('serverChange')
}
</script>

<template>
  <div class="online-login-form">
    <!-- Alerta de Internet -->
    <div 
      v-if="!isOnline" 
      class="internet-alert"
    >
      <span class="emoji-inline">⚠️</span> SIN CONEXIÓN A INTERNET
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
        :value="selectedServerId" 
        class="auth-input server-select"
        @change="handleServerSelect"
        @focus="handleInputFocus"
        @blur="handleInputBlur"
        @mouseenter="handleInputEnter"
        @mouseleave="handleInputLeave"
      >
        <option 
          v-for="server in officialServers" 
          :key="server.id" 
          :value="server.id"
        >
          {{ server.name }} [{{ server.region }}]
        </option>
      </select>
    </div>

    <input
      :value="emailValue"
      class="auth-input"
      type="email"
      placeholder="Email"
      @input="emit('update:emailValue', ($event.target as HTMLInputElement).value)"
      @keyup.enter="emit('login')"
      @focus="handleInputFocus"
      @blur="handleInputBlur"
      @mouseenter="handleInputEnter"
      @mouseleave="handleInputLeave"
    >
    <input
      :value="passwordValue"
      class="auth-input"
      type="password"
      placeholder="Contraseña"
      @input="emit('update:passwordValue', ($event.target as HTMLInputElement).value)"
      @keyup.enter="emit('login')"
      @focus="handleInputFocus"
      @blur="handleInputBlur"
      @mouseenter="handleInputEnter"
      @mouseleave="handleInputLeave"
    >
    <button
      class="auth-btn"
      :disabled="loading || serverStatus !== 'online'"
      @click.stop="emit('login')"
    >
      ▶ ENTRAR
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/views/login" as *;

.online-login-form {
  width: 100%;
}
</style>
