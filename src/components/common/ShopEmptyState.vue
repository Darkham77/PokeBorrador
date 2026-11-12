<script setup lang="ts">
interface Props {
  readonly title?: string;
  readonly message?: string;
}

withDefaults(defineProps<Props>(), {
  title: 'Sin resultados',
  message: 'Prueba con otros términos de búsqueda en esta sección'
});
</script>

<template>
  <div class="shop-empty-state">
    <span class="emoji empty-icon">🔍</span>
    <div class="empty-text">
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/components/shop' as *;
</style>
