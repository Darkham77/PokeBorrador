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
</script>

<template>
  <div
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
      v-if="medal.rank && medal.rank <= 10"
      class="podium-tag"
      :class="{ 'top-1': medal.rank === 1, 'top-3': medal.rank <= 3 }"
    >
      <span
        v-if="medal.rank === 1"
        class="emoji"
      >🥇</span>
      <span
        v-else-if="medal.rank === 2"
        class="emoji"
      >🥈</span>
      <span
        v-else-if="medal.rank === 3"
        class="emoji"
      >🥉</span>
      <span v-else>Top {{ medal.rank }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ranked-medal-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: Rgba(15, 23, 42, 0.6);
  border: 1px solid Rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  user-select: none;

  .medal-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: Rgba(0, 0, 0, 0.4);
    border-radius: 6px;
    flex-shrink: 0;

    .tier-icon {
      font-size: 1.3rem;
    }

    .medal-sprite {
      width: 28px;
      height: 28px;
      object-fit: contain;
      image-rendering: pixelated;
      filter: Drop-Shadow(0 2px 4px Rgba(0, 0, 0, 0.4));
    }
  }

  .medal-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;

    .season-name {
      font-size: 0.75rem;
      line-height: 1.45;
      padding-bottom: 2px;
      font-weight: 700;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .season-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 1px;

      .season-date {
        font-size: 0.65rem;
        color: #94a3b8;
        font-weight: 500;
        white-space: nowrap;
      }

      .active-tag {
        font-size: 0.58rem;
        font-weight: 700;
        padding: 1px 4px;
        border-radius: 3px;
        background: Rgba(34, 197, 94, 0.2);
        color: #4ade80;
        border: 1px solid Rgba(34, 197, 94, 0.4);
        line-height: 1.2;
        letter-spacing: 0.3px;
      }
    }

    .tier-name {
      font-size: 0.7rem;
      font-weight: 600;
      margin-top: 2px;
    }
  }

  .podium-tag {
    font-size: 0.65rem;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    background: Rgba(148, 163, 184, 0.2);
    color: #e2e8f0;

    &.top-3 {
      background: Rgba(234, 179, 8, 0.25);
      color: #fde047;
      border: 1px solid Rgba(234, 179, 8, 0.4);
    }

    &.top-1 {
      background: Rgba(234, 179, 8, 0.4);
      color: #fff;
      border: 1px solid #eab308;
      box-shadow: 0 0 6px Rgba(234, 179, 8, 0.5);
    }
  }
}
</style>
