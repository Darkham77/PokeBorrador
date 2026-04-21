<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'

const uiStore = useUIStore()

const isOpen = computed({
  get: () => uiStore.isPassiveTeamEditorOpen,
  set: (val) => { uiStore.isPassiveTeamEditorOpen = val }
})

const closeEditor = () => {
  isOpen.value = false
}

const confirmSave = () => {
  if (typeof window.confirmPassiveTeamEdit === 'function') {
    window.confirmPassiveTeamEdit()
  }
}

// Shim for legacy code
if (typeof window !== 'undefined') {
  window.openPassiveTeamEditor = () => {
    isOpen.value = true
  }
  window.closePassiveTeamEditor = () => {
    isOpen.value = false
  }
}
</script>

<template>
  <BaseModal
    :show="isOpen"
    title="🛡️ ARMADOR PASIVO"
    max-width="440px"
    @close="closeEditor"
  >
    <div class="passive-editor-inner">
      <p class="editor-help-text">
        Elegí tus mejores defensores. Estos Pokémon protegerán tus rutas conquistadas automáticamente.
      </p>
      
      <div
        id="passive-editor-body"
        class="editor-body-container"
      >
        <!-- Contenido inyectado por el sistema de defensa legado -->
        <div class="loading-placeholder">
          Cargando configuración de defensa...
        </div>
      </div>
    </div>

    <template #footer>
      <button
        class="save-btn-primary"
        @click="confirmSave"
      >
        💾 GUARDAR CONFIGURACIÓN
      </button>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.passive-editor-inner {
  padding: 8px 0;
}

.editor-help-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  margin-bottom: 24px;
}

.editor-body-container {
  min-height: 200px;
}

.loading-placeholder {
  text-align: center;
  padding: 40px;
  color: var(--gray);
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
}

.save-btn-primary {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, var(--green), #059669);
  color: #000;
  border: none;
  border-radius: 14px;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  font-weight: 900;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
    filter: Brightness(1.1);
  }

  &:active {
    transform: translateY(0) Scale(0.98);
  }
}

// Global injections styles (Legacy)
:deep(.passive-poke-slot) {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 12px;

  &.empty {
    border-style: dashed;
    opacity: 0.5;
  }
}
</style>
