<script setup lang="ts">

import { ref, computed } from 'vue'
import gsap from 'gsap'
import { useGsapTransition } from '@/composables/ui/useGsapTransition'
import { useErrorStore } from '@/stores/errorStore'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { logger } from '@/logic/utils/logger'

const errorStore = useErrorStore()
const gameStore = useGameStore()
const uiStore = useUIStore()
const authStore = useAuthStore()
const userAction = ref('')
const copied = ref(false)

const accumulatedDetails = computed(() => {
  return errorStore.errors.map((err, index) => {
    return `[ERROR ${index + 1}/${errorStore.errors.length}] (${err.type || 'Uncaught'} - ${err.source || 'N/A'})\nMessage: ${err.message}\nStack:\n${err.stack}`
  }).join('\n\n----------------------------------------\n\n')
})

const copyError = async () => {
  if (errorStore.errors.length === 0) return
  
  const report = [ // no-domain
    'POKEBORRADOR ERROR REPORT',
    '',
    `¿QUÉ ESTABA HACIENDO EL JUGADOR?`,
    userAction.value || 'No especificado',
    '',
    'CONTEXTO DEL JUEGO:',
    `Entrenador: ${gameStore.state.trainer || authStore.user?.user_metadata?.username || 'N/A'} (Nv. ${gameStore.state.trainerLevel || 0})`,
    `Medallas: ${gameStore.state.badges || 0}`,
    '',
    'ERRORES DETECTADOS:',
    accumulatedDetails.value
  ].join('\n')

  try {
    await navigator.clipboard.writeText(report)
    copied.value = true
    gsap.delayedCall(2, () => {
      copied.value = false
    })
  } catch (err) {
    logger.error('ErrorOverlay', 'Failed to copy error report', err)
  }
}

const reloadGame = () => {
  window.location.reload()
}

const closeError = () => {
  userAction.value = ''
  errorStore.clearError()
  uiStore.closeAll() // Restore background block by clearing the stack
}

const ERROR_OVERLAY_TRANSITION_Y_OFFSET_PX = 10

const transitionHooks = useGsapTransition({
  type: 'slide-up',
  yOffset: ERROR_OVERLAY_TRANSITION_Y_OFFSET_PX,
  duration: 0.3
})
</script>

<template>
  <Teleport to="body">
    <Transition
      :css="false"
      v-on="transitionHooks"
    >
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

            <div class="error-user-action-container">
              <label
                for="error-overlay-user-action"
                class="error-sub-title error-label-block"
              >
                ¿QUÉ ESTABAS HACIENDO?
                <textarea
                  id="error-overlay-user-action"
                  v-model="userAction"
                  placeholder="Ej: Estaba por cambiar de Pokémon en batalla..."
                />
              </label>
              <div class="sub-text">
                Esta información nos ayuda a reproducir and arreglar el error más rápido.
              </div>
            </div>

            <div class="error-stack-wrap">
              <div class="error-sub-title">
                DETALLES TÉCNICOS:
              </div>
              <pre class="error-stack modal-scrollable-content">{{ accumulatedDetails }}</pre>
            </div>

            <div class="error-game-context">
              <div class="error-sub-title">
                ESTADO DEL JUEGO:
              </div>
              <div class="error-context-item">
                <strong>Entrenador:</strong> {{ gameStore.state.trainer || authStore.user?.user_metadata?.username || 'N/A' }} (Nv. {{ gameStore.state.trainerLevel || 0 }})
              </div>
              <div class="error-context-item">
                <strong>Medallas:</strong> {{ gameStore.state.badges || 0 }}
              </div>
            </div>
          </div>

          <div class="error-footer">
            <button
              class="btn-vicio-secondary btn-vicio-sm"
              @click.stop="copyError"
            >
              <i
                class="fas"
                :class="copied ? 'fa-check' : 'fa-copy'"
              />
              {{ copied ? '¡COPIADO!' : 'COPIAR ERROR' }}
            </button>
            <button
              class="btn-vicio-primary btn-vicio-sm"
              @click.stop="reloadGame"
            >
              <i class="fas fa-sync" /> REINICIAR JUEGO
            </button>
            <button
              class="btn-vicio-neutral btn-vicio-sm"
              @click.stop="closeError"
            >
              ✕ CERRAR
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
/* RESTORING EXACT LEGACY ERROR OVERLAY STYLES */
.error-overlay {
  position: fixed;
  inset: 0;
  background: Rgba(0, 0, 0, 0.9);
  z-index: var(--z-critical);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(10px);
  font-family: var(--font-ui);
  @include gpu-layer;
}

.error-card {
  background: Rgba(26, 26, 46, 1);
  border: 3px solid var(--red);
  border-radius: 24px;
  width: 100%;
  max-width: 600px;
  max-height: 90dvh;
  box-shadow: 0 0 50px Rgba(255, 59, 59, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Scrollbars stay inside the border */
}

.error-header {
  background: Linear-Gradient(135deg, var(--red), #c0392b);
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
  @include pixelated;
  font-size: 14px;
  letter-spacing: 1px;
}

.error-content {
  flex: 1;
  padding: 24px;
  color: Rgba(234, 234, 234, 1);
  min-height: 0;
  @include smooth-scroll;
}

.error-intro {
  font-size: 14px;
  margin-bottom: 25px;
  line-height: 1.5;
  color: Rgba(170, 170, 170, 1);
}

.error-message-box {
  background: Rgba(255, 59, 59, 0.1);
  border-left: 4px solid var(--red);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 25px;
  font-weight: 700;
  color: Rgba(255, 128, 128, 1);
  font-size: 13px;
  font-family: 'Courier New', Courier, monospace;
}

.error-sub-title {
  @include pixelated;
  font-size: 9px;
  color: var(--yellow);
  margin-bottom: 10px;
}

.error-user-action-container {
  margin-top: 15px;
  margin-bottom: 15px;

  .error-label-block {
    display: block;
    cursor: default;
  }

  textarea {
    width: 100%;
    height: 60px;
    background: Rgba(0, 0, 0, 0.3);
    border: 1px solid Rgba(255, 255, 255, 0.2);
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
    color: Rgba(170, 170, 170, 1);
    margin-top: 4px;
  }
}

.error-stack {
  background: Rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 12px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  color: Rgba(187, 187, 187, 1);
  overflow-x: auto;
  margin-bottom: 25px;
  white-space: pre-wrap;
  word-break: break-all;
}


.error-game-context {
  background: Rgba(255, 255, 255, 0.05);
  padding: 15px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.error-context-item {
  font-size: 13px;
  margin-bottom: 6px;
  color: Rgba(204, 204, 204, 1);

  strong {
    color: var(--purple);
  }
}

.error-footer {
  padding: 20px;
  background: Rgba(0, 0, 0, 0.2);
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
</style>
