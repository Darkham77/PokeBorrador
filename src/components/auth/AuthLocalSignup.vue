<script setup lang="ts">
import { useInputAnimations } from '@/composables/ui/useInputAnimations';
import PVGenderBadge from '@/components/common/PVGenderBadge.vue';
import type { GenderId } from '@/types/system/game';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';

interface Props {
  loading: boolean;
  usernameValue: string;
  genderValue: GenderId;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:usernameValue', val: string): void;
  (e: 'update:genderValue', val: GenderId): void;
  (e: 'localSignup'): void;
}>();

const { handleInputEnter, handleInputLeave, handleInputFocus, handleInputBlur } =
  useInputAnimations();
</script>

<template>
  <div class="local-signup-form">
    <input
      id="auth-local-signup-input-nombre-de-entrenador"
      :value="usernameValue"
      class="auth-input"
      type="text"
      placeholder="Nombre de Entrenador"
      aria-label="Nombre de Entrenador"
      maxlength="20"
      @input="emit('update:usernameValue', ($event.target as HTMLInputElement).value)"
      @keyup.enter="emit('localSignup')"
      @focus="handleInputFocus"
      @blur="handleInputBlur"
      @mouseenter="handleInputEnter"
      @mouseleave="handleInputLeave"
    />

    <div class="gender-selection-row">
      <button
        id="auth-local-signup-btn-1"
        class="gender-select-btn male"
        :class="{ active: genderValue === 'h' }"
        @click.prevent.stop="emit('update:genderValue', 'h')"
      >
        <PVGenderBadge gender="h" is-trainer size="sm" /> MASCULINO
      </button>
      <button
        id="auth-local-signup-btn-2"
        class="gender-select-btn female"
        :class="{ active: genderValue === 'm' }"
        @click.prevent.stop="emit('update:genderValue', 'm')"
      >
        <PVGenderBadge gender="m" is-trainer size="sm" /> FEMENINO
      </button>
    </div>

    <button
      id="auth-local-signup-btn-3"
      class="auth-btn"
      :disabled="loading"
      @click.stop="emit('localSignup')"
    >
      <img
        :src="getAssetUrl(ASSET_TYPES.ITEM, 'pokeball')"
        alt=""
        class="auth-btn-icon"
        draggable="false"
        aria-hidden="true"
        width="16"
        height="16"
      />
      <span>NUEVA PARTIDA</span>
    </button>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/core/_mixins' as *;
@use '@/styles/core/tools' as *;

.local-signup-form {
  width: 100%;
}

.gender-selection-row {
  @include gender-select-buttons;
}
</style>
