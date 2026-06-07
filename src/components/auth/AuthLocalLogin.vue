<script setup lang="ts">
import { useInputAnimations } from '@/composables/useInputAnimations'

interface Props {
  loading: boolean
  usernameValue: string
  genderValue: 'h' | 'm'
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:usernameValue', val: string): void
  (e: 'update:genderValue', val: 'h' | 'm'): void
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
      @click.stop="emit('localLogin')"
    >
      ▶ JUGAR LOCAL
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.local-login-form {
  width: 100%;
}

.gender-selection-row {
  display: flex;
  gap: 12px;
  width: 100%;
  margin-bottom: 12px;
  margin-top: 4px;

  .gender-select-btn {
    flex: 1;
    background: Rgba(0, 0, 0, 0.4);
    border: 2px solid Rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 10px;
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: Rgba(255, 255, 255, 0.6);
    font-family: inherit;
    font-weight: bold;
    will-change: transform;
    @include pixelated;

    &:hover {
      border-color: Rgba(255, 255, 255, 0.3);
      color: var(--white);
    }

    &.male {
      &.active {
        border-color: Rgba(59, 139, 255, 1);
        background: Rgba(59, 139, 255, 0.15);
        color: Rgba(59, 139, 255, 1);
        text-shadow: 0 0 8px Rgba(59, 139, 255, 0.4);
        box-shadow: 0 0 12px Rgba(59, 139, 255, 0.1);
      }
    }

    &.female {
      &.active {
        border-color: Rgba(255, 110, 255, 1);
        background: Rgba(255, 110, 255, 0.15);
        color: Rgba(255, 110, 255, 1);
        text-shadow: 0 0 8px Rgba(255, 110, 255, 0.4);
        box-shadow: 0 0 12px Rgba(255, 110, 255, 0.1);
      }
    }
  }
}
</style>
