<script setup lang="ts">
import { useInputAnimations } from '@/composables/ui/useInputAnimations'
import PVGenderBadge from '@/components/common/PVGenderBadge.vue'
import type { GenderId } from '@/types/system/game'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

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
      id="auth-online-signup-input-nombre-de-entrenador"
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
        id="auth-online-signup-btn-1"
        class="gender-select-btn male"
        :class="{ active: genderValue === 'h' }"
        @click.prevent.stop="emit('update:genderValue', 'h')"
      >
        <PVGenderBadge
          gender="h"
          is-trainer
          size="sm"
        /> MASCULINO
      </button>
      <button
        id="auth-online-signup-btn-2"
        class="gender-select-btn female"
        :class="{ active: genderValue === 'm' }"
        @click.prevent.stop="emit('update:genderValue', 'm')"
      >
        <PVGenderBadge
          gender="m"
          is-trainer
          size="sm"
        /> FEMENINO
      </button>
    </div>

    <input
      id="auth-online-signup-input-email"
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
      id="auth-online-signup-input-contrase-a-m-n-6-caracteres"
      :value="passwordValue"
      class="auth-input"
      type="password"
      placeholder="Contraseña (mín. 6 caracteres)"
      autocomplete="new-password"
      @input="emit('update:passwordValue', ($event.target as HTMLInputElement).value)"
      @keyup.enter="emit('signup')"
      @focus="handleInputFocus"
      @blur="handleInputBlur"
      @mouseenter="handleInputEnter"
      @mouseleave="handleInputLeave"
    >
    <button
      id="auth-online-signup-btn-3"
      class="auth-btn"
      :disabled="loading"
      @click.stop="emit('signup')"
    >
      <img
        :src="getAssetUrl(ASSET_TYPES.ITEM, 'pokeball')"
        alt=""
        class="auth-btn-icon"
        draggable="false"
        aria-hidden="true"
      >
      <span>CREAR CUENTA</span>
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
