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
@use "@/styles/core/tools" as *;

.online-login-form {
  width: 100%;
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
</style>
