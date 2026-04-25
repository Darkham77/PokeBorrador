<script setup>
/**
 * PassiveTeamEditorModal
 * Standardized modal for managing defense team.
 */
defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const closeEditor = () => {
  emit('close')
}

const confirmSave = () => {
  if (typeof window.confirmPassiveTeamEdit === 'function') {
    window.confirmPassiveTeamEdit()
  }
}

// Shim for legacy code - we keep this but use the prop as source of truth
if (typeof window !== 'undefined') {
  window.openPassiveTeamEditor = () => {
    // This is now managed by the store/host, but we keep the shim for event-based calls
    import('@/stores/modals').then(m => m.useModalStore().open('PassiveTeamEditor'))
  }
}
</script>

<template>
  <BaseModal
    :show="show"
    title="🛡️ ARMADOR PASIVO"
    max-width="440px"
    variant="retro"
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
        class="btn-vicio-success btn-vicio-full"
        @click.stop="confirmSave"
      >
        💾 GUARDAR CONFIGURACIÓN
      </button>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.passive-editor-inner {
  padding: 8px 0;
}

.editor-help-text {
  font-size: 11px;
  color: Rgba(255, 255, 255, 0.5);
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
  @include pixelated;
  font-size: 10px;
}

// Global injections styles (Legacy)
:deep(.passive-poke-slot) {
  background: Rgba(0, 0, 0, 0.3);
  border: 1px solid Rgba(255, 255, 255, 0.05);
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
