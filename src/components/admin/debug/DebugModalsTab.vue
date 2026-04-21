<script setup>
import { ref } from 'vue'
import { useModalStore } from '@/stores/modals'

const modalStore = useModalStore()
const modalCount = ref(5)
const isTesting = ref(false)

async function startTest() {
  if (isTesting.value) return
  isTesting.value = true
  
  for (let i = 1; i <= modalCount.value; i++) {
    modalStore.open('DebugStackTest', { number: i })
    if (i < modalCount.value) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  isTesting.value = false
}
</script>

<template>
  <div class="debug-tab">
    <div class="debug-group">
      <label>CANTIDAD DE MODALS</label>
      <div class="input-row">
        <input 
          v-model.number="modalCount" 
          type="number" 
          min="1" 
          max="20"
        >
        <button 
          class="btn-primary" 
          :disabled="isTesting"
          @click="startTest"
        >
          {{ isTesting ? 'PROCESANDO...' : 'INICIAR TEST' }}
        </button>
      </div>
      <p class="hint">
        Se abrirán {{ modalCount }} ventanas con 1s de desfase.
      </p>
    </div>

    <div class="debug-group">
      <label>ACCIONES RÁPIDAS</label>
      <button
        class="btn-danger"
        @click="modalStore.closeAll"
      >
        CERRAR TODO
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.debug-tab {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.debug-group {
  display: flex;
  flex-direction: column;
  gap: 12px;

  label {
    font-family: 'Press Start 2P', cursive;
    font-size: 8px;
    color: #94a3b8;
    @include pixelated;
  }
}

.input-row {
  display: flex;
  gap: 10px;

  input {
    flex: 1;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #fff;
    padding: 12px 15px;
    height: 40px;
    font-family: 'Press Start 2P', cursive;
    font-size: 10px;
    @include pixelated;
    outline: none;
    line-height: 1;

    &:focus { border-color: #7c3aed; }
  }
}

.btn-primary {
  padding: 12px 20px;
  background: #7c3aed;
  color: white;
  border: none;
  border-radius: 12px;
  font-family: 'Press Start 2P', cursive;
  font-size: 8px;
  @include pixelated;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #6d28d9;
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-danger {
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 12px;
  font-family: 'Press Start 2P', cursive;
  font-size: 8px;
  @include pixelated;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: translateY(-2px);
  }
}

.hint {
  font-size: 10px;
  color: #94a3b8;
  margin: 0;
  line-height: 1.4;
}
</style>
