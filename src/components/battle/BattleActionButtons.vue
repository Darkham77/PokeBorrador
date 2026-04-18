<script setup>
const props = defineProps({
  isFinishing: { type: Boolean, default: false }
})

const emit = defineEmits(['switch', 'bag', 'run', 'catch'])
</script>

<template>
  <div class="actions-container">
    <div class="action-row-complex">
      <button
        class="legacy-action-btn switch"
        @click="emit('switch')"
      >
        <span class="icon">🔄</span> CAMBIAR
      </button>

      <div class="catch-btn-wrapper">
        <button
          class="btn-catch-ball"
          title="Capturar"
          @click="emit('catch')"
        >
          <span>CAPTURAR</span>
        </button>
      </div>

      <button
        class="legacy-action-btn bag"
        @click="emit('bag')"
      >
        <span class="icon">🎒</span> MOCHILA
      </button>
    </div>
    
    <button
      v-if="!isFinishing"
      class="huir-button"
      @click="emit('run')"
    >
      🏃 HUIR
    </button>
  </div>
</template>

<style scoped lang="scss">
.actions-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-row-complex {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px;
  align-items: center;
}

.legacy-action-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  padding: 15px;
  color: #fff;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.2s;
}

.legacy-action-btn.switch { border-color: var(--purple); color: var(--purple-light); }
.legacy-action-btn.bag { border-color: var(--green); color: var(--green-light); }
.legacy-action-btn:hover { background: rgba(255,255,255,0.1); }

/* The Iconic Pokeball Button */
.btn-catch-ball {
  width: 80px;
  height: 80px;
  border-radius: 50% !important;
  background: #fff !important;
  position: relative;
  border: 4px solid #333 !important;
  box-shadow: 0 10px 20px rgba(0,0,0,0.4), inset 0 -4px 0 rgba(0,0,0,0.1) !important;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  overflow: hidden;
  padding: 0;
}

.btn-catch-ball::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 50%;
  background: #ef5350;
  border-bottom: 4px solid #333;
}

.btn-catch-ball::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  background: #fff;
  border: 4px solid #333;
  border-radius: 50%;
  z-index: 10;
  box-shadow: 0 0 0 4px #fff, 0 0 15px rgba(0,0,0,0.2);
}

.btn-catch-ball:hover {
  transform: #{"Scale(1.15)"} rotate(15deg);
  box-shadow: 0 15px 30px rgba(0,0,0,0.5);
}

.btn-catch-ball span { display: none; }

.huir-button {
  width: 100%;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 10px;
  color: var(--orange);
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
}
</style>
