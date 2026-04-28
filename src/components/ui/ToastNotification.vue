<script setup>
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()
</script>

<template>
  <Teleport to="body">
    <div
      id="notification-stack"
      class="toast-stack"
      :class="{ 'is-fullscreen-toast': uiStore.isAnyFullscreenModalOpen }"
    >
      <TransitionGroup name="toast">
        <div 
          v-for="n in uiStore.notifications" 
          :key="n.id" 
          class="toast-item"
        >
          <span class="toast-icon">{{ n.icon }}</span>
          <span class="toast-msg">{{ n.msg }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.toast-stack {
  position: fixed;
  top: 100px; // Below HUD
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: var(--z-toast);
  pointer-events: none;
  max-width: 300px;
  @include gpu-layer;

  &.is-fullscreen-toast {
    top: 20px;
    z-index: var(--z-max-value);
  }
}

.toast-item {
  pointer-events: all;
  background: Rgba(10, 12, 18, 0.9);
  -webkit-backdrop-filter: Blur(12px); -webkit-backdrop-filter: Blur(12px); backdrop-filter: Blur(12px);
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-left: 3px solid var(--yellow, Rgba(241, 196, 15, 1));
  padding: 10px 14px;
  border-radius: 14px;
  box-shadow: 0 8px 30px Rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Inter', 'Nunito', sans-serif;
  color: white;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.2px;
  
  .toast-icon {
    font-size: 16px;
    flex-shrink: 0;
  }
  
  .toast-msg {
    line-height: 1.3;
  }
}

/* Animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(50px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(30px) Scale(0.9);
}

/* Responsive */
@media (max-width: 800px) {
  .toast-stack {
    top: 20px;
    bottom: auto;
    left: auto;
    right: 20px;
    max-width: calc(100vw - 40px);
    align-items: flex-end;
    z-index: var(--z-max-value); // Ensure it's above EVERYTHING
  }
}
</style>
