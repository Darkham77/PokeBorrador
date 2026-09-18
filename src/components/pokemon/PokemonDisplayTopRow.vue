<script setup lang="ts">
import UnifiedBadgePill from '@/components/shared/UnifiedBadgePill.vue'
import FriendshipSealBadge from '@/components/pokemon/FriendshipSealBadge.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { PokemonTagId } from '@/logic/constants/tags'
import type { TierConfig } from '@/logic/pokemon/tierEngine.ts'
import type { CardStatusIndicator } from '@/components/pokemon/pokemonDisplayCardHelper.ts'

interface Props {
  pokemon: Pokemon
  isPerformanceActive: boolean
  tierInfo: TierConfig & { tier: string; total: number }
  statusIndicators: CardStatusIndicator[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'toggle-tag': [tagId: PokemonTagId]
}>()
</script>

<template>
  <div class="top-row">
    <!-- Píldora de Insignias Centralizada -->
    <UnifiedBadgePill 
      v-if="!props.isPerformanceActive"
      :pokemon="props.pokemon" 
      size="lg"
      editable
      @toggle-tag="(tagId) => emit('toggle-tag', tagId)"
    />
    <div
      v-else
      class="badges-spacer"
    />

    <div class="top-right-column">
      <div
        class="card-tier-badge m-badge-tier"
        :style="{ '--tier-bg': props.tierInfo.bg, '--tier-color': props.tierInfo.color }"
      >
        {{ props.tierInfo.tier }}
      </div>
      <div class="card-status-indicators">
        <FriendshipSealBadge
          :friendship="props.pokemon.friendship"
          size="md"
        />
        <PVTooltip
          v-for="indicator in props.statusIndicators"
          :key="indicator.key"
          :title="indicator.title"
          :description="indicator.description"
        >
          <div :class="['status-indicator', indicator.cssClass]">
            <span class="emoji">{{ indicator.icon }}</span>
          </div>
        </PVTooltip>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/pokemon-display-card" as *;
</style>
