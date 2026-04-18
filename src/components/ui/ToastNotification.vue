<script setup>
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()
</script>

<template>
  <div
    id="notification-stack"
    class="toast-stack"
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
</template>

<style scoped lang="scss">
.toast-stack {
  position: fixed;
  top: 100px; // Below HUD
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 9999;
  pointer-events: none;
  max-width: 300px;
}

.toast-item {
  pointer-events: all;
  background: rgba(15, 15, 15, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-left: 4px solid var(--yellow, #f1c40f);
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Nunito', sans-serif;
  color: white;
  font-size: 14px;
  font-weight: 700;
  
  .toast-icon {
    font-size: 18px;
    flex-shrink: 0;
  }
  
  .toast-msg {
    line-height: 1.4;
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
  transform: translateX(30px) scale(0.9);
}

/* Responsive */
@media (max-width: 768px) {
  .toast-stack {
    top: auto;
    bottom: 100px;
    left: 20px;
    right: 20px;
    max-width: none;
  }
}
</style>
