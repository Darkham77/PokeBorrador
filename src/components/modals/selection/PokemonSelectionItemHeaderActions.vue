<script setup lang="ts">
import { computed } from 'vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import FriendshipSealBadge from '@/components/pokemon/FriendshipSealBadge.vue'
import type { PokemonSelectionSource } from '@/types/pokemon/pokemon'

const props = defineProps<{
  source: PokemonSelectionSource
  friendship?: number
  tier: string
}>()

const SOURCE_TOOLTIPS: Record<PokemonSelectionSource, { title: string; desc: string; emoji: string }> = {
  team: { title: 'Equipo', desc: 'Este Pokémon está en tu equipo activo.', emoji: '⚔️' },
  box: { title: 'Caja de PC', desc: 'Este Pokémon está guardado en tu caja.', emoji: '📦' },
  market: { title: 'Mercado', desc: 'Este Pokémon está en el mercado.', emoji: '🛒' },
  pokedex: { title: 'Pokédex', desc: 'Registro de la Pokédex.', emoji: '📖' }
}

const sourceInfo = computed(() => SOURCE_TOOLTIPS[props.source] ?? SOURCE_TOOLTIPS.box)
</script>

<template>
  <div class="actions-right">
    <PVTooltip
      :title="sourceInfo.title"
      :description="sourceInfo.desc"
      position="top"
    >
      <span
        class="emoji source-symbol"
        :class="source"
      >
        {{ sourceInfo.emoji }}
      </span>
    </PVTooltip>
    <FriendshipSealBadge
      :friendship="friendship"
      size="sm"
    />
    <span class="m-badge-tier">{{ tier }}</span>
  </div>
</template>

<style scoped src="../PokemonSelectionItem.styles.scss" lang="scss"></style>
