<script setup lang="ts">
import RewardPillsGroup from '@/components/shared/RewardPillsGroup.vue'
import type { EventRewardType } from '@/types/system/stores'

interface Prize extends Record<string, unknown> {
  type?: EventRewardType
  amount?: number
  qty?: number
  money?: number
  battleCoins?: number
  item?: string
  items?: Record<string, number>
  species?: string
  shiny?: boolean
  level?: number
}

interface Props {
  prizes?: { first?: Prize; second?: Prize; third?: Prize } | null
  containerClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  prizes: null,
  containerClass: 'sub-prizes-list'
})
</script>

<template>
  <div 
    v-if="props.prizes"
    :class="props.containerClass"
  >
    <div 
      v-if="props.prizes.first" 
      class="sub-prize-row gold"
    >
      <div class="rank-badge pixelated">
        <span class="emoji medal">🥇</span> 1°
      </div>
      <RewardPillsGroup
        :prize="props.prizes.first"
        size="sm"
      />
    </div>
    <div 
      v-if="props.prizes.second" 
      class="sub-prize-row silver"
    >
      <div class="rank-badge pixelated">
        <span class="emoji medal">🥈</span> 2°
      </div>
      <RewardPillsGroup
        :prize="props.prizes.second"
        size="sm"
      />
    </div>
    <div 
      v-if="props.prizes.third" 
      class="sub-prize-row bronze"
    >
      <div class="rank-badge pixelated">
        <span class="emoji medal">🥉</span> 3°
      </div>
      <RewardPillsGroup
        :prize="props.prizes.third"
        size="sm"
      />
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/EventDetailModal.styles.scss"></style>

