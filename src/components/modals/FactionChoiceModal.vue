<script setup lang="ts">
/**
 * FactionChoiceModal
 * Standardized modal for faction selection.
 */
import { ref } from 'vue'
import { usePlayerClassStore } from '@/stores/player/playerClass'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import BaseModal from '@/components/common/BaseModal.vue'
import type { FactionId } from '@/types/system/game'

interface Props {
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const classStore = usePlayerClassStore()

const isProcessing = ref(false)

const chooseFaction = async (faction: FactionId) => {
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

const handleImgError = (e: Event) => {
  (e.target as HTMLImageElement).style.display = 'none'
}

// Expose to template
const getAssetUrlLocal = getAssetUrl
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
          Cambiar cuesta <span class="coin"><span class="emoji">🪙</span> 25.000</span> y resetea tus puntos actuales.
        </p>
      </div>

      <div class="faction-options">
        <button
          class="faction-btn union-btn"
          :disabled="isProcessing"
          @click.stop="chooseFaction('union')"
        >
          <span class="faction-icon-wrap">
            <img
              :src="getAssetUrlLocal(ASSET_TYPES.FACTION, 'union')"
              alt="Team Unión"
              class="faction-icon-large"
              @error="handleImgError"
            >
          </span>
          <span class="faction-info">
            <span class="faction-name union-text">Team Unión</span>
            <span class="faction-motto">Amistad. Armonía. Compañerismo.</span>
          </span>
        </button>

        <button
          class="faction-btn poder-btn"
          :disabled="isProcessing"
          @click.stop="chooseFaction('poder')"
        >
          <span class="faction-icon-wrap">
            <img
              :src="getAssetUrlLocal(ASSET_TYPES.FACTION, 'poder')"
              alt="Team Poder"
              class="faction-icon-large"
              @error="handleImgError"
            >
          </span>
          <span class="faction-info">
            <span class="faction-name poder-text">Team Poder</span>
            <span class="faction-motto">Poder. Herramientas. Eficiencia.</span>
          </span>
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
    color: $white;
    font-size: 14px;
    line-height: 1.4;
    margin-bottom: 8px;
  }
  
  .cost-text {
    @include pixelated;

    color: $white;
    font-size: 9px;
    
    .coin { color: var(--yellow, $coin-gold); }
  }
}

.faction-options {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.faction-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 24px;
  border-radius: 16px;
  background: Rgb(0 0 0 / 40%);
  text-align: center;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    will-change: transform, filter, opacity;
  filter: Grayscale(0.8);
  }

  &.union-btn {
    border: 2px solid #3b82f6;
    box-shadow: inset 0 0 20px Rgb(59 130 246 / 10%);
    &:hover:not(:disabled) { background: Rgb(59 130 246 / 10%); transform: Scale(1.02); }
  }

  &.poder-btn {
    border: 2px solid #ef4444;
    box-shadow: inset 0 0 20px Rgb(239 68 68 / 10%);
    &:hover:not(:disabled) { background: Rgb(239 68 68 / 10%); transform: Scale(1.02); }
  }
}

.faction-icon-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100px;
  height: 100px;
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
  color: $white;
  font-size: 12px;
  opacity: 0.8;
}

.union-text { color: #60a5fa; }

.poder-text { color: #f87171; }
</style>

