<script setup lang="ts">
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

interface Props {
  spriteUrl?: string
  isShiny?: boolean
  isGuardian?: boolean
  gender?: string
}

const props = withDefaults(defineProps<Props>(), {
  spriteUrl: '',
  isShiny: false,
  isGuardian: false,
  gender: 'M'
})

const emit = defineEmits<{
  (e: 'toggleShiny'): void
  (e: 'toggleGuardian'): void
  (e: 'toggleGender'): void
}>()
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
        @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
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
          @click.stop="emit('toggleShiny')"
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
          @click.stop="emit('toggleGuardian')"
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
          @click.stop="emit('toggleGender')"
        >
          {{ gender === 'M' ? '♂️' : '♀️' }}
        </button>
      </PVTooltip>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.preview-box {
  background: Rgba(0, 0, 0, 0.4);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  border: 1px solid Rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;

  .preview-sprite {
    height: 120px;
    image-rendering: pixelated;
    filter: Drop-Shadow(0 0 10px Rgba(0, 0, 0, 0.5));
  }

  .preview-flags {
    display: flex;
    gap: 8px;

    .flag-btn {
      width: 32px;
      height: 32px;
      background: Rgba(255, 255, 255, 0.05);
      border: 1px solid Rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;

      &:hover { background: Rgba(255, 255, 255, 0.1); }
      &.active { border-color: var(--vicio-primary); background: Rgba(124, 58, 237, 0.1); }
      
      &.male { color: $gender-male; }
      &.female { color: $gender-female; }
    }
  }
}
</style>
