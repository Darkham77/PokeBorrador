<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  (e: 'signup', payload: any): void
}>()

const email = ref('')
const password = ref('')
const username = ref('')

const handleSignup = () => {
  emit('signup', { email: email.value, password: password.value, username: username.value })
}
</script>

<template>
  <div class="form-container">
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
    <button
      class="auth-btn"
      :disabled="loading"
      @click.stop="handleSignup"
    >
      <span class="btn-icon">▶</span>
      <span class="btn-text">CREAR CUENTA</span>
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
}

.auth-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  background: Rgba(255, 224, 77, 1);
}
</style>
