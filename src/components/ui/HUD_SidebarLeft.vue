<script setup lang="ts">
/**
 * HUD_SidebarLeft.vue
 * Orchestrates a vertical stack of floating buttons (Chat, Debug, etc)
 * to prevent overlapping and maintain a clean layout.
 */
</script>

<template>
  <div class="hud-sidebar-left">
    <slot />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.hud-sidebar-left {

  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: var(--z-hud);
  display: flex;
  flex-direction: column-reverse;
  gap: 12px;
  transform: Translatez(0);
  pointer-events: none;

  @include responsive(hud-mobile) {
    bottom: 100px;
  }
  

  /* Ensure items are clickable even if the container is passthrough */
  :deep(> *) {
    pointer-events: auto;
  }
}
</style>
