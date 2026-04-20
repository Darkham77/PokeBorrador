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
    `Origen: ${error.source || 'N/A'} (${error.lineno || '?'}:${error.colno || '?'})`,
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
  <Teleport to="body">
    <div
      v-if="errorStore.activeError"
      class="error-overlay"
    >
      <div class="error-card modal-scrollable-content">
        <div class="error-header">
          <span class="error-icon">⚠️</span>
          <div class="error-title">
            ERROR EN EL JUEGO
          </div>
        </div>

        <div class="error-content custom-scrollbar modal-scrollable-content">
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
            <pre class="error-stack modal-scrollable-content">{{ errorStore.activeError.stack }}</pre>
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
            class="error-btn copy-btn"
            @click="copyError"
          >
            <i
              class="fas"
              :class="copied ? 'fa-check' : 'fa-copy'"
            />
            {{ copied ? '¡COPIADO!' : 'COPIAR ERROR' }}
          </button>
          <button
            class="error-btn reload-btn"
            @click="reloadGame"
          >
            <i class="fas fa-sync" /> REINICIAR JUEGO
          </button>
          <button
            class="error-btn close-btn"
            @click="errorStore.clearError"
          >
            ✕ CERRAR
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
/* RESTORING EXACT LEGACY ERROR OVERLAY STYLES */
.error-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(10px);
  animation: fadeIn 0.3s ease;
  font-family: 'Nunito', sans-serif;
}

.error-card {
  background: #1a1a2e;
  border: 3px solid var(--red);
  border-radius: 24px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  box-shadow: 0 0 50px rgba(255, 59, 59, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Scrollbars stay inside the border */
}

.error-header {
  background: linear-gradient(135deg, var(--red), #c0392b);
  padding: 24px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  color: white;
  min-height: 80px;
  box-sizing: border-box;
}

.error-icon {
  font-size: 32px;
}

.error-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  letter-spacing: 1px;
}

.error-content {
  flex: 1;
  padding: 24px;
  color: #eaeaea;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 0 0 20px 0;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--red);
    border-radius: 10px;
    border: 2px solid #1a1a2e;
  }
}

.error-intro {
  font-size: 14px;
  margin-bottom: 25px;
  line-height: 1.5;
  color: #aaa;
}

.error-message-box {
  background: rgba(255, 59, 59, 0.1);
  border-left: 4px solid var(--red);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 25px;
  font-weight: 700;
  color: #ff8080;
  font-size: 13px;
}

.error-sub-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--yellow);
  margin-bottom: 10px;
}

.error-user-action-container {
  margin-top: 15px;
  margin-bottom: 15px;

  textarea {
    width: 100%;
    height: 60px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 8px;
    border-radius: 4px;
    resize: vertical;
    font-family: inherit;
    font-size: 0.9em;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: var(--yellow);
    }
  }

  .sub-text {
    font-size: 0.8em;
    color: #aaa;
    margin-top: 4px;
  }
}

.error-stack {
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 12px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  color: #bbb;
  overflow-x: auto;
  margin-bottom: 25px;
  max-height: 200px;
  white-space: pre-wrap;
  word-break: break-all;
}

.error-game-context {
  background: rgba(255, 255, 255, 0.05);
  padding: 15px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.error-context-item {
  font-size: 13px;
  margin-bottom: 6px;
  color: #ccc;

  strong {
    color: var(--purple);
  }
}

.error-footer {
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.error-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.copy-btn {
  background: var(--purple);
  color: white;
}

.reload-btn {
  background: var(--yellow);
  color: #000;
}

.close-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #aaa;
}

.error-btn:hover {
  transform: translateY(-2px);
  filter: brightness(1.2);
}

@media (max-width: 480px) {
  .error-footer {
    flex-direction: column;
  }
  .error-btn {
    width: 100%;
  }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
