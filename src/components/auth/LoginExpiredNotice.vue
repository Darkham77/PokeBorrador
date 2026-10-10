<script setup lang="ts">
const emit = defineEmits<{
  (e: 'dismiss'): void
}>()
</script>

<template>
  <div class="auth-pwa-update-panel session-expired-panel">
    <div class="update-icon emoji">
      ⚠️
    </div>
    <div class="update-title expired-title">
      SESIÓN EXPIRADA
    </div>
    <div class="update-message">
      Tu sesión ha expirado o la base de datos fue restaurada. Es necesario reiniciar la sesión para continuar jugando de forma segura.
    </div>
    <button
      id="login-expired-notice-btn-iniciar-sesi-n" 
      class="pv-button-retro update-btn expired-btn" 
      @click.stop="emit('dismiss')"
    >
      INICIAR SESIÓN
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/views/login" as *;

.session-expired-panel {
  background: Rgb(255 68 68 / 10%);
  border-color: var(--red-light);
  box-shadow: var(--shadow-glow-amber);
}

.expired-title {
  color: var(--red-light);
  text-shadow: 0 0 5px Rgb(255 68 68 / 40%);
}

.expired-btn {
  background: var(--red-light);
  color: var(--white);
  box-shadow: var(--shadow-card);
}
</style>
