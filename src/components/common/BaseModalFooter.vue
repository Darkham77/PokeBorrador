<script setup lang="ts">
// style-inherited: inherits .modal-footer-premium from base-modal.scss
</script>

<template>
  <footer class="modal-footer-premium">
    <slot />
  </footer>
</template>

<style lang="scss">
@use "@/styles/components/base-modal" as *;
</style>
