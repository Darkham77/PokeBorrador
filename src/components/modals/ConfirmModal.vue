<script setup lang="js">
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()

const handleConfirm = () => {
  uiStore.closeConfirm(true)
}

const handleCancel = () => {
  uiStore.closeConfirm(false)
}
</script>

<template>
  <Transition name="confirm-fade">
    <div 
      v-if="uiStore.confirmDialog.open" 
      class="confirm-overlay"
      @click.self="handleCancel"
    >
      <div class="confirm-box glass-morphism animate-pop">
        <header class="confirm-header">
          <span class="confirm-icon">❓</span>
          <h3>{{ uiStore.confirmDialog.title }}</h3>
        </header>
        
        <div class="confirm-body">
          <p>{{ uiStore.confirmDialog.message }}</p>
        </div>
        
        <footer class="confirm-footer">
          <button 
            class="btn-cancel" 
            @click="handleCancel"
          >
            {{ uiStore.confirmDialog.cancelText }}
          </button>
          <button 
            class="btn-confirm" 
            @click="handleConfirm"
          >
            {{ uiStore.confirmDialog.confirmText }}
          </button>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 20000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.confirm-box {
  width: min(400px, 100%);
  background: #111;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.glass-morphism {
  background: rgba(20, 20, 20, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.confirm-header {
  padding: 24px 24px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  
  .confirm-icon {
    font-size: 24px;
  }
  
  h3 {
    margin: 0;
    font-family: 'Press Start 2P', cursive;
    font-size: 14px;
    color: var(--yellow);
    letter-spacing: 1px;
  }
}

.confirm-body {
  padding: 0 24px 24px;
  
  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: #ccc;
    font-family: 'Inter', sans-serif;
  }
}

.confirm-footer {
  padding: 16px 24px 24px;
  display: flex;
  gap: 12px;
  
  button {
    flex: 1;
    padding: 14px;
    border: none;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 700;
    font-family: 'Press Start 2P', cursive;
    cursor: pointer;
    transition: all 0.2s;
    
    &:active {
      transform: scale(0.95);
    }
  }
  
  .btn-cancel {
    background: rgba(255, 255, 255, 0.05);
    color: #888;
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
  }
  
  .btn-confirm {
    background: var(--yellow);
    color: #000;
    box-shadow: 0 4px 15px rgba(255, 214, 10, 0.3);
    &:hover {
      background: #ffd60a;
      box-shadow: 0 6px 20px rgba(255, 214, 10, 0.4);
    }
  }
}

/* Animations */
.confirm-fade-enter-active, .confirm-fade-leave-active {
  transition: opacity 0.3s ease;
}
.confirm-fade-enter-from, .confirm-fade-leave-to {
  opacity: 0;
}

@keyframes pop {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.animate-pop {
  animation: pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>
