<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { gsap } from 'gsap';
import { usePvPStore, type PassiveBattleReport } from '@/stores/pvp';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils';
import BoxPokemonCard from '@/components/box/BoxPokemonCard.vue';
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue';
import type { Pokemon } from '@/types/pokemon/pokemon';
import { DEFENSE_TOGGLE_BTN_HOVER_DURATION_SEC } from '@/logic/constants/animations';
import HomeWidgetMinimizeBtn from './HomeWidgetMinimizeBtn.vue';
import { resolveDefendingTeam } from '@/logic/pvp/pvpTeamHelper';
import { evaluatePokemonForSeason } from '@/logic/pvp/seasonTeamFilter';

interface Props {
  inModal?: boolean;
  columns?: 3 | 6;
}

const props = withDefaults(defineProps<Props>(), {
  inModal: false,
  columns: 3
});

const TOGGLE_BTN_HOVER_SCALE = 1.05;
const AVATAR_SIZE_PX = 32;
const DEFAULT_VICTORY_ELO_DELTA = 15;
const DEFAULT_DEFEAT_ELO_DELTA = -12;

const pvp = usePvPStore();
const gameStore = useGameStore();
const uiStore = useUIStore();

const defenseTeam = computed<Pokemon[]>(() => {
  return resolveDefendingTeam(gameStore.state);
});

const teamEligibility = computed(() => {
  const rules = pvp.currentSeasonRules;
  const map = new Map<string, { eligible: boolean; reason: string }>();
  if (!rules) return map;
  for (const mon of defenseTeam.value) {
    const check = evaluatePokemonForSeason(mon, rules);
    map.set(mon.uid || mon.id, {
      eligible: check.eligible,
      reason: check.reason || 'no cumple las reglas'
    });
  }
  return map;
});

watch(
  [() => pvp.passiveTeamActive, defenseTeam, () => pvp.currentSeasonRules],
  async ([isActive, team, rules]) => {
    if (!isActive || team.length === 0) return;
    if (rules) {
      for (const mon of team) {
        const check = evaluatePokemonForSeason(mon, rules);
        if (!check.eligible) {
          const reason = check.reason || 'no cumple las reglas de la temporada';
          await pvp.deactivatePassiveDefense(
            `Defensa Pasiva desactivada: ${mon.name} no cumple las reglas de la temporada (${reason}).`
          );
          return;
        }
      }
    }
    pvp.scheduleDefenseSnapshotSync();
  },
  { deep: true }
);

onMounted(() => {
  void pvp.loadPvPData();
});

onBeforeUnmount(() => {
  void pvp.flushPendingDefenseSnapshotSync();
});

function handleToggleBtnEnter(e: MouseEvent) {
  gsap.to(e.currentTarget, {
    scale: TOGGLE_BTN_HOVER_SCALE,
    duration: DEFENSE_TOGGLE_BTN_HOVER_DURATION_SEC,
    ease: 'power1.out'
  });
}

function handleToggleBtnLeave(e: MouseEvent) {
  gsap.to(e.currentTarget, {
    scale: 1,
    duration: DEFENSE_TOGGLE_BTN_HOVER_DURATION_SEC,
    ease: 'power1.in'
  });
}

function formatDate(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const instant = Temporal.Instant.from(isoStr);
    const zdt = instant.toZonedDateTimeISO(GAME_TIMEZONE);
    return `${zdt.day.toString().padStart(2, '0')}/${zdt.month.toString().padStart(2, '0')} ${zdt.hour.toString().padStart(2, '0')}:${zdt.minute.toString().padStart(2, '0')}`;
  } catch {
    return '';
  }
}

function handleViewTrainerProfile(rep: PassiveBattleReport) {
  const targetId = rep.opponent_profile?.id || rep.opponent_id;
  if (targetId && targetId !== 'local_user') {
    uiStore.open('TrainerProfile', { userId: targetId });
  }
}

function handlePokemonClick(pokemon: Pokemon, index: number) {
  uiStore.openPokemonDetail(pokemon, index, 'defense');
}

function getEloDeltaText(rep: PassiveBattleReport): string {
  if (rep.report_data?.deltaElo !== undefined && rep.report_data?.deltaElo !== null) {
    const delta = Number(rep.report_data.deltaElo);
    return delta > 0 ? `+${delta} ELO` : `${delta} ELO`;
  }
  return rep.result === 'victory' ? `+${DEFAULT_VICTORY_ELO_DELTA} ELO` : `${DEFAULT_DEFEAT_ELO_DELTA} ELO`;
}

function openTeamManagement() {
  uiStore.toggleTeamManagement('pvp6');
}
</script>

<template>
  <div
    id="widget-passive-defense"
    class="home-passive-defense-widget"
    :class="{ 'home-section-card': !props.inModal, 'in-modal': props.inModal }"
  >
    <!-- Header -->
    <div class="card-header-bar">
      <div class="title-wrap">
        <span class="emoji card-icon">🛡️</span>
        <div class="title-text-group">
          <h3 class="card-title">
            DEFENSA PASIVA
          </h3>
          <span class="card-subtitle">Tu equipo actual defenderá tu posición mientras no estés en línea.</span>
        </div>
      </div>

      <div class="header-actions">
        <button
          :class="{ active: pvp.passiveTeamActive }"
          class="toggle-btn text-outline"
          @click.stop="pvp.togglePassiveTeam"
          @mouseenter="handleToggleBtnEnter"
          @mouseleave="handleToggleBtnLeave"
        >
          {{ pvp.passiveTeamActive ? 'ACTIVADO' : 'DESACTIVADO' }}
        </button>
        <HomeWidgetMinimizeBtn
          v-if="!props.inModal"
          widget-id="defense"
        />
      </div>
    </div>

    <!-- Status Banner -->
    <div
      v-if="pvp.passiveTeamActive"
      class="def-status active text-outline"
    >
      ¡Tu equipo de defensa está protegiendo tu ELO en la Arena!
    </div>
    <div
      v-else
      class="def-status inactive text-outline"
    >
      Advertencia: Sin defensa pasiva, tu ELO bajará más rápido si te derrotan.
    </div>

    <!-- Defending Team Preview -->
    <div class="defense-team-preview">
      <div class="team-preview-header">
        <h4 class="team-label text-outline">
          EQUIPO DEFENSOR ACTUAL
        </h4>
        <button
          v-gsap-hover
          class="card-action-btn text-outline"
          @click.stop="openTeamManagement"
        >
          <span class="emoji">👥</span> CAMBIAR EQUIPO
        </button>
      </div>
      <div
        v-if="defenseTeam.length > 0"
        class="defense-grid"
        :style="{ '--defense-cols': props.columns }"
      >
        <div
          v-for="(mon, idx) in defenseTeam"
          :key="mon.uid || mon.id"
          class="defense-card-wrapper"
          :class="{ 'ineligible-card': teamEligibility.get(mon.uid || mon.id)?.eligible === false }"
        >
          <BoxPokemonCard
            :pokemon="mon"
            :index="idx"
            :hide-stats="true"
            type-pill-size="ssm"
            class="defense-card-override clickable-defense-card"
            @click="() => handlePokemonClick(mon, idx)"
          />
          <div
            v-if="teamEligibility.get(mon.uid || mon.id)?.eligible === false"
            class="ineligible-cartel text-outline"
          >
            <span class="emoji">⚠️</span> {{ teamEligibility.get(mon.uid || mon.id)?.reason }}
          </div>
        </div>
      </div>
      <div
        v-else
        class="empty-team-msg"
      >
        No hay Pokémon disponibles en tu equipo para defender.
      </div>
    </div>

    <!-- Recent Defense History -->
    <div class="defense-history-section">
      <h4 class="history-label text-outline">
        HISTORIAL DE DEFENSAS RECIENTES
      </h4>
      <div
        v-if="pvp.defenseReports && pvp.defenseReports.length > 0"
        class="history-list custom-scrollbar"
      >
        <div
          v-for="rep in pvp.defenseReports"
          :key="rep.id"
          class="history-row"
          :class="rep.result"
          @click="handleViewTrainerProfile(rep)"
        >
          <div class="trainer-avatar-col">
            <TrainerAvatar
              :profile="rep.opponent_profile"
              :player-class="String(rep.opponent_profile?.playerClass || rep.report_data?.playerClass || 'Entrenador')"
              :size="AVATAR_SIZE_PX"
            />
          </div>
          <div class="rep-details">
            <div class="trainer-header-row">
              <span class="rep-opponent text-outline">{{ rep.opponent_profile?.username || rep.report_data?.opponent || 'Rival' }}</span>
              <span class="rep-class-badge">{{ rep.opponent_profile?.playerClass || rep.report_data?.playerClass || 'Entrenador' }}</span>
            </div>
            <div class="rep-meta-row">
              <span
                v-if="rep.report_data?.turns"
                class="rep-turns"
              >{{ rep.report_data.turns }} turnos</span>
              <span class="rep-date">{{ formatDate(rep.created_at) }}</span>
            </div>
          </div>
          <div class="rep-badges-col">
            <span
              class="result-badge text-outline"
              :class="rep.result"
            >
              {{ rep.result === 'victory' ? 'VICTORIA' : 'DERROTA' }}
            </span>
            <span
              class="elo-delta-badge text-outline"
              :class="rep.result === 'victory' ? 'gain' : 'loss'"
            >
              {{ getEloDeltaText(rep) }}
            </span>
          </div>
        </div>
      </div>
      <div
        v-else
        class="empty-history"
      >
        Sin combates defensivos registrados aún.
      </div>
    </div>
  </div>
</template>

<style scoped src="./HomePassiveDefenseWidget.styles.scss" lang="scss"></style>
