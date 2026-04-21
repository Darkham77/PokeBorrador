<template>
  <div class="hud-sidebar-left">
    <slot />
  </div>
</template>

<script setup>
/**
 * HUD_SidebarLeft.vue
 * Orchestrates a vertical stack of floating buttons (Chat, Debug, etc)
 * to prevent overlapping and maintain a clean layout.
 */
</script>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.hud-sidebar-left {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: var(--z-max);
  display: flex;
  flex-direction: column-reverse;
  gap: 12px;
  pointer-events: none;
  transform: translateZ(0);
  transition: bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  /* Ensure items are clickable even if the container is passthrough */
  :deep(> *) {
    pointer-events: auto;
  }

  @include responsive(hud-mobile) {
    bottom: 110px;
  }
}
</style>
