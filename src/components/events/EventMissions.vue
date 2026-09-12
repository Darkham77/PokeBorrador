<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { gsap } from 'gsap';
import { useBreedingStore } from '@/stores/breeding';
import { useModalStore } from '@/stores/modals';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { usePlayerClassStore } from '@/stores/player/playerClass';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { CLASS_MISSIONS, CLASS_MISSIONS_BY_ID, isMissionId, type MissionId, isPlayerClassId, type PlayerClassId } from '@/data/player/playerClasses';
import { getClassMissionDetails, type DetailedMissionReward } from '@/logic/player/classMissionsData';
import { getItemById } from '@/data/inventory/items';
import { formatRemainingDuration } from '@/logic/utils/timeUtils';
import MissionCard from './MissionCard.vue';
import HomeWidgetRefreshBtn from '@/components/home/HomeWidgetRefreshBtn.vue';
import type { DaycareMission } from '@/types/breeding/breeding';
import type { Pokemon } from '@/types/pokemon/pokemon';

interface Props {
  hideRefresh?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  hideRefresh: false
});

const breedingStore = useBreedingStore();
const modalStore = useModalStore();
const gameStore = useGameStore();
const uiStore = useUIStore();
const classStore = usePlayerClassStore();

const getMatchingPokesForMission = (mission: DaycareMission) => {
  const allPokes = gameStore.allPokemonList;
  const targetId = mission.targetId;
  return allPokes.filter(p => {
    if (p.onMission || p.inDaycare || p.onDefense || p.isIllegal) return false;
    if (p.id !== targetId) return false;
    
    const req = mission.requirement || { type: 'level', minLevel: 0 };
    if (req.type === 'level') return p.level >= (req.minLevel || 0);
    if (req.type === 'iv_total') {
      const total = (p.ivs?.hp || 0) + (p.ivs?.atk || 0) + (p.ivs?.def || 0) + (p.ivs?.spa || 0) + (p.ivs?.spd || 0) + (p.ivs?.spe || 0);
      return total >= (req.minIvTotal || 0);
    }
    if (req.type === 'nature') return p.nature === req.nature;
    if (req.type === 'iv_31') return p.ivs?.[req.stat31 as keyof Pokemon['ivs']] === 31;
    return true;
  });
};

const canDeliverMission = (mission: DaycareMission) => {
  if (mission.completed) return false;
  return getMatchingPokesForMission(mission).length > 0;
};

const openDelivery = (idx: number) => {
  const mission = breedingStore.dailyMissions[idx];
  if (!mission) return;
  
  const matchingPokes = getMatchingPokesForMission(mission);
  
  if (matchingPokes.length === 0) {
    uiStore.notify('No tienes ningún Pokémon que cumpla los requisitos de esta misión.', '⚠️');
    return;
  }

  const allowedIds = matchingPokes.map(p => p.uid);
  
  modalStore.open('PokemonSelection', {
    title: 'ENTREGAR POKÉMON',
    subtitle: `Elige el Pokémon para entregar a ${mission.trainerName}`,
    allowedIds,
    autoConfirm: true,
    onConfirm: (selected: Pokemon[]) => {
      const first = selected?.[0];
      if (first) {
        breedingStore.completeMission(idx, first.uid);
      }
    }
  });
};

const activeMission = computed(() => classStore.activeMission);
const trainerLevel = computed(() => gameStore.state.trainerLevel || 1);

const now = ref(Temporal.Now.instant().epochMilliseconds);
let timer: gsap.core.Tween | null = null;

onMounted(() => {
  breedingStore.loadDaycare();
  breedingStore.checkDailyReset();

  const updateTime = () => {
    now.value = Temporal.Now.instant().epochMilliseconds;
    timer = gsap.delayedCall(1, updateTime);
  };
  timer = gsap.delayedCall(1, updateTime);
});

onUnmounted(() => {
  if (timer) timer.kill();
});

const missionProgress = computed(() => {
  if (!activeMission.value) return 0;
  const total = activeMission.value.endsAt - activeMission.value.startedAt;
  const elapsed = now.value - activeMission.value.startedAt;
  return Math.min(100, Math.max(0, Math.floor((elapsed / total) * 100)));
});

const isMissionDone = computed(() => {
  if (!activeMission.value) return false;
  return now.value >= activeMission.value.endsAt;
});

const remainingTimeMs = computed(() => {
  if (!activeMission.value) return 0;
  return Math.max(0, activeMission.value.endsAt - now.value);
});

const remainingTimeFormatted = computed(() => {
  if (!activeMission.value) return '';
  if (isMissionDone.value) return '¡Listo para cobrar!';
  return formatRemainingDuration(remainingTimeMs.value);
});

const getDailyMissionUnmetText = (mission: DaycareMission) => {
  if (mission.completed) return '';
  if (canDeliverMission(mission)) return '';
  return `Requisito no cumplido: ${mission.reqText || 'Pokémon no encontrado en Equipo o Caja'}`;
};

const getDailyMissionAvailableText = (mission: DaycareMission) => {
  if (mission.completed) return '';
  if (canDeliverMission(mission)) return '¡Tienes el Pokémon listo para entregar!';
  return '';
};

const getMissionRewardItem = (mission: DaycareMission) => {
  return getItemById(mission.reward.id);
};

const hasPoisonPokemonAvailable = computed(() => {
  return gameStore.allPokemonList.some(p => {
    if (p.onMission || p.inDaycare || p.onDefense || p.isIllegal) return false;
    return p.type === 'poison' || p.type2 === 'poison';
  });
});

const canStartClassMission = (m: (typeof CLASS_MISSIONS)[number]) => {
  if (activeMission.value) return false;
  if (trainerLevel.value < m.reqLv) return false;
  if (classStore.currentClassDef?.id === 'rocket' && !hasPoisonPokemonAvailable.value) return false;
  return true;
};

const isClassMissionDisabled = (m: (typeof CLASS_MISSIONS)[number]) => {
  if (activeMission.value?.id === m.id) {
    return !isMissionDone.value;
  }
  return !canStartClassMission(m);
};

const getClassMissionBtnText = (m: (typeof CLASS_MISSIONS)[number]) => {
  if (activeMission.value?.id === m.id) {
    return isMissionDone.value ? 'COBRAR BOTÍN' : 'EN CURSO';
  }
  if (activeMission.value) return 'EN ESPERA';
  if (trainerLevel.value < m.reqLv) return 'BLOQUEADO';
  if (classStore.currentClassDef?.id === 'rocket' && !hasPoisonPokemonAvailable.value) return 'SIN POKÉMON';
  return 'DESPLEGAR';
};

const getClassMissionUnmetText = (m: (typeof CLASS_MISSIONS)[number]) => {
  if (activeMission.value?.id === m.id) return '';
  if (activeMission.value) {
    return 'Ya tienes una operación en curso';
  }
  if (trainerLevel.value < m.reqLv) {
    return `Requiere Nivel de Entrenador ${m.reqLv} (Tu nivel: ${trainerLevel.value})`;
  }
  if (classStore.currentClassDef?.id === 'rocket' && !hasPoisonPokemonAvailable.value) {
    return 'Requiere 1 Pokémon tipo VENENO disponible en Equipo o Caja';
  }
  return '';
};

const getClassMissionAvailableText = (m: (typeof CLASS_MISSIONS)[number]) => {
  if (activeMission.value?.id === m.id) return '';
  if (canStartClassMission(m)) {
    return `Listo para desplegar (Nivel ${m.reqLv} alcanzado)`;
  }
  return '';
};

const activeMissionPokemon = computed<Pokemon | null>(() => {
  if (!activeMission.value) return null;
  const uid = activeMission.value.targetPokemonUid as string | undefined;
  if (uid) return gameStore.getPokemonByUid(uid);
  const idx = activeMission.value.targetPokemonIdx as number | undefined;
  if (idx !== undefined && idx >= 0) return gameStore.state.box[idx] || null;
  return null;
});

const activePokemonInfo = computed(() => {
  if (!activeMissionPokemon.value) return '';
  const p = activeMissionPokemon.value;
  const totalIvs = p.ivs ? (p.ivs.hp + p.ivs.atk + p.ivs.def + p.ivs.spa + p.ivs.spd + p.ivs.spe) : 0;
  return `${p.name} (Nv. ${p.level || 1}, ${totalIvs} IVs)`;
});

const currentClassId = computed<PlayerClassId>(() => {
  const cls = classStore.playerClass;
  return isPlayerClassId(cls) ? cls : 'cazabichos';
});

const getClassMissionRewards = (mId: MissionId): readonly DetailedMissionReward[] => {
  const details = getClassMissionDetails(currentClassId.value, mId);
  if (!details.rewards) return [];

  // When this mission is currently active and has a calculated projected reward
  if (activeMission.value?.id === mId && activeMission.value?.projectedReward) {
    const fixedMoney = `₽${Number(activeMission.value.projectedReward).toLocaleString()}`;
    return details.rewards.map(r => {
      const isMoneyReward = r.icon === '₽' || 
        r.label.toLowerCase().includes('dinero') || 
        r.label.toLowerCase().includes('dividendo') || 
        r.label.toLowerCase().includes('fortuna');
      
      if (isMoneyReward) {
        return {
          ...r,
          val: `${fixedMoney} (Fijado)`,
          tooltipDesc: `Monto fijado según el espécimen entregado (${activePokemonInfo.value}): ${fixedMoney}. Se acreditará al culminar la operación.`
        };
      }
      return r;
    });
  }

  return details.rewards;
};

const isCollecting = ref(false);

async function collectClassMission() {
  if (isCollecting.value) return;
  isCollecting.value = true;
  try {
    await classStore.collectMission();
  } finally {
    isCollecting.value = false;
  }
}

function handleClassMissionAction(missionId: MissionId) {
  if (activeMission.value?.id === missionId) {
    if (isMissionDone.value) {
      collectClassMission();
    }
    return;
  }
  startClassMission(missionId);
}

async function startClassMission(missionId: MissionId) {
  if (!isMissionId(missionId)) return;
  const m = CLASS_MISSIONS_BY_ID[missionId];
  if (!m) return;
  const cls = classStore.playerClass;
  
  if (cls === 'cazabichos') {
    classStore.startMission(missionId);
  } else {
    const allPokes = gameStore.allPokemonList;
    const isRocket = cls === 'rocket';
    const filtered = allPokes.filter(p => {
      if (p.onMission || p.inDaycare || p.onDefense || p.isIllegal) return false;
      if (isRocket) {
        return p.type === 'poison' || p.type2 === 'poison';
      }
      return true;
    });
    
    if (filtered.length === 0) {
      uiStore.notify(
        isRocket 
          ? 'No tienes ningún Pokémon tipo VENENO disponible.' 
          : 'No tienes ningún Pokémon disponible para esta misión.', 
        '⚠️'
      );
      return;
    }

    const allowedIds = filtered.map(p => p.uid);

    modalStore.open('PokemonSelection', {
      title: isRocket ? '💀 SACRIFICIO ROCKET' : '⚡ ENVIAR POKÉMON',
      subtitle: isRocket 
        ? 'Selecciona 1 Pokémon tipo VENENO para el mercado negro.' 
        : 'Selecciona al Pokémon que realizará la misión.',
      allowedIds,
      autoConfirm: true,
      onConfirm: (selected: Pokemon[]) => {
        const p = selected?.[0];
        if (p) {
          const teamIdx = gameStore.state.team.findIndex((tp: Pokemon | null) => tp && tp.uid === p.uid);
          if (teamIdx !== -1) {
            if (gameStore.state.team.length <= 1) {
              uiStore.notify('No puedes enviar a tu único Pokémon del equipo.', '⚠️');
              return;
            }
            const success = gameStore.sendToBox(teamIdx);
            if (!success) return;
          }

          const idx = gameStore.state.box.findIndex((bp: Pokemon | null) => bp && bp.uid === p.uid);
          if (idx !== -1) {
            classStore.startMission(missionId, { targetPokemonIdx: idx, targetPokemonUid: p.uid });
          }
        }
      }
    });
  }
}
</script>

<template>
  <div class="event-missions">
    <header class="missions-header">
      <div class="title-wrap">
        <h3>Misiones Diarias</h3>
      </div>
      <div
        v-if="!props.hideRefresh"
        class="missions-header-actions"
      >
        <span
          class="refresh-count"
          title="Refrescos disponibles"
        >
          <span class="refresh-label">Refrescos: </span>{{ breedingStore.missionRefreshes }}/3
        </span>
        <HomeWidgetRefreshBtn 
          id="missions-refresh-btn"
          :disabled="breedingStore.missionRefreshes <= 0"
          @click.stop="breedingStore.refreshMissions"
        />
      </div>
    </header>

    <div class="missions-grid">
      <MissionCard
        v-for="(mission, index) in (breedingStore.dailyMissions as DaycareMission[])"
        :id="'daily-' + index"
        :key="index"
        :avatar="getAssetUrl(ASSET_TYPES.TRAINER, mission.trainerSprite)"
        is-avatar-url
        :title="mission.trainerName + ' dice:'"
        :dialogue="mission.dialogue"
        :reward-icon="getMissionRewardItem(mission).icon || '🎁'"
        reward-label="Recompensa"
        :reward-val="getMissionRewardItem(mission).name + ' x' + mission.reward.qty"
        :reward-id="mission.reward.id"
        :btn-text="mission.completed ? 'ENTREGADA' : (canDeliverMission(mission) ? 'ENTREGAR' : 'NO DISPONIBLE')"
        :btn-disabled="!canDeliverMission(mission)"
        :is-completed="mission.completed"
        :is-available="canDeliverMission(mission)"
        :unmet-requirement="getDailyMissionUnmetText(mission)"
        :available-requirement="getDailyMissionAvailableText(mission)"
        completed-badge-text="COMPLETADA"
        @action="openDelivery(index)"
      />
    </div>

    <!-- Class Missions Section -->
    <div 
      v-if="classStore.currentClassDef" 
      class="class-missions-container"
      :style="{ '--class-color': classStore.currentClassDef.color || '#3b82f6' }"
    >
      <header class="section-title-wrap">
        <h3>Despliegues de {{ classStore.currentClassDef.name }}</h3>
        <span class="class-level-badge">NIVEL {{ classStore.classLevel }}</span>
      </header>

      <div class="missions-grid">
        <MissionCard
          v-for="m in CLASS_MISSIONS"
          :id="'class-' + m.id"
          :key="m.id"
          :avatar="classStore.currentClassDef?.icon || '🚀'"
          :title="m.durationHs + 'H · REQUISITO: NV. ' + m.reqLv"
          :dialogue="getClassMissionDetails(currentClassId, m.id).dialogue"
          :activation-req="getClassMissionDetails(currentClassId, m.id).activationReq"
          :reward-conditions="getClassMissionDetails(currentClassId, m.id).rewardConditions"
          :rules-text="getClassMissionDetails(currentClassId, m.id).rulesText"
          :rewards-list="getClassMissionRewards(m.id)"
          :btn-text="getClassMissionBtnText(m)"
          :btn-disabled="isClassMissionDisabled(m)"
          :is-completed="activeMission?.id === m.id && isMissionDone"
          :is-available="canStartClassMission(m) || (activeMission?.id === m.id)"
          :unmet-requirement="getClassMissionUnmetText(m)"
          :available-requirement="getClassMissionAvailableText(m)"
          :completed-badge-text="activeMission?.id === m.id && isMissionDone ? 'LISTO PARA COBRAR' : (activeMission?.id === m.id ? 'EN CURSO' : '')"
          :is-active-mission="activeMission?.id === m.id"
          :active-pokemon-info="activeMission?.id === m.id ? activePokemonInfo : ''"
          :progress-percent="missionProgress"
          :remaining-time-text="remainingTimeFormatted"
          @action="handleClassMissionAction(m.id)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.event-missions {
  padding: 10px 0;
}

.missions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  min-width: 0;

  .title-wrap {
    min-width: 0;
  }

  h3 { font-weight: 800; @include pixelated; font-size: 10px; color: var(--yellow, #facc15); margin: 0; word-break: break-word; }

  .missions-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    .refresh-count { 
      font-size: 10px; 
      color: var(--gray, #94a3b8); 
      @include pixelated;
      background: Rgba(255, 255, 255, 0.05);
      border: 1px solid Rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 3px 8px;
      white-space: nowrap;

      .refresh-label {
        @media (max-width: 640px) {
          display: none;
        }
      }
    }
  }
}

.missions-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  
  @media (min-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
  
  @media (min-width: 950px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

.class-missions-container {
  margin-top: 24px;
  border-top: 1px solid Rgba(255, 255, 255, 0.05);
  padding-top: 24px;
  margin-bottom: 24px;

  .section-title-wrap {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h3 {
      font-weight: 800;
      @include pixelated;
      font-size: 10px;
      color: var(--class-color);
      margin: 0;
    }

    .class-level-badge {
      background: var(--class-color);
      color: white;
      font-size: 9px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 4px;
      @include pixelated;
      border: 1px solid #000000;
      text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
    }
  }
}
</style>
