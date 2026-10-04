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
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;

  .type-tag {
    @include pixelated;

    display: inline-flex;
    align-items: center;
    gap: 3px;
    width: fit-content;
    padding: 2px 6px;
    border: 1px solid rgb(59 130 246 / 30%);
    border-radius: 4px;
    background: rgb(59 130 246 / 10%);
    color: #60a5fa;
    font-size: 7px;
    font-weight: bold;
    line-height: 1.35;

    .emoji {
      font-size: 8px;
      line-height: 1;
    }

    &.competition {
      background: rgb(245 158 11 / 15%);
      color: #fbbf24;
      border-color: rgb(245 158 11 / 30%);
    }

    &.passive_bonus {
      background: rgb(168 85 247 / 15%);
      color: #c084fc;
      border-color: rgb(168 85 247 / 30%);
    }

    &.shiny {
      background: rgb(234 179 8 / 15%);
      color: #facc15;
      border-color: rgb(234 179 8 / 30%);
    }

    &.spawn {
      background: rgb(34 197 94 / 15%);
      color: #4ade80;
      border-color: rgb(34 197 94 / 30%);
    }

    &.fishing {
      border: 1px solid rgb(14 165 233 / 30%);
      background: rgb(14 165 233 / 15%);
      color: #38bdf8;
    }
  }

  .catch-window-tag {
    @include pixelated;

    display: inline-flex;
    align-items: center;
    gap: 3px;
    width: fit-content;
    padding: 2px 6px;
    border: 1px solid rgb(250 204 21 / 35%);
    border-radius: 4px;
    background: rgb(250 204 21 / 12%);
    color: var(--yellow);
    font-size: 7px;
    font-weight: bold;
    line-height: 1.35;
    text-shadow: 0 1px 2px rgb(0 0 0 / 50%);

    .emoji {
      font-size: 8px;
      line-height: 1;
    }
  }
}
</style>
