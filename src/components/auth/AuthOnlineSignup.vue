<script setup lang="ts">
import { useInputAnimations } from '@/composables/useInputAnimations'

interface Props {
  loading: boolean
  usernameValue: string
  emailValue: string
  passwordValue: string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:usernameValue', val: string): void
  (e: 'update:emailValue', val: string): void
  (e: 'update:passwordValue', val: string): void
  (e: 'signup'): void
}>()

const {
  handleInputEnter,
  handleInputLeave,
  handleInputFocus,
  handleInputBlur
} = useInputAnimations()
</script>

<template>
  <div class="online-signup-form">
    <input
      :value="usernameValue"
      class="auth-input"
      type="text"
      placeholder="Nombre de Entrenador"
      maxlength="20"
      @input="emit('update:usernameValue', ($event.target as HTMLInputElement).value)"
      @keyup.enter="emit('signup')"
      @focus="handleInputFocus"
      @blur="handleInputBlur"
      @mouseenter="handleInputEnter"
      @mouseleave="handleInputLeave"
    >
    <input
      :value="emailValue"
      class="auth-input"
      type="email"
      placeholder="Email"
      @input="emit('update:emailValue', ($event.target as HTMLInputElement).value)"
      @keyup.enter="emit('signup')"
      @focus="handleInputFocus"
      @blur="handleInputBlur"
      @mouseenter="handleInputEnter"
      @mouseleave="handleInputLeave"
    >
    <input
      :value="passwordValue"
      class="auth-input"
      type="password"
      placeholder="Contraseña (mín. 6 caracteres)"
      @input="emit('update:passwordValue', ($event.target as HTMLInputElement).value)"
      @keyup.enter="emit('signup')"
      @focus="handleInputFocus"
      @blur="handleInputBlur"
      @mouseenter="handleInputEnter"
      @mouseleave="handleInputLeave"
    >
    <button
      class="auth-btn"
      :disabled="loading"
      @click.stop="emit('signup')"
    >
      ▶ CREAR CUENTA
    </button>
  </div>
</template>

<style scoped lang="scss">
.online-signup-form {
  width: 100%;
}
</style>
