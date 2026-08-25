import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useGameStore } from '@/stores/game.ts';
import { useUIStore } from '@/stores/ui.ts';
import { generateMission, validateMissionPokemon } from '@/logic/breeding/missionEngine';
import { incrementRecordKey } from '@/logic/utils/mapUtils';
import { logger } from '@/logic/utils/logger';
import type { DaycareMission } from '@/types/breeding/breeding';
import type { Pokemon } from '@/types/pokemon/pokemon';

function isValidDaycareMission(m: unknown): m is DaycareMission {
  if (!m || typeof m !== 'object') return false;
  const mission = m as Record<string, unknown>; // open-record
  return (
    typeof mission.date === 'string' &&
    typeof mission.targetId === 'string' &&
    typeof mission.trainerSprite === 'string' &&
    mission.trainerSprite.length > 0 &&
    typeof mission.trainerName === 'string' &&
    typeof mission.dialogue === 'string' &&
    typeof mission.reqText === 'string' &&
    typeof mission.completed === 'boolean' &&
    typeof mission.reward === 'object' &&
    mission.reward !== null
  );
}

export const useDaycareMissionsStore = defineStore('daycareMissions', () => {
  const gameStore = useGameStore();
  const uiStore = useUIStore();

  const dailyMissions = computed<DaycareMission[]>({
    get: () => {
      const missions = gameStore.state.daycare_missions || [];
      const hasCorrupted = missions.some(m => !isValidDaycareMission(m));
      if (hasCorrupted) {
        logger.error('daycareMissions', 'Corrupted daycare mission detected (missing trainerSprite or required fields). Regenerating fresh missions.');
        const today = Temporal.Now.plainDateISO().toString();
        const level = gameStore.state.trainerLevel || 1;
        const m1 = generateMission(level, today) as DaycareMission;
        let m2 = generateMission(level, today) as DaycareMission;
        while (m2.targetId === m1.targetId) {
          m2 = generateMission(level, today) as DaycareMission;
        }
        gameStore.state.daycare_missions = [m1, m2];
        gameStore.scheduleSave();
        return [m1, m2];
      }
      return missions;
    },
    set: (val) => { gameStore.state.daycare_missions = val }
  });

  const missionRefreshes = computed<number>({
    get: () => gameStore.state.daycare_mission_refreshes || 0,
    set: (val) => { gameStore.state.daycare_mission_refreshes = val }
  });

  const fulfillableMissionsCount = computed(() => {
    const missions = dailyMissions.value.filter(m => !m.completed);
    if (missions.length === 0) return 0;
    
    const team = gameStore.state.team || [];
    const box = gameStore.state.box || [];
    const allPokes = [...team, ...box].filter((p): p is Pokemon => p !== null);
    
    return missions.filter(mission => {
      const targetId = mission.targetId;
      return allPokes.some(p => {
        if (p.onMission || p.inDaycare || p.onDefense) return false;
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
    }).length;
  });

  function checkDailyReset() {
    const today = Temporal.Now.plainDateISO().toString();
    const missions = dailyMissions.value;
    const lastDate = missions.length > 0 && missions[0] ? missions[0].date : '';
    const hasCorrupted = missions.length === 0 || missions.some(m => !isValidDaycareMission(m));

    if (lastDate !== today || hasCorrupted) {
      if (hasCorrupted && missions.length > 0) {
        logger.error('daycareMissions', 'Corrupted daycare mission detected in daily reset. Regenerating fresh missions.');
      }
      regenerateMissions(today);
      missionRefreshes.value = 3;
    }
  }

  function regenerateMissions(dateStr: string) {
    const level = gameStore.state.trainerLevel || 1;
    const m1 = generateMission(level, dateStr) as DaycareMission;
    let m2 = generateMission(level, dateStr) as DaycareMission;

    while (m2.targetId === m1.targetId) {
      m2 = generateMission(level, dateStr) as DaycareMission;
    }

    dailyMissions.value = [m1, m2];
    gameStore.scheduleSave();
  }

  function refreshMissions() {
    if (missionRefreshes.value <= 0) {
      uiStore.notify('No te quedan refrescos por hoy.', '⚠️');
      return;
    }

    missionRefreshes.value--;
    const today = Temporal.Now.instant().toString().split('T')[0] as string;
    regenerateMissions(today);
    uiStore.notify('Misiones actualizadas.', '🔄');
  }

  function completeMission(missionIndex: number, pokemonUid: string) {
    const mission = dailyMissions.value[missionIndex];
    if (!mission || mission.completed) return;

    const team = gameStore.state.team || [];
    const box = gameStore.state.box || [];
    const all = [...team, ...box];
    const pokemon = all.find((p): p is Pokemon => p != null && p.uid === pokemonUid);

    if (!pokemon) return;
    if (!validateMissionPokemon(pokemon, mission)) {
      uiStore.notify('Este Pokémon no cumple los requisitos.', '❌');
      return;
    }

    if (team.length <= 1 && team.some((p) => p.uid === pokemonUid)) {
      uiStore.notify('No puedes entregar tu único Pokémon.', '⚠️');
      return;
    }

    if (!gameStore.removePokemon(pokemonUid)) {
      uiStore.notify('Error al procesar la entrega.', '❌');
      return;
    }

    mission.completed = true;
    incrementRecordKey(gameStore.state.inventory, mission.reward.id, mission.reward.qty)
    
    uiStore.notify(`¡Misión completada! Recibiste ${mission.reward.name} x${mission.reward.qty}`, mission.reward.icon);
    gameStore.scheduleSave();
  }

  return {
    dailyMissions,
    missionRefreshes,
    fulfillableMissionsCount,
    checkDailyReset,
    regenerateMissions,
    refreshMissions,
    completeMission
  };
});
