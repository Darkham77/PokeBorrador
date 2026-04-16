<script setup>
import { ref } from 'vue'

const props = defineProps({
  serverType: { type: String, required: true },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['login', 'localLogin'])

const email = ref('')
const password = ref('')
const username = ref('')

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
      @click="handleLocalLogin"
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
.form-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-input {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px 20px;
  border-radius: 14px;
  color: #fff;
  font-family: 'Nunito', sans-serif;
  font-size: 16px;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
  width: 100%;
}

.auth-input:focus {
  border-color: #ffd60a;
}

.auth-btn {
  background: #ffd60a;
  color: #000;
  border: none;
  padding: 18px;
  border-radius: 14px;
  font-family: 'Press Start 2P', monospace;
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
  transform: translateY(-2px);
  background: #ffe04d;
}
</style>
