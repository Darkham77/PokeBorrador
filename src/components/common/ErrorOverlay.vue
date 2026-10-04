<script setup lang="ts">

import { ref, computed } from 'vue'
import { useClipboard } from '@vueuse/core'
import { useGsapTransition } from '@/composables/ui/useGsapTransition'
import { useErrorStore } from '@/stores/errorStore'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { logger } from '@/logic/utils/logger'

const CLIPBOARD_COPIED_DUR_MS = 2000 as const

const errorStore = useErrorStore()
const gameStore = useGameStore()
const uiStore = useUIStore()
const authStore = useAuthStore()
const userAction = ref('')
const { copy, copied } = useClipboard({ copiedDuring: CLIPBOARD_COPIED_DUR_MS })

const accumulatedDetails = computed(() => {
  return errorStore.errors.map((err, index) => {
    return `[ERROR ${index + 1}/${errorStore.errors.length}] (${err.type || 'Uncaught'} - ${err.source || 'N/A'})\nMessage: ${err.message}\nStack:\n${err.stack}`
  }).join('\n\n----------------------------------------\n\n')
})

const copyError = async () => {
  if (errorStore.errors.length === 0) return
  
  const report = [ // no-domain: Non-domain utility collection or data structure
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
    await copy(report)
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
            <span class="emoji error-icon">⚠️</span>
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
              <span class="emoji">✕</span> CERRAR
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
  @include gpu-layer;

  position: fixed;
  z-index: var(--z-critical);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background: Rgb(0 0 0 / 90%);
  font-family: var(--font-ui);
  inset: 0;
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(10px);
}

.error-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 600px;
  max-height: 90dvh;
  border: 3px solid var(--red);
  border-radius: 24px;
  background: Rgb(26 26 46 / 100%);
  box-shadow: 0 0 50px Rgb(255 59 59 / 30%);
  overflow: hidden; /* Scrollbars stay inside the border */
}

.error-header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  min-height: 80px;
  padding: 24px 20px;
  background: Linear-Gradient(135deg, var(--red), #c0392b);
  color: white;
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
  @include smooth-scroll;

  min-height: 0;
  padding: 24px;
  color: Rgb(234 234 234 / 100%);
  flex: 1;
}

.error-intro {
  color: Rgb(170 170 170 / 100%);
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 25px;
}

.error-sub-title {
  @include pixelated;

  color: var(--yellow);
  font-size: 9px;
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
    padding: 8px;
    border: 1px solid Rgb(255 255 255 / 20%);
    border-radius: 4px;
    background: Rgb(0 0 0 / 30%);
    color: white;
    font-family: inherit;
    font-size: 0.9em;
    resize: vertical;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: var(--yellow);
    }
  }

  .sub-text {
    color: Rgb(170 170 170 / 100%);
    font-size: 0.8em;
    margin-top: 4px;
  }
}

.error-stack {
  padding: 15px;
  border-radius: 12px;
  background: Rgb(0 0 0 / 30%);
  color: Rgb(187 187 187 / 100%);
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  overflow-x: auto;
  margin-bottom: 25px;
  white-space: pre-wrap;
  word-break: break-all;
}


.error-game-context {
  padding: 15px;
  border-radius: 12px;
  background: Rgb(255 255 255 / 5%);
  margin-bottom: 24px;
}

.error-context-item {
  color: Rgb(204 204 204 / 100%);
  font-size: 13px;
  margin-bottom: 6px;

  strong {
    color: var(--purple);
  }
}

.error-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  background: Rgb(0 0 0 / 20%);
}
</style>
