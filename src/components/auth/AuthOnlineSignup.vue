<script setup lang="ts">
import { useInputAnimations } from '@/composables/ui/useInputAnimations'
import type { GenderId } from '@/types/system/game'

interface Props {
  loading: boolean
  usernameValue: string
  emailValue: string
  passwordValue: string
  genderValue: GenderId
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:usernameValue', val: string): void
  (e: 'update:emailValue', val: string): void
  (e: 'update:passwordValue', val: string): void
  (e: 'update:genderValue', val: GenderId): void
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
    
    <div class="gender-selection-row">
      <button
        class="gender-select-btn male"
        :class="{ active: genderValue === 'h' }"
        @click.prevent.stop="emit('update:genderValue', 'h')"
      >
        <span class="btn-emoji">♂️</span> MASCULINO
      </button>
      <button
        class="gender-select-btn female"
        :class="{ active: genderValue === 'm' }"
        @click.prevent.stop="emit('update:genderValue', 'm')"
      >
        <span class="btn-emoji">♀️</span> FEMENINO
      </button>
    </div>

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
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.online-signup-form {
  width: 100%;
}

.gender-selection-row {
  @include gender-select-buttons;
}
</style>
