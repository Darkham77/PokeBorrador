<script setup lang="ts">
const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'unlockAll'): void
  (e: 'giveAllMOs'): void
  (e: 'hardReset'): void
  (e: 'close'): void
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.show"
      class="adv-modal-overlay"
      @click.self="emit('close')"
    >
      <div class="adv-modal-card border-purple">
        <div class="adv-modal-header header-purple">
          <span class="icon">🐛</span> MENÚ DE DESARROLLO
        </div>

        <div class="adv-modal-body">
          <p class="section-title">
            HERRAMIENTAS DE TESTEO
          </p>

          <div class="debug-actions-list">
            <button
              class="debug-btn"
              @click="emit('unlockAll')"
            >
              <span class="debug-btn-icon">🗺️</span>
              <div class="debug-btn-content">
                <span class="debug-btn-title">Descubrir todo Kanto</span>
                <span class="debug-btn-desc">Desbloquea todos los nodos y ciudades del croquis</span>
              </div>
            </button>

            <button
              class="debug-btn"
              @click="emit('giveAllMOs')"
            >
              <span class="debug-btn-icon">🎒</span>
              <div class="debug-btn-content">
                <span class="debug-btn-title">Obtener todas las MOs y Bici</span>
                <span class="debug-btn-desc">Corte, Surf, Vuelo, Flauta y Bicicleta</span>
              </div>
            </button>

            <button
              class="debug-btn-danger"
              @click="emit('hardReset')"
            >
              <span class="debug-btn-icon">🗑️</span>
              <div class="debug-btn-content">
                <span class="debug-btn-title">REINICIAR UBICACIÓN Y MAPA</span>
                <span class="debug-btn-desc">Borra la posición local y reinicia la aventura</span>
              </div>
            </button>
          </div>
        </div>

        <div class="adv-modal-footer">
          <button
            class="adv-btn-close btn-purple"
            @click="emit('close')"
          >
            Cerrar Debug
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.adv-modal-overlay {
  position: fixed;
  inset: 0;
  width: dvw;
  height: 100dvh;
  background: Rgba(5, 10, 20, 0.85);
  backdrop-filter: Blur(8px);
  z-index: 60000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
}

.adv-modal-card {
  width: 100%;
  max-width: 440px;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 40px Rgba(0, 0, 0, 0.8), 0 0 20px Rgba(168, 85, 247, 0.25);
  border: 2px solid #a855f7;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.adv-modal-header {
  padding: 14px 16px;
  font-weight: 900;
  font-size: 1.15rem;
  text-align: center;
  color: #fff;
  letter-spacing: 0.05em;
  @include pixelated;

  &.header-purple {
    background: linear-gradient(180deg, #a855f7 0%, #7e22ce 100%);
    border-bottom: 2px solid #6b21a8;
  }
}

.adv-modal-body {
  padding: 18px 16px;
  max-height: 65dvh;
  overflow-y: auto;
  color: #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 14px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: Rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }
}

.section-title {
  font-size: 0.75rem;
  color: #94a3b8;
  text-align: center;
  font-weight: 800;
  letter-spacing: 0.08em;
  margin: 0;
}

.debug-actions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.debug-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  background: Rgba(30, 41, 59, 0.8);
  border: 1.5px solid Rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 12px 14px;
  color: #f8fafc;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;

  &:hover {
    background: Rgba(168, 85, 247, 0.15);
    border-color: #c084fc;
    transform: Translatey(-2px);
    box-shadow: 0 4px 12px Rgba(168, 85, 247, 0.25);
  }

  &:active {
    transform: Scale(0.98);
  }

  .debug-btn-icon {
    font-size: 1.6rem;
  }

  .debug-btn-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .debug-btn-title {
    font-size: 0.88rem;
    font-weight: 800;
    color: #f8fafc;
  }

  .debug-btn-desc {
    font-size: 0.7rem;
    color: #94a3b8;
  }
}

.debug-btn-danger {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  background: Rgba(127, 29, 29, 0.3);
  border: 1.5px solid Rgba(239, 68, 68, 0.4);
  border-radius: 12px;
  padding: 12px 14px;
  color: #fca5a5;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  margin-top: 4px;

  &:hover {
    background: Rgba(127, 29, 29, 0.5);
    border-color: #ef4444;
    transform: Translatey(-2px);
    box-shadow: 0 4px 14px Rgba(239, 68, 68, 0.3);
  }

  &:active {
    transform: Scale(0.98);
  }

  .debug-btn-icon {
    font-size: 1.6rem;
  }

  .debug-btn-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .debug-btn-title {
    font-size: 0.88rem;
    font-weight: 900;
    color: #fee2e2;
  }

  .debug-btn-desc {
    font-size: 0.7rem;
    color: #fca5a5;
  }
}

.adv-modal-footer {
  padding: 14px 16px;
  background: #0b1120;
  border-top: 1px solid Rgba(255, 255, 255, 0.08);
}

.adv-btn-close {
  width: 100%;
  background: #334155;
  color: white;
  font-weight: 800;
  padding: 12px;
  border-radius: 12px;
  font-size: 0.95rem;
  border: 1.5px solid Rgba(255, 255, 255, 0.15);
  cursor: pointer;
  transition: all 0.2s ease;

  &.btn-purple {
    background: linear-gradient(180deg, #a855f7 0%, #7e22ce 100%);
    color: #fff;
    border-color: #c084fc;
    font-weight: 900;
    box-shadow: 0 4px 12px Rgba(126, 34, 206, 0.35);

    &:hover {
      filter: Brightness(1.1);
    }
  }

  &:active {
    transform: Scale(0.97);
  }
}
</style>
