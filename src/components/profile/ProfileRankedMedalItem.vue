<script setup lang="ts">
import { computed } from 'vue'
import type { RankedSeasonMedal } from '@/types/battle/pvp.ts'
import { useStatHover } from '@/composables/ui/useStatHover'
import { RANKED_MEDAL_CONFIGS } from '@/data/system/rankedData.ts'
import { resolveMedalTournamentInfo } from '@/logic/pvp/rankedEngine.ts'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'

interface Props {
  medal: RankedSeasonMedal
  currentSeasonRulesName?: string
}

const props = defineProps<Props>()

const modalStore = useModalStore()
const uiStore = useUIStore()
const { handleStatEnter, handleStatLeave } = useStatHover()

const tierDisplay = computed(() => {
  const tierId = props.medal.tier
  const config = RANKED_MEDAL_CONFIGS[tierId]
  if (!config) {
    return { name: tierId, icon: '🎖️', sprite: '', color: '#9E9E9E' }
  }
  return {
    name: config.name,
    icon: config.fallbackEmoji,
    sprite: getAssetUrl(ASSET_TYPES.RANK, tierId),
    color: config.color
  }
})

const medalInfo = computed(() => {
  return resolveMedalTournamentInfo(props.medal, props.currentSeasonRulesName)
})

const titleText = computed(() => {
  const info = medalInfo.value
  return info.isAvailable
    ? `Ver detalles del torneo ${info.tournamentName}`
    : `Torneo ${info.tournamentName} (Finalizado)`
})

function handleMedalClick() {
  const info = medalInfo.value
  if (info.isAvailable) {
    modalStore.open('RankedTournamentDetail', {
      themeId: info.themeId,
      tournamentName: info.tournamentName,
      medal: props.medal
    })
  } else {
    uiStore.notify(`El torneo "${info.tournamentName}" ya ha finalizado y sus salas no están disponibles.`, 'ℹ️')
  }
}

const TOP_RANK_THRESHOLD = 10
const PODIUM_RANK_THRESHOLD = 3
const PODIUM_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

const isTopRank = computed(() => Boolean(props.medal.rank && props.medal.rank <= TOP_RANK_THRESHOLD))
const isPodium = computed(() => Boolean(props.medal.rank && props.medal.rank <= PODIUM_RANK_THRESHOLD))
const podiumIcon = computed(() => (props.medal.rank ? PODIUM_ICONS[props.medal.rank] : null))
const podiumTagClass = computed(() => ({
  'top-1': props.medal.rank === 1,
  'top-3': isPodium.value
}))
</script>

<template>
  <div
    id="profile-ranked-medal-item-div-medalclick"
    class="ranked-medal-item"
    :class="{ 'is-available': medalInfo.isAvailable }"
    :style="{ borderColor: tierDisplay.color }"
    role="button"
    tabindex="0"
    :title="titleText"
    @click="handleMedalClick"
    @keydown.enter="handleMedalClick"
    @keydown.space.prevent="handleMedalClick"
    @mouseenter="handleStatEnter"
    @mouseleave="handleStatLeave"
  >
    <div class="medal-icon-wrap">
      <img
        v-if="tierDisplay.sprite"
        :src="tierDisplay.sprite"
        :alt="tierDisplay.name"
        class="medal-sprite"
        loading="lazy"
      >
      <span
        v-else
        class="emoji tier-icon"
      >{{ tierDisplay.icon }}</span>
    </div>

    <div class="medal-info">
      <div
        class="season-name"
        :title="medalInfo.tournamentName"
      >
        {{ medalInfo.tournamentName }}
      </div>
      <div class="season-meta">
        <span class="season-date">{{ medalInfo.formattedDate }}</span>
        <span
          v-if="medalInfo.isAvailable"
          class="active-tag"
          title="Torneo activo actualmente en el Coliseo"
        >
          En Curso
        </span>
      </div>
      <div
        class="tier-name"
        :style="{ color: tierDisplay.color }"
      >
        {{ tierDisplay.name }} • {{ medal.finalElo }} LP
      </div>
    </div>

    <div
      v-if="isTopRank"
      class="podium-tag"
      :class="podiumTagClass"
    >
      <span
        v-if="podiumIcon"
        class="emoji"
      >{{ podiumIcon }}</span>
      <span v-else>Top {{ medal.rank }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ranked-medal-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: $spacing-md-alt;
  padding: 8px 10px;
  border: 1px solid Rgb(148 163 184 / 20%);
  border-radius: $radius-lg;
  background: Rgb(15 23 42 / 60%);
  overflow: hidden;
  cursor: pointer;
  user-select: none;

  .medal-icon-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 36px;
    height: 36px;
    border-radius: $radius-md;
    background: Rgb(0 0 0 / 40%);
    flex-shrink: 0;

    .tier-icon {
      font-size: var(--font-20);
    }

    .medal-sprite {
      width: 28px;
      height: 28px;
      object-fit: contain;
      image-rendering: pixelated;
      filter: Drop-Shadow(0 2px 4px Rgb(0 0 0 / 40%));
    }
  }

  .medal-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;

    .season-name {
      color: var(--slate-200);
      font-size: var(--font-12);
      font-weight: 700;
      line-height: 1.45;
      padding-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .season-meta {
      display: flex;
      align-items: center;
      gap: $spacing-sm-alt;
      margin-top: 1px;

      .season-date {
        color: var(--slate-400);
        font-size: var(--font-10);
        font-weight: 500;
        white-space: nowrap;
      }

      .active-tag {
        padding: 1px 4px;
        border: 1px solid Rgb(34 197 94 / 40%);
        border-radius: $radius-xs-alt;
        background: Rgb(34 197 94 / 20%);
        color: var(--green-light);
        font-size: var(--font-9);
        font-weight: 700;
        line-height: 1.2;
        letter-spacing: 0.3px;
      }
    }

    .tier-name {
      font-size: var(--font-11);
      font-weight: 600;
      margin-top: 2px;
    }
  }

  .podium-tag {
    padding: 2px 6px;
    border-radius: $radius-sm;
    background: Rgb(148 163 184 / 20%);
    color: var(--slate-200);
    font-size: var(--font-10);
    font-weight: 800;

    &.top-3 {
      border: 1px solid Rgb(234 179 8 / 40%);
      background: Rgb(234 179 8 / 25%);
      color: var(--amber-300);
    }

    &.top-1 {
      border: 1px solid var(--amber-dark);
      background: Rgb(234 179 8 / 40%);
      color: var(--white);
      box-shadow: var(--shadow-glow-yellow-sm);
    }
  }
}
</style>
