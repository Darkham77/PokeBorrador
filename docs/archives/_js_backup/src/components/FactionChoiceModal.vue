<script setup>
/**
 * FactionChoiceModal
 * Standardized modal for faction selection.
 */
import { ref } from 'vue'
import { usePlayerClassStore } from '@/stores/playerClass'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import BaseModal from '@/components/common/BaseModal.vue'

defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])
const classStore = usePlayerClassStore()

const isProcessing = ref(false)

const chooseFaction = async (faction) => {
  if (isProcessing.value) return
  
  isProcessing.value = true
  try {
    const res = await classStore.setFaction(faction)
    if (res.success) {
      emit('close')
    }
  } finally {
    isProcessing.value = false
  }
}

// Expose to template
const getAssetUrlLocal = getAssetUrl
const ASSET_TYPES_LOCAL = ASSET_TYPES
</script>

<template>
  <BaseModal
    :show="show"
    title="¡ELIGE TU BANDO!"
    title-color="var(--yellow)"
    header-background="#161a2e"
    max-width="420px"
    :z-index="13000"
    variant="modern"
    :prevent-close="isProcessing"
    custom-class="faction-choice-modal"
    @close="emit('close')"
  >
    <div class="faction-content">
      <div class="faction-intro">
        <p class="intro-text">
          Tu bando determina con quién disputas el control de Kanto.
        </p>
        <p class="cost-text">
          Cambiar cuesta <span class="coin">🪙 25.000</span> y resetea tus puntos actuales.
        </p>
      </div>

      <div class="faction-options">
        <button
          class="faction-btn union-btn"
          :disabled="isProcessing"
          @click.stop="chooseFaction('union')"
        >
          <div class="faction-icon-wrap">
            <img
              :src="getAssetUrlLocal(ASSET_TYPES_LOCAL.FACTION, 'union')"
              class="faction-icon-large"
              @error="e => e.target.style.display = 'none'"
            >
          </div>
          <div class="faction-info">
            <span class="faction-name union-text">Team Unión</span>
            <span class="faction-motto">Amistad. Armonía. Compañerismo.</span>
          </div>
        </button>

        <button
          class="faction-btn poder-btn"
          :disabled="isProcessing"
          @click.stop="chooseFaction('poder')"
        >
          <div class="faction-icon-wrap">
            <img
              :src="getAssetUrlLocal(ASSET_TYPES_LOCAL.FACTION, 'poder')"
              class="faction-icon-large"
              @error="e => e.target.style.display = 'none'"
            >
          </div>
          <div class="faction-info">
            <span class="faction-name poder-text">Team Poder</span>
            <span class="faction-motto">Poder. Herramientas. Eficiencia.</span>
          </div>
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.faction-content {
  padding: 8px 12px 20px;
}

.faction-intro {
  text-align: center;
  margin-bottom: 24px;
  
  .intro-text {
    font-size: 14px;
    color: $white;
    margin-bottom: 8px;
    line-height: 1.4;
  }
  
  .cost-text {
    @include pixelated;
    font-size: 9px;
    color: $white;
    
    .coin { color: Var(--yellow, $coin-gold); }
  }
}

.faction-options {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.faction-btn {
  width: 100%;
  padding: 24px;
  background: Rgba(0, 0, 0, 0.4);
  border-radius: 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  transition: all 0.2s cubic-Bezier(0.4, 0, 0.2, 1);
  text-align: center;

  &.union-btn {
    border: 2px solid #3b82f6;
    box-shadow: inset 0 0 20px Rgba(59, 130, 246, 0.1);
    &:hover:Not(:disabled) { background: Rgba(59, 130, 246, 0.1); transform: Scale(1.02); }
  }

  &.poder-btn {
    border: 2px solid #ef4444;
    box-shadow: inset 0 0 20px Rgba(239, 68, 68, 0.1);
    &:hover:Not(:disabled) { background: Rgba(239, 68, 68, 0.1); transform: Scale(1.02); }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: Grayscale(0.8);
  }
}

.faction-icon-wrap {
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.faction-icon-large {
  width: 84px;
  height: 84px;
  object-fit: contain;
}

.faction-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.faction-name {
  @include pixelated;
  font-size: 16px;
  letter-spacing: 1px;
}

.faction-motto {
  font-size: 12px;
  color: $white;
  opacity: 0.8;
}

.union-text { color: #60a5fa; }
.poder-text { color: #f87171; }
</style>
