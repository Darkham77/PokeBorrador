<script setup lang="ts">
import { computed } from 'vue';
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils';
import type { PassiveBattleReport } from '@/types/battle/pvp';
import { useUIStore } from '@/stores/ui';
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue';

interface Props {
  report: PassiveBattleReport;
}

const props = defineProps<Props>();

const uiStore = useUIStore();

const AVATAR_SIZE_PX = 32;
const DEFAULT_VICTORY_ELO_DELTA = 15;
const DEFAULT_DEFEAT_ELO_DELTA = -12;

const eloDeltaText = computed(() => {
  const rep = props.report;
  if (rep.report_data?.deltaElo !== undefined && rep.report_data?.deltaElo !== null) {
    const delta = Number(rep.report_data.deltaElo);
    return delta > 0 ? `+${delta} ELO` : `${delta} ELO`;
  }
  return rep.result === 'victory' ? `+${DEFAULT_VICTORY_ELO_DELTA} ELO` : `${DEFAULT_DEFEAT_ELO_DELTA} ELO`;
});

const opponentFactionLabel = computed(() => {
  const rep = props.report;
  const faction = rep.opponent_profile?.faction || (typeof rep.report_data?.faction === 'string' ? rep.report_data.faction : undefined);
  if (!faction) return 'SIN BANDO';
  const clean = faction.trim().toLowerCase();
  if (clean === 'union') return 'UNIÓN';
  if (clean === 'poder') return 'PODER';
  return 'SIN BANDO';
});

const opponentFactionClass = computed(() => {
  const rep = props.report;
  const faction = rep.opponent_profile?.faction || (typeof rep.report_data?.faction === 'string' ? rep.report_data.faction : undefined);
  if (!faction) return '';
  const clean = faction.trim().toLowerCase();
  if (clean === 'union' || clean === 'poder') return clean;
  return '';
});

const formattedDate = computed(() => {
  const isoStr = props.report.created_at;
  if (!isoStr) return '';
  try {
    const instant = Temporal.Instant.from(isoStr);
    const zdt = instant.toZonedDateTimeISO(GAME_TIMEZONE);
    return `${zdt.day.toString().padStart(2, '0')}/${zdt.month.toString().padStart(2, '0')} ${zdt.hour.toString().padStart(2, '0')}:${zdt.minute.toString().padStart(2, '0')}`;
  } catch {
    return '';
  }
});

function handleViewTrainerProfile() {
  const rep = props.report;
  const targetId = rep.opponent_profile?.id || rep.opponent_id;
  if (targetId && targetId !== 'local_user') {
    uiStore.open('TrainerProfile', { userId: targetId });
  }
}
</script>

<template>
  <div
    class="history-row"
    :class="report.result"
    @click="handleViewTrainerProfile"
  >
    <div class="trainer-avatar-col">
      <TrainerAvatar
        :profile="report.opponent_profile"
        :player-class="String(report.opponent_profile?.playerClass || report.report_data?.playerClass || 'Entrenador')"
        :size="AVATAR_SIZE_PX"
      />
    </div>
    <div class="rep-details">
      <div class="trainer-header-row">
        <span class="rep-opponent text-outline">{{ report.opponent_profile?.username || report.report_data?.opponent || 'Rival' }}</span>
        <span
          class="rep-faction-badge"
          :class="opponentFactionClass"
        >{{ opponentFactionLabel }}</span>
      </div>
      <div class="rep-meta-row">
        <span
          v-if="report.report_data?.turns"
          class="rep-turns"
        >{{ report.report_data.turns }} turnos</span>
        <span class="rep-date">{{ formattedDate }}</span>
      </div>
    </div>
    <div class="rep-badges-col">
      <span
        class="result-badge text-outline"
        :class="report.result"
      >
        {{ report.result === 'victory' ? 'VICTORIA' : 'DERROTA' }}
      </span>
      <span
        class="elo-delta-badge text-outline"
        :class="report.result === 'victory' ? 'gain' : 'loss'"
      >
        {{ eloDeltaText }}
      </span>
    </div>
  </div>
</template>

<style scoped src="./PassiveDefenseHistoryRow.styles.scss" lang="scss"></style>
