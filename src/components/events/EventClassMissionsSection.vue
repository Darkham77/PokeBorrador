<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { gsap } from 'gsap';
import { useModalStore } from '@/stores/modals';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { usePlayerClassStore } from '@/stores/player/playerClass';
import { CLASS_MISSIONS, CLASS_MISSIONS_BY_ID, isMissionId, type MissionId, isPlayerClassId, type PlayerClassId } from '@/data/player/playerClasses';
import { getClassMissionDetails, type DetailedMissionReward } from '@/logic/player/classMissionsData';
import { formatRemainingDuration } from '@/logic/utils/timeUtils';
import MissionCard from './MissionCard.vue';
import type { Pokemon } from '@/types/pokemon/pokemon';

const modalStore = useModalStore();
const gameStore = useGameStore();
const uiStore = useUIStore();
const classStore = usePlayerClassStore();

const activeMission = computed(() => classStore.activeMission);
const trainerLevel = computed(() => gameStore.state.trainerLevel || 1);

const now = ref(Temporal.Now.instant().epochMilliseconds);
let timer: gsap.core.Tween | null = null;

onMounted(() => {
  const MISSION_TICK_INTERVAL_SEC = 1;
  const updateTime = () => {
    now.value = Temporal.Now.instant().epochMilliseconds;
    timer = gsap.delayedCall(MISSION_TICK_INTERVAL_SEC, updateTime);
  };
  timer = gsap.delayedCall(MISSION_TICK_INTERVAL_SEC, updateTime);
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

function isCurrentActiveMission(mId: MissionId): boolean {
  return activeMission.value?.id === mId;
}

function isMissionCompleted(mId: MissionId): boolean {
  return isCurrentActiveMission(mId) && isMissionDone.value;
}

function isMissionAvailable(m: (typeof CLASS_MISSIONS)[number]): boolean {
  return canStartClassMission(m) || isCurrentActiveMission(m.id);
}

function getClassMissionCompletedBadgeText(mId: MissionId): string {
  if (!isCurrentActiveMission(mId)) return '';
  return isMissionDone.value ? 'LISTO PARA COBRAR' : 'EN CURSO';
}

function getActivePokemonInfoFor(mId: MissionId): string {
  return isCurrentActiveMission(mId) ? activePokemonInfo.value : '';
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
        :is-completed="isMissionCompleted(m.id)"
        :is-available="isMissionAvailable(m)"
        :unmet-requirement="getClassMissionUnmetText(m)"
        :available-requirement="getClassMissionAvailableText(m)"
        :completed-badge-text="getClassMissionCompletedBadgeText(m.id)"
        :is-active-mission="isCurrentActiveMission(m.id)"
        :active-pokemon-info="getActivePokemonInfoFor(m.id)"
        :progress-percent="missionProgress"
        :remaining-time-text="remainingTimeFormatted"
        @action="handleClassMissionAction(m.id)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

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
</style>
