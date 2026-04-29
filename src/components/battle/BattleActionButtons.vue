<script setup>
const _props = defineProps({
  isFinishing: { type: Boolean, default: false }
})

const emit = defineEmits(['switch', 'bag', 'run', 'catch'])
</script>

<template>
  <div class="actions-container">
    <div class="action-row-complex">
      <button
        class="btn-vicio-secondary switch"
        @click.stop="emit('switch')"
      >
        <span class="icon">🔄</span> CAMBIAR
      </button>

      <div class="catch-btn-wrapper">
        <button
          class="btn-catch-ball"
          @click.stop="emit('catch')"
        >
          <span>CAPTURAR</span>
        </button>
      </div>

      <button
        class="btn-vicio-success bag"
        @click.stop="emit('bag')"
      >
        <span class="icon">🎒</span> MOCHILA
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.actions-container {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: visible;
  position: relative;
  z-index: var(--z-low);
}

.action-row-complex {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
  overflow: visible;

  .btn-vicio-secondary, .btn-vicio-success {
    padding: 10px 16px;
    font-size: 8px;
    border-radius: 10px;
  }
}

.catch-btn-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px; 
  height: 64px;
  position: relative;
  z-index: var(--z-low);
  flex-shrink: 0; 
  overflow: visible;
}

/* The Iconic Pokeball Button */
.btn-catch-ball {
  width: 64px;
  height: 64px;
  border-radius: 50% !important;
  background: $white !important;
  position: absolute; 
  inset: 0;
  margin: auto; // Centrado perfecto para elementos absolutos con tamaño fijo
  border: 3px solid #333 !important;
  box-shadow: 0 6px 15px Rgba(0,0,0,0.4), inset 0 -3px 0 Rgba(0,0,0,0.1) !important;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  overflow: hidden;
  padding: 0;
  z-index: var(--z-base);
  transform: TranslateZ(0); 
  transform-origin: center center; // ROTACIÓN SOBRE SU CENTRO
  backface-visibility: hidden;
}

.btn-catch-ball::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 50%;
  background: Rgba(239, 83, 80, 1);
  border-bottom: 3px solid #333;
}

.btn-catch-ball::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: Translate(-50%, -50%);
  width: 18px;
  height: 18px;
  background: $white;
  border: 3px solid #333;
  border-radius: 50%;
  z-index: var(--z-low);
  box-shadow: 0 0 0 3px $white, 0 0 10px Rgba(0,0,0,0.2);
}

.btn-catch-ball:hover {
  // Escala y rotación reducidas para máxima compatibilidad
  transform: Scale(1.1) TranslateY(-8px) Rotate(10deg); 
  box-shadow: 0 12px 30px Rgba(0,0,0,0.5);
  z-index: var(--z-low);

  @media (max-width: 600px) {
    transform: Scale(1.05) TranslateY(-4px) Rotate(5deg);
  }
}

.btn-catch-ball span { display: none; }


</style>
