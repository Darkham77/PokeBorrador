<script setup lang="ts">
defineProps<{
  isUpdating: boolean
  animatedProgress: number
  progressText: string
}>()

const emit = defineEmits<{
  (e: 'update'): void
}>()
</script>

<template>
  <div class="auth-pwa-update-panel">
    <div class="update-icon emoji">
      🔄
    </div>
    <div class="update-title">
      NUEVA VERSIÓN
    </div>
    <div class="update-message">
      ¡Hay una nueva actualización disponible! Es necesario actualizar para mantener la compatibilidad con el servidor.
    </div>
    
    <div
      v-if="isUpdating"
      class="pwa-progress-wrapper"
    >
      <div class="pwa-progress-container">
        <div
          class="pwa-progress-bar"
          :style="{ width: `${animatedProgress}%` }"
        />
      </div>
      <span class="pwa-progress-text">{{ progressText }}</span>
    </div>
    <button 
      v-else
      id="login-pwa-update-btn" 
      class="pv-button-retro update-btn" 
      @click.stop="emit('update')"
    >
      ACTUALIZAR AHORA
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/views/login" as *;
</style>
