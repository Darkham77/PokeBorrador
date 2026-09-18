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
  background: Rgba(255, 68, 68, 0.1);
  border-color: #ff4444;
  box-shadow: 0 0 15px Rgba(255, 68, 68, 0.2);
}

.expired-title {
  color: #ff4444;
  text-shadow: 0 0 5px Rgba(255, 68, 68, 0.4);
}

.expired-btn {
  background: #ff4444;
  color: white;
  box-shadow: 0 4px 0 #b30000;
}
</style>
