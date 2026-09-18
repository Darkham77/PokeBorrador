<script setup lang="ts">
import { computed } from 'vue'
import type { EventConfig, UpcomingEventOccurrence } from '@/logic/events/eventEngine'
import type { EventTypeKind } from '@/types/system/stores.ts'

interface Props {
  eventType?: EventTypeKind
  occurrence?: UpcomingEventOccurrence
  isUpcoming: boolean
  parsedConfig: EventConfig
}

const props = defineProps<Props>()

const typeTagLabel = computed(() => (props.eventType === 'competition' ? 'COMPETICIÓN' : 'EVENTO'))
const hasShinyMult = computed(() => Boolean(props.parsedConfig.speciesShinyMult && props.parsedConfig.speciesShinyMult > 1))
const hasSpawnMult = computed(() => Boolean(props.parsedConfig.speciesRateMult && props.parsedConfig.speciesRateMult > 1))
const hasFishingMult = computed(() => Boolean(props.parsedConfig.fishingMult && props.parsedConfig.fishingMult > 1))
const hasRequireCaught = computed(() => Boolean(props.parsedConfig.requireCaughtDuringEvent))
const isUpcomingDateValid = computed(() => Boolean(props.isUpcoming && props.occurrence?.dateLabel))
</script>

<template>
  <div class="tags-row">
    <span
      class="type-tag"
      :class="props.eventType"
    >{{ typeTagLabel }}</span>

    <span
      v-if="isUpcomingDateValid && props.occurrence"
      class="catch-window-tag"
    >
      <span class="emoji">🗓️</span> {{ props.occurrence.dateLabel }} · {{ props.occurrence.timeLabel }}
    </span>
    <template v-else>
      <span
        v-if="hasShinyMult"
        class="type-tag shiny"
      ><span class="emoji">✨</span> x{{ props.parsedConfig.speciesShinyMult }} SHINY</span>
      <span
        v-if="hasSpawnMult"
        class="type-tag spawn"
      ><span class="emoji">🎯</span> x{{ props.parsedConfig.speciesRateMult }} SPAWN</span>
      <span
        v-if="hasFishingMult"
        class="type-tag fishing"
      ><span class="emoji">🎣</span> x{{ props.parsedConfig.fishingMult }} PESCA</span>
      <span
        v-if="hasRequireCaught"
        class="catch-window-tag"
      ><span class="emoji">🕒</span> SOLO CAPTURAS DEL EVENTO</span>
    </template>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.tags-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;

  .type-tag {
    font-size: 7px;
    padding: 2px 6px;
    border-radius: 4px;
    background: Rgba(59, 130, 246, 0.1);
    border: 1px solid Rgba(59, 130, 246, 0.3);
    color: #60a5fa;
    font-weight: bold;
    width: fit-content;
    @include pixelated;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    line-height: 1.35;

    .emoji {
      font-size: 8px;
      line-height: 1;
    }

    &.competition {
      background: Rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border-color: Rgba(245, 158, 11, 0.3);
    }

    &.passive_bonus {
      background: Rgba(168, 85, 247, 0.15);
      color: #c084fc;
      border-color: Rgba(168, 85, 247, 0.3);
    }

    &.shiny {
      background: Rgba(234, 179, 8, 0.15);
      color: #facc15;
      border-color: Rgba(234, 179, 8, 0.3);
    }

    &.spawn {
      background: Rgba(34, 197, 94, 0.15);
      color: #4ade80;
      border-color: Rgba(34, 197, 94, 0.3);
    }

    &.fishing {
      background: Rgba(14, 165, 233, 0.15);
      color: #38bdf8;
      border: 1px solid Rgba(14, 165, 233, 0.3);
    }
  }

  .catch-window-tag {
    @include pixelated;
    font-size: 7px;
    padding: 2px 6px;
    border-radius: 4px;
    background: Rgba(250, 204, 21, 0.12);
    border: 1px solid Rgba(250, 204, 21, 0.35);
    color: var(--yellow);
    font-weight: bold;
    width: fit-content;
    text-shadow: 0 1px 2px Rgba(0, 0, 0, 0.5);
    display: inline-flex;
    align-items: center;
    gap: 3px;
    line-height: 1.35;

    .emoji {
      font-size: 8px;
      line-height: 1;
    }
  }
}
</style>
