<script setup lang="ts">
// style-inherited: styles imported in parent BoxPokemonMenu.vue
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { PokemonType } from '@/data/battle/types'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import UnifiedBadgePill from '@/components/shared/UnifiedBadgePill.vue'

interface Props {
  pokemon: Pokemon
  tierInfo: { tier: string; color: string; bg: string } | null
  pokemonSpriteUrl: string
  pokemonTypes: PokemonType[]
  natureData: { name: string; desc: string } | null
  abilityData: { name: string; desc: string }
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'detail'): void
}>()
</script>

<template>
  <div 
    class="pokemon-summary-card" 
    :style="{ '--tier-color': tierInfo?.color }"
    @click.stop="emit('detail')"
  >
    <div class="sprite-box">
      <PVSpriteFX
        :is-shiny="pokemon.isShiny"
        :is-guardian="pokemon.isGuardian"
      >
        <img
          :src="pokemonSpriteUrl"
          :alt="pokemon.name || 'Pokémon'"
          class="menu-sprite"
          @error="e => { (e.target as HTMLImageElement).style.display = 'none' }"
        >
      </PVSpriteFX>
    </div>

    <div class="summary-meta">
      <div class="box-types-row">
        <PokemonTypeTag
          v-for="t in pokemonTypes" 
          :key="t"
          :type="t"
          size="sm"
        />
      </div>

      <div class="nature-ability">
        <PVTooltip
          v-if="natureData"
          :title="natureData.name.toUpperCase()"
          :description="natureData.desc"
          position="top"
        >
          <span class="interactive-text">{{ natureData.name }}</span>
        </PVTooltip>
        <span
          v-if="natureData && pokemon.ability"
          class="sep"
        >|</span>
        <PVTooltip
          v-if="pokemon.ability"
          :title="abilityData.name"
          :description="abilityData.desc"
          position="top"
        >
          <span class="interactive-text">{{ abilityData.name }}</span>
        </PVTooltip>
      </div>

      <div class="tags-row">
        <UnifiedBadgePill 
          :pokemon="pokemon" 
          size="md" 
          :vertical="false"
          inline
        />
      </div>
    </div>
  </div>
</template>
