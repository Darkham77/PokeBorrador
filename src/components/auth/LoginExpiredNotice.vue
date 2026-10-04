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
  background: rgb(255 68 68 / 10%);
  border-color: #f44;
  box-shadow: 0 0 15px rgb(255 68 68 / 20%);
}

.expired-title {
  color: #f44;
  text-shadow: 0 0 5px rgb(255 68 68 / 40%);
}

.expired-btn {
  background: #f44;
  color: white;
  box-shadow: 0 4px 0 #b30000;
}
</style>
