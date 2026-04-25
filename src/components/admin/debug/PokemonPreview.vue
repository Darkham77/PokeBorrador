<script setup>
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

defineProps({
  spriteUrl: { type: String, default: '' },
  isShiny: { type: Boolean, default: false },
  isGuardian: { type: Boolean, default: false },
  gender: { type: String, default: 'M' }
})

defineEmits(['toggleShiny', 'toggleGuardian', 'toggleGender'])
</script>

<template>
  <div class="preview-box">
    <PVSpriteFX
      :is-shiny="isShiny"
      :is-guardian="isGuardian"
    >
      <img
        :src="spriteUrl" 
        class="preview-sprite"
        @error="e => e.target.style.display = 'none'"
      >
    </PVSpriteFX>

    <div class="preview-flags">
      <PVTooltip
        title="Alternar shiny"
        description="Cambia entre la variante normal y la brillante."
      >
        <button
          class="flag-btn shiny"
          :class="{ active: isShiny }"
          @click="$emit('toggleShiny')"
        >
          ✨
        </button>
      </PVTooltip>
      <PVTooltip
        title="Marcar como guardián"
        description="Aplica el aura blanca de poder especial."
      >
        <button
          class="flag-btn guardian"
          :class="{ active: isGuardian }"
          @click="$emit('toggleGuardian')"
        >
          🛡️
        </button>
      </PVTooltip>
      <PVTooltip
        title="Género"
        description="Cambia entre macho y hembra."
      >
        <button
          class="flag-btn gender"
          :class="[gender === 'M' ? 'male' : 'female']"
          @click="$emit('toggleGender')"
        >
          {{ gender === 'M' ? '♂️' : '♀️' }}
        </button>
      </PVTooltip>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.preview-box {
  background: rgba(0, 0, 0, 0.4);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;

  .preview-sprite {
    height: 120px;
    image-rendering: pixelated;
    filter: Drop-Shadow(0 0 10px rgba(0, 0, 0, 0.5));
  }

  .preview-flags {
    display: flex;
    gap: 8px;

    .flag-btn {
      width: 32px;
      height: 32px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;

      &:hover { background: rgba(255, 255, 255, 0.1); }
      &.active { border-color: var(--vicio-primary); background: rgba(124, 58, 237, 0.1); }
      
      &.male { color: #3b82f6; }
      &.female { color: #ec4899; }
    }
  }
}
</style>
