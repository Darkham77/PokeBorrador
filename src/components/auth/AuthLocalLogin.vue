<script setup lang="ts">
import { useInputAnimations } from '@/composables/ui/useInputAnimations'

interface Props {
  loading: boolean
  usernameValue: string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:usernameValue', val: string): void
  (e: 'localLogin'): void
}>()

const {
  handleInputEnter,
  handleInputLeave,
  handleInputFocus,
  handleInputBlur
} = useInputAnimations()
</script>

<template>
  <div class="local-login-form">
    <input
      id="local-username-input"
      :value="usernameValue"
      class="auth-input"
      type="text"
      placeholder="Nombre de Entrenador"
      maxlength="20"
      @input="emit('update:usernameValue', ($event.target as HTMLInputElement).value)"
      @keyup.enter="emit('localLogin')"
      @focus="handleInputFocus"
      @blur="handleInputBlur"
      @mouseenter="handleInputEnter"
      @mouseleave="handleInputLeave"
    >

    <button
      id="local-login-btn"
      class="auth-btn"
      :disabled="loading"
      @click.stop="emit('localLogin')"
    >
      ▶ JUGAR LOCAL
    </button>
  </div>
</template>

<style scoped lang="scss">
.local-login-form {
  width: 100%;
}
</style>
