<script setup lang="ts">
import type { Pokemon } from '@/types/pokemon/pokemon'
import PVGenderBadge from '@/components/common/PVGenderBadge.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import FriendshipSealBadge from '@/components/pokemon/FriendshipSealBadge.vue'

interface Props {
  pokemon: Pokemon
  tierInfo: { tier: string; color: string; bg: string } | null
  totalIvs: number
  totalPower: number
  fieldPassive: { label: string; desc: string; icon: string } | null
}

defineProps<Props>()
</script>

<template>
  <header class="menu-header">
    <div class="header-left">
      <div
        v-if="tierInfo"
        class="m-badge-tier giant"
        :style="{ '--tier-color': tierInfo.color, '--tier-bg': tierInfo.bg }"
      >
        {{ tierInfo.tier }}
      </div>
    </div>

    <div class="header-center">
      <div class="p-name-stack">
        <h3 class="p-name">
          {{ pokemon.nickname || pokemon.name }}
        </h3>
        <span
          v-if="pokemon.nickname"
          class="box-species-subtitle"
        >
          {{ pokemon.name }}
        </span>
      </div>

      <div class="header-badges">
        <PVGenderBadge
          v-if="pokemon.gender"
          :gender="pokemon.gender"
          size="mini"
        />
        <span class="m-badge-level">Nv. {{ pokemon.level }}</span>
        <span class="m-badge-iv">IV {{ totalIvs }}</span>
        <PVTooltip
          title="PODER TOTAL"
          description="Suma de estadísticas base, IVs genéticos y bonificación de EVs (4 EVs = 1 IV)."
          position="bottom"
        >
          <span class="m-badge-tot">TOT {{ totalPower }}</span>
        </PVTooltip>
        <FriendshipSealBadge
          :friendship="pokemon.friendship"
          size="sm"
        />
        <PVTooltip
          v-if="fieldPassive"
          :title="`Pasiva: ${fieldPassive.label}`"
          :description="fieldPassive.desc"
          position="bottom"
        >
          <span class="status-indicator field-passive">
            <span class="emoji">{{ fieldPassive.icon }}</span>
          </span>
        </PVTooltip>
      </div>
    </div>

    <!-- Spacer to balance header since BaseModal provides the close button via inheritance -->
    <div class="header-right-spacer" />
  </header>
</template>

<style scoped lang="scss">
@use "@/styles/components/box-menu" as *;
</style>
