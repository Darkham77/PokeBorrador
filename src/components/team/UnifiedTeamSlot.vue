<script setup>
import { computed } from 'vue'
import PokemonDisplayCard from '@/components/pokemon/PokemonDisplayCard.vue'

const props = defineProps({
  pokemon: { type: Object, default: null },
  index: { type: Number, required: true },
  isPvp: { type: Boolean, default: false },
  maxObeyLv: { type: Number, default: 100 }
})

const emit = defineEmits(['select', 'open-detail', 'open-item', 'send-to-box'])

const isEmpty = computed(() => !props.pokemon)
</script>

<template>
  <div
    class="team-slot"
    :class="{ 'empty': isEmpty, 'pvp-slot': isPvp }"
  >
    <div
      v-if="isEmpty"
      class="empty-placeholder"
      @click="emit('select', index)"
    >
      <span class="plus-icon">✚</span>
      <span class="label">{{ isPvp ? 'ELEGIR PVP' : 'AÑADIR' }}</span>
    </div>
    
    <PokemonDisplayCard
      v-else
      :pokemon="pokemon"
      :index="index"
      :is-pvp="isPvp"
      :max-obey-lv="maxObeyLv"
      @click="emit('open-detail', index)"
      @open-detail="emit('open-detail', index)"
      @open-item="emit('open-item', index)"
      @send-to-box="emit('send-to-box', index)"
    />
  </div>
</template>

<style scoped lang="scss">
.team-slot {
  width: 100%;
  min-height: 220px;
  display: flex;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.empty-placeholder {
  flex: 1;
  background: rgba(255, 255, 255, 0.02);
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--yellow);
    transform: TranslateY(-4px);
    
    .plus-icon {
      transform: Scale(1.2) Rotate(90deg);
      filter: Drop-shadow(0 0 15px var(--yellow));
      color: $white;
    }
    
    .label {
      color: var(--yellow);
    }
  }

  .plus-icon {
    font-size: 32px;
    color: rgba(255, 255, 255, 0.3);
    transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .label {
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    color: var(--gray);
    transition: all 0.3s;
  }
}

.pvp-slot {
  .empty-placeholder {
    border-color: rgba(199, 125, 255, 0.3);
    
    &:hover {
      border-color: var(--purple-light);
      .plus-icon { filter: Drop-shadow(0 0 10px var(--purple-light)); }
      .label { color: var(--purple-light); }
    }
  }
}
</style>
