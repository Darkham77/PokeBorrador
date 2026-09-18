<script setup lang="ts">
import type { RankedSeasonMedal } from '@/types/battle/pvp.ts'
import { usePvPStore } from '@/stores/pvp'
import ProfileRankedMedalItem from './ProfileRankedMedalItem.vue'

interface Props {
  medals?: RankedSeasonMedal[]
}

const props = withDefaults(defineProps<Props>(), {
  medals: () => []
})

const pvpStore = usePvPStore()
</script>

<template>
  <div class="profile-section-card ranked-medals-card">
    <div class="section-label">
      MEDALLAS DE TEMPORADA RANKED ({{ props.medals.length }})
    </div>

    <!-- Empty State -->
    <div
      v-if="props.medals.length === 0"
      class="empty-ranked-medals"
    >
      <span class="emoji empty-icon">🎖️</span>
      <span class="empty-text">Sin medallas de temporada competitiva aún.</span>
    </div>

    <!-- Medals Shelf / Grid -->
    <div
      v-else
      class="ranked-medals-shelf"
    >
      <ProfileRankedMedalItem
        v-for="medal in props.medals"
        :key="medal.id"
        :medal="medal"
        :current-season-rules-name="pvpStore.currentSeasonRules?.name"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/_profile-shared.scss";

.ranked-medals-card {
  margin-top: 10px;
}

.empty-ranked-medals {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: Rgba(15, 23, 42, 0.4);
  border-radius: 8px;
  border: 1px dashed Rgba(148, 163, 184, 0.2);

  .empty-icon {
    font-size: 1.4rem;
    opacity: 0.6;
  }

  .empty-text {
    font-size: 0.8rem;
    color: #94a3b8;
    font-style: italic;
  }
}

.ranked-medals-shelf {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 8px;
  margin-top: 6px;
}
</style>
