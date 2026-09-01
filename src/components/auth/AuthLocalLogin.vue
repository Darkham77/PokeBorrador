<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useInputAnimations } from '@/composables/ui/useInputAnimations'
import { queryLocal } from '@/logic/db/sqliteEngine'

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

const availableProfiles = ref<string[]>([])

onMounted(async () => {
  try {
    const rows = await queryLocal('SELECT username FROM profiles WHERE username IS NOT NULL ORDER BY username ASC')
    availableProfiles.value = rows.map(r => String(r.username)).filter(Boolean)
  } catch {
    // Ignore if not initialized yet
  }
})
</script>

<template>
  <div class="local-login-form">
    <input
      id="local-username-input"
      :value="usernameValue"
      class="auth-input"
      type="text"
      placeholder="Nombre de Entrenador"
      maxlength="15"
      list="local-profiles-list"
      @input="emit('update:usernameValue', ($event.target as HTMLInputElement).value)"
      @keyup.enter="emit('localLogin')"
      @focus="handleInputFocus"
      @blur="handleInputBlur"
      @mouseenter="handleInputEnter"
      @mouseleave="handleInputLeave"
    >

    <datalist id="local-profiles-list">
      <option
        v-for="name in availableProfiles"
        :key="name"
        :value="name"
      />
    </datalist>

    <button
      id="local-login-btn"
      class="auth-btn"
      :disabled="loading"
      @click.stop="emit('localLogin')"
    >
      <span class="emoji">▶</span> JUGAR LOCAL
    </button>
  </div>
</template>

<style scoped lang="scss">
.local-login-form {
  width: 100%;
}
</style>
