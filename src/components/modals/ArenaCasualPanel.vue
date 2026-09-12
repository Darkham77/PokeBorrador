<script setup lang="ts">
import { ref } from 'vue';
import { useClipboard } from '@vueuse/core';
import { useLivePvPStore } from '@/stores/livePvP';
import { useUIStore } from '@/stores/ui';
import { formatRoomCode, isValidRoomCode } from '@/logic/pvp/pvpRoomCodeHelper';
import type { PvpMatchFormat, PvpLevelRule, PvpRoomCode } from '@/types/battle/pvp';

const livePvP = useLivePvPStore();
const ui = useUIStore();
const { copy } = useClipboard();

const selectedFormat = ref<PvpMatchFormat>('3v3');
const selectedLevelRule = ref<PvpLevelRule>('flat50');
const joinCodeInput = ref('');
const isCreating = ref(false);
const isJoining = ref(false);

async function handleCreateRoom() {
  if (isCreating.value) return;
  isCreating.value = true;
  try {
    const code = await livePvP.createRoom({
      format: selectedFormat.value,
      levelRule: selectedLevelRule.value,
      arena: { gymId: 'celadon' },
      mode: 'casual'
    });
    if (code) {
      ui.notify(`¡Sala creada! Comparte el código ${code}`, '🔑');
    }
  } finally {
    isCreating.value = false;
  }
}

async function handleCancelRoom() {
  await livePvP.cancelRoom();
  ui.notify('Sala cancelada.', '🛑');
}

async function handleJoinRoom() {
  const code = formatRoomCode(joinCodeInput.value);
  if (!isValidRoomCode(code)) {
    ui.notify('El código debe tener 4 caracteres válidos.', '⚠️');
    return;
  }
  isJoining.value = true;
  try {
    const success = await livePvP.joinRoom(code as PvpRoomCode);
    if (success) {
      ui.notify('¡Conectando a la sala!', '⚡');
    }
  } finally {
    isJoining.value = false;
  }
}

async function copyRoomCode() {
  if (livePvP.activeRoomCode) {
    await copy(livePvP.activeRoomCode);
    ui.notify('¡Código copiado al portapapeles!', '📋');
  }
}
</script>

<template>
  <div class="arena-casual-panel">
    <!-- Rule Configuration Card -->
    <section class="rules-config-card">
      <div class="card-header">
        <span class="header-icon"><span class="emoji">⚔️</span></span>
        <div class="header-text">
          <h3 class="panel-subtitle text-outline">
            REGLAS DEL DUELO
          </h3>
          <p class="panel-desc">
            Formato y límite de nivel para salas personalizadas
          </p>
        </div>
      </div>

      <div class="config-grid">
        <div class="config-row">
          <span class="config-label">Formato de Combate:</span>
          <div class="pill-group">
            <button
              v-gsap-hover="'button'"
              class="rule-pill-btn"
              :class="{ active: selectedFormat === '3v3' }"
              @click="selectedFormat = '3v3'"
            >
              <span class="pill-icon"><span class="emoji">⚡</span></span>
              <span>3 vs 3 (Singles)</span>
            </button>
            <button
              v-gsap-hover="'button'"
              class="rule-pill-btn"
              :class="{ active: selectedFormat === '6v6' }"
              @click="selectedFormat = '6v6'"
            >
              <span class="pill-icon"><span class="emoji">💥</span></span>
              <span>6 vs 6 (Completo)</span>
            </button>
          </div>
        </div>

        <div class="config-row">
          <span class="config-label">Ajuste de Nivel:</span>
          <div class="pill-group">
            <button
              v-gsap-hover="'button'"
              class="rule-pill-btn"
              :class="{ active: selectedLevelRule === 'flat50' }"
              @click="selectedLevelRule === 'flat50'"
            >
              <span class="pill-icon"><span class="emoji">⚖️</span></span>
              <span>Nivel 50 Igualado</span>
            </button>
            <button
              v-gsap-hover="'button'"
              class="rule-pill-btn"
              :class="{ active: selectedLevelRule === 'real' }"
              @click="selectedLevelRule === 'real'"
            >
              <span class="pill-icon"><span class="emoji">📈</span></span>
              <span>Nivel Real</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Room Code Arena Section -->
    <section class="room-code-card">
      <div class="card-header">
        <span class="header-icon"><span class="emoji">🔑</span></span>
        <div class="header-text">
          <h3 class="panel-subtitle text-outline">
            SALA CON CÓDIGO (LAN / ONLINE)
          </h3>
          <p class="panel-desc">
            Juega contra un amigo al instante compartiendo un código único
          </p>
        </div>
      </div>

      <!-- Active Room Display -->
      <div
        v-if="livePvP.activeRoomCode"
        class="active-room-box"
      >
        <div class="room-active-header">
          <span class="active-badge text-outline">
            <span class="pulse-dot" />
            SALA DE ESPERA ACTIVA
          </span>
        </div>

        <div class="code-banner">
          <span class="code-label">CÓDIGO DE SALA</span>
          <div class="code-display-wrap">
            <span class="code-number text-outline">{{ livePvP.activeRoomCode }}</span>
            <button
              v-gsap-hover="'button'"
              class="copy-btn"
              @click="copyRoomCode"
            >
              <span class="emoji">📋</span> COPIAR
            </button>
          </div>
        </div>

        <div class="waiting-indicator">
          <span class="spinner-emoji"><span class="emoji">⏳</span></span>
          <span>Esperando a que el rival ingrese el código para iniciar...</span>
        </div>

        <button
          v-gsap-hover="'button'"
          class="cancel-room-btn"
          @click="handleCancelRoom"
        >
          CANCELAR SALA
        </button>
      </div>

      <!-- Action Choice: Create or Join -->
      <div
        v-else
        class="room-actions-grid"
      >
        <div class="action-box create-box">
          <div class="box-top">
            <div class="box-icon-title">
              <span class="box-icon"><span class="emoji">🎲</span></span>
              <h4 class="text-outline">
                CREAR SALA
              </h4>
            </div>
            <p class="box-desc">
              Genera un código de 4 caracteres con tus reglas seleccionadas y compártelo con tu rival.
            </p>
          </div>
          <button
            v-gsap-hover="'button'"
            class="action-btn create-btn"
            :disabled="isCreating"
            @click="handleCreateRoom"
          >
            <span class="emoji icon">✨</span>
            {{ isCreating ? 'CREANDO...' : 'CREAR SALA' }}
          </button>
        </div>

        <div class="action-box join-box">
          <div class="box-top">
            <div class="box-icon-title">
              <span class="box-icon"><span class="emoji">🚪</span></span>
              <h4 class="text-outline">
                UNIRSE A SALA
              </h4>
            </div>
            <p class="box-desc">
              Ingresa el código que te compartió tu rival para unirte a su combate de inmediato.
            </p>
          </div>
          <div class="join-input-wrap">
            <input
              v-model="joinCodeInput"
              type="text"
              maxlength="4"
              placeholder="Ej: 7ABC"
              class="code-input text-outline"
              @input="joinCodeInput = joinCodeInput.toUpperCase()"
              @keyup.enter="handleJoinRoom"
            >
            <button
              v-gsap-hover="'button'"
              class="action-btn join-btn"
              :disabled="joinCodeInput.length !== 4 || isJoining"
              @click="handleJoinRoom"
            >
              {{ isJoining ? '...' : 'UNIRSE' }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
@use "@/styles/core/_mixins" as *;

$gray: #94a3b8;

.arena-casual-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0;

  .rules-config-card,
  .room-code-card {
    background: Rgba(255, 255, 255, 0.02);
    border: 1px solid Rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    padding: 16px;
    box-shadow: inset 0 0 12px Rgba(255, 255, 255, 0.02);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;

    .header-icon {
      font-size: 16px;
      display: inline-flex;
      align-items: center;
    }

    .header-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .panel-subtitle {
      font-size: 9px;
      font-weight: 800;
      color: var(--white, #fff);
      margin: 0;
      @include pixelated;
      letter-spacing: 0.5px;
    }

    .panel-desc {
      font-size: 8px;
      color: $gray;
      margin: 0;
      line-height: 1.4;
    }
  }

  .config-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .config-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    @media (max-width: 600px) {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .config-label {
      font-size: 8px;
      color: $gray;
      font-weight: 600;
      @include pixelated;
    }

    .pill-group {
      display: flex;
      gap: 8px;

      .rule-pill-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: Rgba(0, 0, 0, 0.35);
        border: 1px solid Rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 6px 12px;
        color: $gray;
        font-size: 8px;
        @include pixelated;
        cursor: pointer;

        .pill-icon {
          font-size: 10px;
          display: inline-flex;
          align-items: center;
        }

        &.active {
          background: Rgba(59, 130, 246, 0.18);
          border-color: var(--blue-light, #29b6f6);
          color: var(--white, #fff);
          box-shadow: 0 0 10px Rgba(41, 182, 246, 0.25), inset 0 0 6px Rgba(41, 182, 246, 0.15);
        }
      }
    }
  }

  .active-room-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 18px;
    background: radial-gradient(circle at 50% 30%, Rgba(2, 136, 209, 0.15) 0%, Rgba(0, 0, 0, 0.4) 100%);
    border: 1px solid var(--blue-light, #29b6f6);
    border-radius: 12px;
    box-shadow: 0 0 20px Rgba(41, 182, 246, 0.15), inset 0 0 15px Rgba(41, 182, 246, 0.08);

    .room-active-header {
      .active-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: Rgba(34, 197, 94, 0.15);
        border: 1px solid Rgba(34, 197, 94, 0.4);
        border-radius: 12px;
        padding: 3px 10px;
        font-size: 7.5px;
        color: #4ade80;
        @include pixelated;

        .pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 6px #4ade80;
        }
      }
    }

    .code-banner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;

      .code-label {
        font-size: 7.5px;
        color: $gray;
        @include pixelated;
        letter-spacing: 0.5px;
      }

      .code-display-wrap {
        display: flex;
        align-items: center;
        gap: 12px;

        .code-number {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 4px;
          color: var(--yellow, #ffd700);
          @include pixelated;
          filter: Drop-Shadow(0 0 10px Rgba(255, 215, 0, 0.4));
        }

        .copy-btn {
          @include btn-vicio('secondary', 'sm');
          font-size: 7.5px;
          padding: 4px 10px;
          gap: 4px;
        }
      }
    }

    .waiting-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 8px;
      color: $gray;
      @include pixelated;

      .spinner-emoji {
        font-size: 12px;
      }
    }

    .cancel-room-btn {
      @include btn-vicio('danger', 'sm');
      font-size: 8px;
      padding: 6px 16px;
    }
  }

  .room-actions-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    @media (max-width: 600px) {
      grid-template-columns: 1fr;
    }

    .action-box {
      background: Rgba(0, 0, 0, 0.3);
      border: 1px solid Rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 14px;
      box-shadow: inset 0 0 10px Rgba(0, 0, 0, 0.3);

      .box-top {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .box-icon-title {
        display: flex;
        align-items: center;
        gap: 8px;

        .box-icon {
          font-size: 14px;
          display: inline-flex;
          align-items: center;
        }

        h4 {
          margin: 0;
          font-size: 8.5px;
          color: var(--white, #fff);
          @include pixelated;
          letter-spacing: 0.5px;
        }
      }

      .box-desc {
        font-size: 8px;
        color: $gray;
        margin: 0;
        line-height: 1.4;
      }

      .action-btn {
        &.create-btn {
          @include btn-vicio('primary', 'md', true);
          font-size: 8px;
          gap: 6px;
        }

        &.join-btn {
          @include btn-vicio('success', 'md');
          font-size: 8px;
          padding: 6px 16px;
        }
      }

      .join-input-wrap {
        display: flex;
        gap: 8px;
        align-items: center;

        .code-input {
          flex: 1;
          min-width: 0;
          height: 32px;
          background: Rgba(0, 0, 0, 0.6);
          border: 1px solid Rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          color: var(--yellow, #ffd700);
          @include pixelated;
          font-size: 11px;
          font-weight: 800;
          text-align: center;
          letter-spacing: 2px;
          text-transform: uppercase;
          padding: 0 8px;
          box-shadow: inset 0 2px 4px Rgba(0, 0, 0, 0.5);

          &:focus {
            outline: none;
            border-color: var(--yellow, #ffd700);
            box-shadow: 0 0 10px Rgba(255, 215, 0, 0.25), inset 0 2px 4px Rgba(0, 0, 0, 0.5);
          }
        }
      }
    }
  }
}
</style>
