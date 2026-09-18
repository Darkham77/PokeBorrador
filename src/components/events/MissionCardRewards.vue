<script setup lang="ts">
/**
 * src/components/events/MissionCardRewards.vue
 *
 * Subcomponent rendering single and multi-reward tags in MissionCard.
 */

import { computed } from 'vue'
import { getItemById, isItemId, type ItemId } from '@/data/inventory/items'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVTooltip from '@/components/common/PVTooltip.vue'
import type { DetailedMissionReward } from '@/logic/player/classMissionsData'

interface Props {
  rewardsList?: readonly DetailedMissionReward[]
  rewardId?: ItemId
  rewardIcon?: string
  rewardLabel?: string
  rewardVal?: string
  rewardTooltipTitle?: string
  rewardTooltipDescription?: string
}

const props = withDefaults(defineProps<Props>(), {
  rewardsList: () => [],
  rewardId: undefined,
  rewardIcon: '🎁',
  rewardLabel: 'Recompensa',
  rewardVal: '',
  rewardTooltipTitle: '',
  rewardTooltipDescription: ''
})

const rewardSpriteUrl = computed(() => {
  if (props.rewardId && isItemId(props.rewardId)) {
    return getAssetUrl(ASSET_TYPES.ITEM, props.rewardId)
  }
  return null
})

const computedRewardTooltipTitle = computed(() => {
  if (props.rewardTooltipTitle) return props.rewardTooltipTitle
  if (props.rewardId && isItemId(props.rewardId)) {
    const item = getItemById(props.rewardId)
    if (item) return item.name
  }
  return props.rewardLabel
})

const computedRewardTooltipDescription = computed(() => {
  if (props.rewardTooltipDescription) return props.rewardTooltipDescription
  if (props.rewardId && isItemId(props.rewardId)) {
    const item = getItemById(props.rewardId)
    if (item) return item.desc
  }

  // Fallback static descriptions for general rewards
  const labelLower = props.rewardLabel.toLowerCase()
  const valLower = props.rewardVal.toLowerCase()
  if (labelLower.includes('peso') || props.rewardIcon === '₱' || valLower.includes('peso')) {
    return 'Poké-Pesos (₱). Moneda principal del juego.'
  }
  if (labelLower.includes('exp') || labelLower.includes('experiencia') || valLower.includes('exp') || valLower.includes('experiencia')) {
    return 'Puntos de experiencia para subir el nivel y rango de tu clase.'
  }
  if (labelLower.includes('ficha') || valLower.includes('ficha')) {
    return 'Fichas de Batalla. Canjeables por objetos tácticos en la Tienda de Guerra.'
  }
  if (labelLower.includes('ticket') || labelLower.includes('pase') || valLower.includes('ticket')) {
    return 'Ticket de entrada para mazmorras y eventos especiales.'
  }
  return 'Recompensa por completar la misión.'
})
</script>

<template>
  <!-- Multi-Reward Grid (e.g. Class Deployments) -->
  <div
    v-if="rewardsList && rewardsList.length > 0"
    class="rewards-multi-list"
  >
    <div class="rewards-header-label">
      RECOMPENSAS DETALLADAS
    </div>
    <div class="rewards-multi-grid">
      <PVTooltip
        v-for="(rew, rIdx) in rewardsList"
        :key="rIdx"
        :title="rew.tooltipTitle || rew.label"
        :description="rew.tooltipDesc || rew.val"
        position="top"
        style="width: 100%;"
      >
        <div class="reward-tag mini-tag">
          <div
            v-if="rew.isItem && rew.id && isItemId(rew.id)"
            class="reward-sprite-wrap"
          >
            <img
              :src="getAssetUrl(ASSET_TYPES.ITEM, rew.id)"
              :alt="rew.label"
              class="reward-sprite-img pixelated"
            >
          </div>
          <span
            v-else
            class="emoji reward-icon"
          >{{ rew.icon || '🎁' }}</span>
          <div class="reward-info">
            <span class="label">{{ rew.label }}</span>
            <span class="val">{{ rew.val }}</span>
          </div>
        </div>
      </PVTooltip>
    </div>
  </div>

  <!-- Single Reward Tag (e.g. Daily Delivery Missions) -->
  <PVTooltip
    v-else
    :title="computedRewardTooltipTitle"
    :description="computedRewardTooltipDescription"
    position="top"
    style="width: 100%;"
  >
    <div class="reward-tag">
      <div
        v-if="rewardSpriteUrl"
        class="reward-sprite-wrap"
      >
        <img
          :src="rewardSpriteUrl"
          :alt="computedRewardTooltipTitle"
          class="reward-sprite-img pixelated"
        >
      </div>
      <span
        v-else
        class="emoji reward-icon"
      >{{ rewardIcon }}</span>
      <div class="reward-info">
        <span class="label">{{ rewardLabel }}</span>
        <span class="val">{{ rewardVal }}</span>
      </div>
    </div>
  </PVTooltip>
</template>

<style scoped src="./MissionCard.styles.scss" lang="scss"></style>
