<script setup>
import { ref } from 'vue'
import { useErrorStore } from '@/stores/errorStore'
import { useGameStore } from '@/stores/game'

const errorStore = useErrorStore()
const gameStore = useGameStore()
const copied = ref(false)

const copyError = async () => {
  if (!errorStore.activeError) return
  
  const error = errorStore.activeError
  const report = [
    'POKEBORRADOR ERROR REPORT',
    '',
    `¿QUÉ ESTABA HACIENDO EL JUGADOR?`,
    error.userAction || 'No especificado',
    '',
    `MENSAJE: ${error.message}`,
    '',
    'CONTEXTO DEL JUEGO:',
    `Entrenador: ${gameStore.state.trainer || 'N/A'} (Nv. ${gameStore.state.trainerLevel || 0})`,
    `Medallas: ${gameStore.state.badges || 0}`,
    `Tipo: ${error.type}`,
    `Origen: ${error.source} (${error.lineno}:${error.colno})`,
    '',
    'STACK TRACE:',
    error.stack
  ].join('\n')

  try {
    await navigator.clipboard.writeText(report)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy error report:', err)
  }
}

const reloadGame = () => {
  window.location.reload()
}
</script>

<template>
  <div
    v-if="errorStore.activeError"
    class="game-error-overlay"
  >
    <div class="error-card legacy-panel">
      <div class="error-header">
        <span class="error-icon">⚠️</span>
        <div class="error-title">
          ERROR EN EL JUEGO
        </div>
      </div>

      <div class="error-body">
        <p class="error-intro">
          ¡Uy! Algo salió mal. Pasale una captura de esto al desarrollador para que pueda arreglarlo.
        </p>

        <div class="error-message-box">
          <strong>Mensaje:</strong> {{ errorStore.activeError.message }}
        </div>

        <div class="error-user-action-container">
          <div class="error-sub-title">
            ¿QUÉ ESTABAS HACIENDO?
          </div>
          <textarea
            v-model="errorStore.activeError.userAction"
            placeholder="Ej: Estaba por cambiar de Pokémon en batalla..."
          />
          <div class="sub-text">
            Esta información nos ayuda a reproducir y arreglar el error más rápido.
          </div>
        </div>

        <div class="error-stack-wrap">
          <div class="error-sub-title">
            DETALLES TÉCNICOS:
          </div>
          <pre class="error-stack">{{ errorStore.activeError.stack }}</pre>
        </div>

        <div class="error-game-context">
          <div class="error-sub-title">
            ESTADO DEL JUEGO:
          </div>
          <div class="error-context-item">
            <strong>Entrenador:</strong> {{ gameStore.state.trainer || 'N/A' }} (Nv. {{ gameStore.state.trainerLevel || 0 }})
          </div>
          <div class="error-context-item">
            <strong>Medallas:</strong> {{ gameStore.state.badges || 0 }}
          </div>
          <div class="error-context-item">
            <strong>Tipo:</strong> {{ errorStore.activeError.type }}
          </div>
          <div
            v-if="errorStore.activeError.lineno"
            class="error-context-item"
          >
            <strong>Línea:</strong> {{ errorStore.activeError.lineno }}:{{ errorStore.activeError.colno }}
          </div>
        </div>
      </div>

      <div class="error-footer">
        <button
          class="error-btn copy-btn legacy-button"
          :class="{ 'success': copied }"
          @click="copyError"
        >
          <i
            class="fas"
            :class="copied ? 'fa-check' : 'fa-copy'"
          />
          {{ copied ? '¡COPIADO!' : 'COPIAR ERROR' }}
        </button>
        <button
          class="error-btn reload-btn legacy-button"
          @click="reloadGame"
        >
          <i class="fas fa-sync" /> REINICIAR JUEGO
        </button>
        <button
          class="error-btn close-btn legacy-button"
          @click="errorStore.clearError"
        >
          ✕ CERRAR
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.game-error-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
  padding: 20px;
  font-family: 'Press Start 2P', monospace;
  image-rendering: pixelated;
}

.error-card {
  width: 100%;
  max-width: 650px;
  background: #222;
  border: 4px solid #fff;
  padding: 20px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.error-header {
  display: flex;
  align-items: center;
  gap: 15px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 15px;
  margin-bottom: 15px;
}

.error-icon {
  font-size: 32px;
}

.error-title {
  font-size: 18px;
  color: #ff4444;
}

.error-body {
  overflow-y: auto;
  padding-right: 10px;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
  }
  &::-webkit-scrollbar-thumb {
    background: #fff;
  }
}

.error-intro {
  font-size: 10px;
  line-height: 1.6;
  margin-bottom: 15px;
  color: #ccc;
}

.error-message-box {
  background: rgba(255, 68, 68, 0.1);
  border: 2px solid #ff4444;
  padding: 12px;
  font-size: 11px;
  line-height: 1.4;
  margin-bottom: 15px;
  color: #ff8888;
}

.error-user-action-container {
  margin-bottom: 15px;

  textarea {
    width: 100%;
    height: 70px;
    background: #111;
    border: 2px solid #555;
    color: #fff;
    font-family: inherit;
    font-size: 10px;
    padding: 10px;
    margin: 8px 0;
    box-sizing: border-box;
    resize: none;

    &:focus {
      border-color: #fff;
      outline: none;
    }
  }

  .sub-text {
    font-size: 8px;
    color: #888;
  }
}

.error-sub-title {
  font-size: 9px;
  color: #aaa;
  text-transform: uppercase;
  margin-bottom: 5px;
}

.error-stack-wrap {
  margin-bottom: 15px;
}

.error-stack {
  background: #000;
  padding: 10px;
  font-size: 8px;
  color: #ff4444;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid #333;
}

.error-game-context {
  background: rgba(255, 255, 255, 0.05);
  padding: 10px;
  border: 1px dashed #555;
}

.error-context-item {
  font-size: 9px;
  margin-bottom: 5px;
  color: #ccc;

  strong {
    color: #fff;
  }
}

.error-footer {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.error-btn {
  flex: 1;
  min-width: 140px;
  padding: 10px;
  font-size: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &.copy-btn.success {
    background: #4caf50 !important;
    border-color: #2e7d32 !important;
  }

  &.reload-btn {
    background: #2196f3;
    border-color: #1976d2;
  }

  &.close-btn {
    background: #666;
    border-color: #444;
  }
}

@media (max-width: 480px) {
  .error-card {
    padding: 15px;
  }
  .error-btn {
    font-size: 7px;
  }
}
</style>
