<script setup lang="ts">
import type { CategoryGroup } from '@/composables/events/usePastEventAwards'
import type { PendingAward } from '@/types/system/stores'
import PastEventWinnerItem from './PastEventWinnerItem.vue'
import PastEventAwardRow from './PastEventAwardRow.vue'

interface Props {
  catGroup: CategoryGroup
  categoryIcon: string
  award?: PendingAward | null
  prize: Record<string, unknown> | null // open-record: Generic key-value data dictionary container
  isClaimable: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'claim', awardId: string): void
  (e: 'discard', awardId?: string, categoryName?: string): void
  (e: 'hover', event: MouseEvent, isEntering: boolean): void
  (e: 'discardHover', event: MouseEvent, isEntering: boolean): void
}>()
</script>

<template>
  <div class="category-podium-block">
    <div class="category-block-header pixelated">
      <span class="emoji cat-icon">{{ props.categoryIcon }}</span>
      <span class="cat-name">{{ props.catGroup.categoryName }}</span>
    </div>

    <div class="winners-list">
      <PastEventWinnerItem
        v-for="(w, idx) in props.catGroup.winners"
        :key="w.player_id || idx"
        :winner="w"
        :category-id="props.catGroup.categoryId"
        :rank-index="idx"
      />
    </div>

    <!-- Category User Award Banner -->
    <PastEventAwardRow
      v-if="props.award"
      :award="props.award"
      label="TU PREMIO:"
      :prize="props.prize || {}"
      :is-claimable="props.isClaimable"
      :category-name="props.catGroup.categoryName"
      @claim="emit('claim', $event)"
      @discard="emit('discard', $event, props.catGroup.categoryName)"
      @hover="(ev, entering) => emit('hover', ev, entering)"
      @discard-hover="(ev, entering) => emit('discardHover', ev, entering)"
    />
  </div>
</template>

<style scoped src="./PastEventCard.styles.scss" lang="scss"></style>
