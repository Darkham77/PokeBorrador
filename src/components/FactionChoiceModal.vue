<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { usePlayerClassStore } from '@/stores/playerClass'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import BaseModal from '@/components/common/BaseModal.vue'

const uiStore = useUIStore()
const classStore = usePlayerClassStore()

const isOpen = computed(() => uiStore.isFactionChoiceOpen)

const closeFactionModal = () => {
  uiStore.isFactionChoiceOpen = false
}

const chooseFaction = async (faction) => {
  const res = await classStore.setFaction(faction)
  if (res.success) {
    uiStore.isFactionChoiceOpen = false
  }
}

// Expose to template
const getAssetUrlLocal = getAssetUrl
const ASSET_TYPES_LOCAL = ASSET_TYPES
</script>

<template>
  <BaseModal
    :show="isOpen"
    title="¡ELIGE TU BANDO!"
    max-width="480px"
    :z-index="12000"
    @close="closeFactionModal"
  >
    <div class="faction-options">
      <button
        class="faction-btn union-btn"
        @click="chooseFaction('union')"
      >
        <div class="faction-icon-wrap">
          <img
            :src="getAssetUrlLocal(ASSET_TYPES_LOCAL.FACTION, 'union')"
            class="faction-icon-large"
          >
        </div>
        <div class="faction-info">
          <span class="faction-name union-text">TEAM UNIÓN</span>
          <span class="faction-motto">Lealtad y Protección</span>
        </div>
      </button>

      <button
        class="faction-btn poder-btn"
        @click="chooseFaction('poder')"
      >
        <div class="faction-icon-wrap">
          <img
            :src="getAssetUrlLocal(ASSET_TYPES_LOCAL.FACTION, 'poder')"
            class="faction-icon-large"
          >
        </div>
        <div class="faction-info">
          <span class="faction-name poder-text">TEAM PODER</span>
          <span class="faction-motto">Fuerza y Ambición</span>
        </div>
      </button>
    </div>

    <template #footer>
      <div class="faction-modal-footer-text">
        Podrás cambiar tu bando más tarde desde tu perfil.
      </div>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.faction-choice-overlay {
  z-index: 12000; // Same as cosmetics, should be on top of profile
  backdrop-filter: blur(8px);
}

.faction-card {
  padding: 0;
  max-width: 480px;
  width: 90%;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  border-radius: 24px;
}

.faction-modal-header {
  padding: 32px 24px 20px;
  text-align: center;
  background: rgba(255, 255, 255, 0.02);
}

.faction-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  color: #ffd700;
  margin-bottom: 12px;
  letter-spacing: 1px;
}

.faction-subtitle {
  font-size: 11px;
  color: #64748b;
  line-height: 1.5;
}

.faction-options {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.faction-btn {
  width: 100%;
  padding: 20px;
  border-radius: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);

  &:hover {
    transform: translateY(-4px);
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.15);
  }

  &.union-btn:hover { border-color: #3b82f6; box-shadow: 0 10px 30px rgba(59, 130, 246, 0.2); }
  &.poder-btn:hover { border-color: #ef4444; box-shadow: 0 10px 30px rgba(239, 68, 68, 0.2); }
}

.faction-icon-wrap {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
}

.faction-icon-large {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.faction-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.faction-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
}

.faction-motto {
  font-size: 10px;
  color: #475569;
}

.union-text { color: #3b82f6; }
.poder-text { color: #ef4444; }

.modal-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: #475569;
  font-size: 24px;
  cursor: pointer;
  z-index: 10;
  &:hover { color: #fff; }
}

.faction-modal-footer {
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  text-align: center;
  p { font-size: 10px; color: #475569; }
}

/* TRANSITIONS */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
