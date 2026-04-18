<script setup lang="js">
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()

const handleConfirm = () => {
  uiStore.closePrompt(true)
}

const handleCancel = () => {
  uiStore.closePrompt(false)
}
</script>

<template>
  <Transition name="prompt-fade">
    <div 
      v-if="uiStore.promptDialog.open" 
      class="prompt-overlay"
      @click.self="handleCancel"
    >
      <div class="prompt-box glass-morphism animate-pop">
        <header class="prompt-header">
          <span class="prompt-icon">⌨️</span>
          <h3>{{ uiStore.promptDialog.title }}</h3>
        </header>
        
        <div class="prompt-body">
          <p v-if="uiStore.promptDialog.message">
            {{ uiStore.promptDialog.message }}
          </p>
          <input 
            v-model="uiStore.promptDialog.value"
            :type="uiStore.promptDialog.type"
            class="prompt-input"
            autofocus
            @keyup.enter="handleConfirm"
          >
        </div>
        
        <footer class="prompt-footer">
          <button 
            class="btn-cancel" 
            @click="handleCancel"
          >
            CANCELAR
          </button>
          <button 
            class="btn-confirm" 
            @click="handleConfirm"
          >
            CONFIRMAR
          </button>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.prompt-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 20001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.prompt-box {
  width: min(400px, 100%);
  background: #111;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.glass-morphism {
  background: rgba(20, 20, 20, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.prompt-header {
  padding: 24px 24px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  
  h3 {
    margin: 0;
    font-family: 'Press Start 2P', cursive;
    font-size: 12px;
    color: var(--yellow);
  }
}

.prompt-body {
  padding: 0 24px 24px;
  
  p {
    margin: 0 0 16px;
    font-size: 14px;
    color: #ccc;
    font-family: 'Inter', sans-serif;
  }
  
  .prompt-input {
    width: 100%;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 12px 16px;
    color: #fff;
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    outline: none;
    
    &:focus {
      border-color: var(--yellow);
      box-shadow: 0 0 0 2px rgba(255, 214, 10, 0.2);
    }
  }
}

.prompt-footer {
  padding: 16px 24px 24px;
  display: flex;
  gap: 12px;
  
  button {
    flex: 1;
    padding: 14px;
    border: none;
    border-radius: 12px;
    font-size: 9px;
    font-weight: 700;
    font-family: 'Press Start 2P', cursive;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-cancel {
    background: rgba(255, 255, 255, 0.05);
    color: #888;
    &:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
  }
  
  .btn-confirm {
    background: var(--yellow);
    color: #000;
    &:hover { background: #ffd60a; }
  }
}

/* Animations */
.prompt-fade-enter-active, .prompt-fade-leave-active {
  transition: opacity 0.3s ease;
}
.prompt-fade-enter-from, .prompt-fade-leave-to {
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
