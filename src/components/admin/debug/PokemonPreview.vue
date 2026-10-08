<script setup lang="ts">
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import PVGenderBadge from '@/components/common/PVGenderBadge.vue'
import type { PokemonGender } from '@/types/pokemon/pokemon'

interface Props {
  spriteUrl?: string
  isShiny?: boolean
  isGuardian?: boolean
  gender?: PokemonGender
}

withDefaults(defineProps<Props>(), {
  spriteUrl: '',
  isShiny: false,
  isGuardian: false,
  gender: 'm'
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
        :alt="isShiny ? 'Pokémon Shiny' : 'Pokémon'"
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
          id="debug-btn-toggle-shiny"
          class="flag-btn shiny"
          :class="{ active: isShiny }"
          @click.stop="emit('toggleShiny')"
        >
          <span class="emoji">✨</span>
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
          <span class="emoji">🛡️</span>
        </button>
      </PVTooltip>
      <PVTooltip
        title="Género"
        description="Cambia entre macho y hembra."
      >
        <button
          class="flag-btn gender"
          :class="[gender === 'm' ? 'male' : 'female']"
          @click.stop="emit('toggleGender')"
        >
          <PVGenderBadge
            :gender="gender"
            size="sm"
          />
        </button>
      </PVTooltip>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.preview-box {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: 16px;
  background: Rgb(0 0 0 / 40%);
  overflow: hidden;

  .preview-sprite {
    @include pixelated;

    height: 120px;
    will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 0 10px Rgb(0 0 0 / 50%));
  }

  .preview-flags {
    display: flex;
    gap: 8px;

    .flag-btn {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 32px;
      height: 32px;
      border: 1px solid Rgb(255 255 255 / 10%);
      border-radius: 8px;
      background: Rgb(255 255 255 / 5%);
      cursor: pointer;
      

      &:hover { background: Rgb(255 255 255 / 10%); }
      &.active { background: Rgb(124 58 237 / 10%); border-color: var(--vicio-primary); }
      
      &.male { color: $gender-male; }
      &.female { color: $gender-female; }
    }
  }
}
</style>
