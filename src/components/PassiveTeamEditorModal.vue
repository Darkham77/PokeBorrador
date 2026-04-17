<script setup>
const closePassiveTeamEditor = () => {
  if (typeof window.closePassiveTeamEditor === 'function') {
    window.closePassiveTeamEditor()
  }
}

const confirmPassiveTeamEdit = () => {
  if (typeof window.confirmPassiveTeamEdit === 'function') {
    window.confirmPassiveTeamEdit()
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      id="passive-team-editor-modal"
      class="modal-overlay"
    >
      <div class="modal-content-premium passive-editor-modal">
        <button
          class="modal-close-btn"
          @click="closePassiveTeamEditor"
        >
          ✕
        </button>
        <div class="modal-header">
          <div class="header-title">
            ARMADOR PASIVO
          </div>
        </div>
        <div
          id="passive-editor-body"
          class="modal-body"
        >
          <!-- Contenido del editor inyectado por JS -->
        </div>
        <div class="modal-footer">
          <button
            class="save-btn"
            @click="confirmPassiveTeamEdit"
          >
            💾 GUARDAR
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.passive-editor-modal {
  max-width: 440px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: var(--red);
  font-size: 22px;
  cursor: pointer;
  z-index: 10;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(#{1.1});
  }
}

.modal-header {
  padding: 24px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.header-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--green);
  text-align: center;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.modal-footer {
  padding: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.save-btn {
  width: 100%;
  padding: 16px;
  background: var(--green);
  border: none;
  border-radius: 12px;
  font-family: 'Press Start 2P';
  font-size: 9px;
  color: #000;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.2);
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(50, 215, 75, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
}
</style>
