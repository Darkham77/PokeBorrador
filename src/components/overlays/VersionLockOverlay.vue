<script setup lang="ts">
defineProps<{
  clientVersion?: string | number
  dbVersion?: string | number
}>()

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="loading-overlay version-lock">
    <div class="lock-icon">
      ⚠️
    </div>
    <h2>SERVIDOR DESACTUALIZADO</h2>
    <p>Tu cliente (v{{ clientVersion }}) es más moderno que el servidor (v{{ dbVersion }}).</p>
    <p class="admin-note">
      Por favor, contacta al administrador para actualizar la base de datos.
    </p>
    <div
      class="retry-btn"
      @click.stop="emit('retry')"
    >
      REINTENTAR
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.loading-overlay {
  position: fixed;
  inset: 0;
  width: 100dvw;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: $black;
  z-index: var(--z-max);
  color: var(--yellow);
  @include pixelated;
  font-size: 12px;
  text-align: center;
}

.lock-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

h2 {
  color: #ff3333;
  margin-bottom: 15px;
}

p {
  margin-top: 5px;
  color: $white;
}

.admin-note {
  color: var(--yellow);
  opacity: 0.8;
  font-size: 10px;
}

.retry-btn {
  margin-top: 30px;
  padding: 10px 20px;
  background: #ff3333;
  color: $white;
  cursor: pointer;
  border: 2px solid $white;
  transition: all 0.2s;

  &:hover {
    transform: Scale(1.1);
    background: $white;
    color: #ff3333;
  }
}
</style>
