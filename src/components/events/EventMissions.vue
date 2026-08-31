<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { gsap } from 'gsap';
import { useBreedingStore } from '@/stores/breeding';
import { useModalStore } from '@/stores/modals';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { usePlayerClassStore } from '@/stores/player/playerClass';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { CLASS_MISSIONS, CLASS_MISSIONS_BY_ID, isMissionId } from '@/data/player/playerClasses';
import MissionCard from './MissionCard.vue';
import type { DaycareMission } from '@/types/breeding/breeding';
import type { Pokemon } from '@/types/pokemon/pokemon';

const breedingStore = useBreedingStore();
const modalStore = useModalStore();
const gameStore = useGameStore();
const uiStore = useUIStore();
const classStore = usePlayerClassStore();

const getMatchingPokesForMission = (mission: DaycareMission) => {
  const team = gameStore.state.team || [];
  const box = gameStore.state.box || [];
  const allPokes = [...team, ...box].filter((p): p is Pokemon => p !== null); // o1-ok
  
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

function getClassReward(clsId: string | undefined) {
  if (clsId === 'rocket') return { icon: '₽', name: '₽ y Recompensas' };
  if (clsId === 'cazabichos') return { icon: '🐛', name: 'Pokémon Bicho e Ítems' };
  if (clsId === 'entrenador') return { icon: '📈', name: 'Experiencia de Combate' };
  if (clsId === 'criador') return { icon: '🧬', name: 'Mejora de IVs' };
  return { icon: '🎁', name: 'Recompensas de Clase' };
}

function getMissionDesc(mId: string, clsId: string | undefined) {
  if (clsId === 'cazabichos') {
    if (mId === 'mission_6h') return 'Recolecta néctar y feromonas en el bosque para atraer especímenes comunes.';
    if (mId === 'mission_12h') return 'Captura especímenes raros y cataloga la población de coleópteros de la zona.';
    if (mId === 'mission_24h') return 'Expedición profunda en busca de especímenes exóticos con IVs genéticos excepcionales.';
  }
  if (clsId === 'rocket') {
    if (mId === 'mission_6h') return 'Extorsión local a comerciantes y patrullaje de territorio bajo control Rocket.';
    if (mId === 'mission_12h') return 'Exportación de especímenes incautados al mercado negro para obtener altos dividendos.';
    if (mId === 'mission_24h') return 'Infiltración en las instalaciones de Silph Co. para sustraer prototipos de tecnología secreta.';
  }
  if (clsId === 'entrenador') {
    if (mId === 'mission_6h') return 'Rutina de calentamiento y combates rápidos en el gimnasio local para afilar reflejos.';
    if (mId === 'mission_12h') return 'Sesión intensa en gimnasio de alto rendimiento para potenciar la experiencia de combate.';
    if (mId === 'mission_24h') return 'Maratón de duelos contra líderes veteranos y optimización táctica del equipo a nivel profesional.';
  }
  if (clsId === 'criador') {
    if (mId === 'mission_6h') return 'Monitoreo y análisis nutricional de huevos en la incubadora de la guardería.';
    if (mId === 'mission_12h') return 'Entrenamiento genético intensivo y selección de rasgos para mejorar estadísticas base.';
    if (mId === 'mission_24h') return 'Optimización molecular avanzada de la cadena de ADN para transferir herencias genéticas perfectas.';
  }
  return 'Realiza tareas especiales de clase.';
}

async function startClassMission(missionId: string) {
  if (!isMissionId(missionId)) return;
  const m = CLASS_MISSIONS_BY_ID[missionId];
  if (!m) return;
  const cls = classStore.playerClass;
  
  if (cls === 'cazabichos') {
    classStore.startMission(missionId);
  } else {
    const box = gameStore.state.box || [];
    const team = gameStore.state.team || [];
    const allPokes = [...team, ...box].filter((p): p is Pokemon => p !== null); // o1-ok
    
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
        <span class="refresh-count">Refrescos: {{ breedingStore.missionRefreshes }}/3</span>
      </div>
      <button 
        id="missions-refresh-btn"
        class="card-action-btn" 
        :disabled="breedingStore.missionRefreshes <= 0"
        @click.stop="breedingStore.refreshMissions"
      >
        <span class="btn-icon">↻</span> REFRESCAR
      </button>
    </header>

    <div class="missions-grid">
      <MissionCard
        v-for="(mission, index) in (breedingStore.dailyMissions as DaycareMission[])"
        :key="index"
        :avatar="getAssetUrl(ASSET_TYPES.TRAINER, mission.trainerSprite)"
        is-avatar-url
        :title="mission.trainerName + ' dice:'"
        :dialogue="mission.dialogue"
        :reward-icon="mission.reward.icon"
        reward-label="Recompensa"
        :reward-val="mission.reward.name + ' x' + mission.reward.qty"
        :reward-id="mission.reward.id"
        btn-text="ENTREGAR"
        :btn-disabled="!canDeliverMission(mission)"
        :is-completed="mission.completed"
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

      <!-- Active Mission Banner -->
      <div
        v-if="activeMission"
        class="active-mission-banner"
      >
        <div class="banner-info">
          <span class="banner-title">{{ isMissionDone ? 'OPERACIÓN COMPLETADA' : 'OPERACIÓN EN CURSO' }}</span>
          <p class="m-name">
            {{ (activeMission?.id && isMissionId(activeMission.id)) ? CLASS_MISSIONS_BY_ID[activeMission.id]?.name : '' }}
          </p>
          <div class="mission-progress-bar">
            <div
              class="progress-fill"
              :style="{ width: missionProgress + '%' }"
            />
          </div>
        </div>
        <button
          v-if="isMissionDone"
          class="collect-btn"
          @click.stop="classStore.collectMission"
        >
          RECLAMAR
        </button>
        <div
          v-else
          class="timer-dot"
        />
      </div>

      <div class="missions-grid">
        <MissionCard
          v-for="m in CLASS_MISSIONS"
          :key="m.id"
          :avatar="classStore.currentClassDef?.icon"
          :title="m.durationHs + 'H · REQUISITO: NV. ' + m.reqLv"
          :dialogue="getMissionDesc(m.id, classStore.currentClassDef?.id)"
          :reward-icon="getClassReward(classStore.currentClassDef?.id).icon"
          reward-label="Recompensa Estimada"
          :reward-val="getClassReward(classStore.currentClassDef?.id).name"
          :btn-text="activeMission?.id === m.id ? 'EN CURSO' : (activeMission ? 'BLOQUEADO' : 'DESPLEGAR')"
          :btn-disabled="trainerLevel < m.reqLv || !!activeMission"
          :is-completed="activeMission?.id === m.id"
          @action="startClassMission(m.id)"
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

  h3 { font-weight: 800; @include pixelated; font-size: 10px; color: Rgba(250, 204, 21, 1); }
  .refresh-count { font-size: 12px; color: Rgba(148, 163, 184, 1); }
}

.card-action-btn {
  @include pixelated;
  font-size: 8px;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: Rgba(255, 255, 255, 0.05);
  border: 1px solid Rgba(255, 255, 255, 0.15);
  color: var(--white, #ffffff);
  cursor: pointer;
  box-sizing: border-box;
  transition: all 0.2s ease;
  white-space: nowrap;
  letter-spacing: 0.5px;

  .btn-icon {
    font-size: 12px;
    line-height: 1;
  }

  &:hover:not(:disabled) {
    background: Rgba(255, 255, 255, 0.12);
    border-color: var(--yellow, #facc15);
    color: var(--yellow, #facc15);
    box-shadow: 0 0 10px Rgba(250, 204, 21, 0.2);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
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

  .active-mission-banner {
    background: Rgba(34, 197, 94, 0.06);
    border: 1px solid Rgba(34, 197, 94, 0.2);
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 16px;

    .banner-info {
      flex: 1;
      
      .banner-title {
        @include pixelated;
        font-size: 8px;
        color: Rgba(34, 197, 94, 1);
        margin-bottom: 4px;
        display: block;
      }
      
      .m-name {
        font-size: 12px;
        color: white;
        font-weight: 700;
        margin: 0 0 8px 0;
      }
    }

    .mission-progress-bar {
      height: 6px;
      background: Rgba(0, 0, 0, 0.3);
      border-radius: 3px;
      overflow: hidden;
      
      .progress-fill {
        height: 100%;
        background: Rgba(34, 197, 94, 1);
        
      }
    }

    .collect-btn {
      padding: 10px 20px;
      background: Rgba(34, 197, 94, 1);
      color: white;
      border: none;
      border-radius: 8px;
      @include pixelated;
      font-size: 8px;
      cursor: pointer;
      box-shadow: 0 0 15px Rgba(34, 197, 94, 0.3);
      
      &:hover {
        filter: Brightness(1.1);
      }
    }

    .timer-dot {
      width: 8px;
      height: 8px;
      background: Rgba(34, 197, 94, 1);
      border-radius: 50%;
      box-shadow: 0 0 10px Rgba(34, 197, 94, 0.8);
    }
  }
}
</style>
