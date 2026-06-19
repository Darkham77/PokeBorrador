<script setup lang="ts">
import { useInputAnimations } from '@/composables/ui/useInputAnimations'

interface Props {
  loading: boolean
  usernameValue: string
  genderValue: 'h' | 'm'
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:usernameValue', val: string): void
  (e: 'update:genderValue', val: 'h' | 'm'): void
  (e: 'localSignup'): void
}>()

const {
  handleInputEnter,
  handleInputLeave,
  handleInputFocus,
  handleInputBlur
} = useInputAnimations()
</script>

<template>
  <div class="local-signup-form">
    <input
      :value="usernameValue"
      class="auth-input"
      type="text"
      placeholder="Nombre de Entrenador"
      maxlength="20"
      @input="emit('update:usernameValue', ($event.target as HTMLInputElement).value)"
      @keyup.enter="emit('localSignup')"
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
        ♂️ MASCULINO
      </button>
      <button
        class="gender-select-btn female"
        :class="{ active: genderValue === 'm' }"
        @click.prevent.stop="emit('update:genderValue', 'm')"
      >
        ♀️ FEMENINO
      </button>
    </div>

    <button
      class="auth-btn"
      :disabled="loading"
      @click.stop="emit('localSignup')"
    >
      ▶ NUEVA PARTIDA
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.local-signup-form {
  width: 100%;
}

.gender-selection-row {
  @include gender-select-buttons;
}
</style>
